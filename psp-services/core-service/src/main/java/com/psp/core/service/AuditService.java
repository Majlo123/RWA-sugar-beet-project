package com.psp.core.service;

import com.psp.core.model.AuditLog;
import com.psp.core.model.AuditLog.AuditActionType;
import com.psp.core.model.AuditLog.AuditOutcome;
import com.psp.core.repository.AuditLogRepository;
import com.psp.core.security.PanMasker;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

/**
 * PCI DSS 10 - Audit logging service.
 */
@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    // Number of failed attempts before lockout.
    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int LOCKOUT_MINUTES = 15;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    /**
     * Log an action with all relevant data.
     * Uses REQUIRES_NEW so it can be called from readOnly transactions.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AuditLog log(AuditActionType actionType, String actor, String resourceId,
                        String resourceType, AuditOutcome outcome, String details) {

        AuditLog.AuditLogBuilder builder = AuditLog.builder()
            .actionType(actionType)
            .actor(actor != null ? actor : "ANONYMOUS")
            .resourceId(resourceId)
            .resourceType(resourceType)
            .outcome(outcome)
            .details(sanitizeDetails(details))
            .requestId(UUID.randomUUID().toString());

        // Best-effort attempt to pull HTTP request info.
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest request = attrs.getRequest();
                builder.clientIp(getClientIp(request));
                builder.userAgent(request.getHeader("User-Agent"));
                builder.httpMethod(request.getMethod());
                builder.endpoint(request.getRequestURI());
            }
        } catch (Exception e) {
            // Ignore when no HTTP context is available.
        }

        AuditLog auditLog = builder.build();
        return auditLogRepository.save(auditLog);
    }

    /**
     * Shorthand for successful actions.
     */
    public AuditLog logSuccess(AuditActionType actionType, String actor, String resourceId, String details) {
        return log(actionType, actor, resourceId, null, AuditOutcome.SUCCESS, details);
    }

    /**
     * Shorthand for failed actions.
     */
    public AuditLog logFailure(AuditActionType actionType, String actor, String resourceId, String reason) {
        AuditLog auditLog = log(actionType, actor, resourceId, null, AuditOutcome.FAILURE, null);
        auditLog.setFailureReason(reason);
        return auditLogRepository.save(auditLog);
    }

    /**
     * Log access to card data.
     */
    public void logCardDataAccess(String actor, String transactionId, String maskedPan) {
        log(AuditActionType.CARD_DATA_ACCESS, actor, transactionId,
            "TRANSACTION", AuditOutcome.SUCCESS,
            "Card accessed: " + maskedPan);
    }

    /**
     * Log transaction creation.
     */
    public void logTransactionCreated(String merchantId, Long transactionId, Double amount, String currency) {
        log(AuditActionType.TRANSACTION_CREATED, merchantId,
            String.valueOf(transactionId), "TRANSACTION", AuditOutcome.SUCCESS,
            String.format("Amount: %.2f %s", amount, currency));
    }

    /**
     * Log a transaction status change.
     */
    public void logTransactionStatusChanged(String actor, String transactionId,
                                            String oldStatus, String newStatus) {
        log(AuditActionType.TRANSACTION_STATUS_CHANGED, actor,
            transactionId, "TRANSACTION", AuditOutcome.SUCCESS,
            String.format("Status: %s -> %s", oldStatus, newStatus));
    }

    /**
     * Log an invalid access attempt.
     */
    public void logInvalidAccess(String actor, String resourceId, String reason) {
        log(AuditActionType.INVALID_ACCESS_ATTEMPT, actor,
            resourceId, null, AuditOutcome.ACCESS_DENIED, reason);
    }

    /**
     * Return true if the IP is blocked due to too many failed attempts.
     */
    public boolean isIpBlocked(String ip) {
        Instant since = Instant.now().minus(LOCKOUT_MINUTES, ChronoUnit.MINUTES);
        long failedCount = auditLogRepository.countFailedLoginsByIp(ip, since);
        return failedCount >= MAX_FAILED_ATTEMPTS;
    }

    /**
     * Get audit logs for a resource.
     */
    @Transactional(readOnly = true)
    public List<AuditLog> getLogsForResource(String resourceId) {
        // Log access to the audit logs themselves (PCI DSS 10.2.3).
        log(AuditActionType.AUDIT_LOG_ACCESSED, "SYSTEM", resourceId,
            "AUDIT_LOG", AuditOutcome.SUCCESS, null);
        return auditLogRepository.findByResourceIdOrderByTimestampDesc(resourceId);
    }

    /**
     * Paginated access to all logs.
     * Note: We don't log access to audit logs within this read-only transaction
     * to avoid write conflicts. Audit log access can be tracked separately.
     */
    @Transactional(readOnly = true)
    public Page<AuditLog> getAllLogs(int page, int size) {
        return auditLogRepository.findAllByOrderByTimestampDesc(PageRequest.of(page, size));
    }

    /**
     * Search audit logs.
     */
    @Transactional(readOnly = true)
    public Page<AuditLog> searchLogs(String actor, AuditActionType actionType,
                                     AuditOutcome outcome, String resourceId,
                                     Instant startDate, Instant endDate, Pageable pageable) {
        return auditLogRepository.searchAuditLogs(
            actor, actionType, outcome, resourceId,
            startDate != null ? startDate : Instant.now().minus(30, ChronoUnit.DAYS),
            endDate != null ? endDate : Instant.now(),
            pageable
        );
    }

    /**
     * Get card-data accesses for the PCI DSS report.
     */
    @Transactional(readOnly = true)
    public List<AuditLog> getCardDataAccessLogs(int days) {
        Instant since = Instant.now().minus(days, ChronoUnit.DAYS);
        return auditLogRepository.findCardDataAccess(since);
    }

    /**
     * Sanitize details so they do not contain sensitive data.
     */
    private String sanitizeDetails(String details) {
        if (details == null) return null;
        return PanMasker.maskAllInText(details);
    }

    /**
     * Extract the real client IP address.
     */
    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }
        return request.getRemoteAddr();
    }
}
