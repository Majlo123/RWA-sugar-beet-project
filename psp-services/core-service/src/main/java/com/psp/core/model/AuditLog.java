package com.psp.core.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * PCI DSS 10.2 - Audit log for tracking all security-relevant events.
 *
 * Req 10.2.1 - Access to cardholder data
 * Req 10.2.2 - All actions by individuals with root/admin access
 * Req 10.2.3 - Access to all audit trails
 * Req 10.2.4 - Invalid logical access attempts
 * Req 10.2.5 - Use of and changes to identification mechanisms
 * Req 10.2.6 - Initialization, stopping, or pausing audit logs
 * Req 10.2.7 - Creation and deletion of system-level objects
 */
@Entity
@Table(name = "pci_audit_logs", indexes = {
    @Index(name = "idx_audit_timestamp", columnList = "timestamp"),
    @Index(name = "idx_audit_actor", columnList = "actor"),
    @Index(name = "idx_audit_action", columnList = "actionType"),
    @Index(name = "idx_audit_resource", columnList = "resourceId")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Time the event occurred (PCI DSS 10.3.1) */
    @Column(nullable = false)
    private Instant timestamp;

    /** Who performed the action - merchant ID, system, anonymous (PCI DSS 10.3.2) */
    @Column(nullable = false, length = 100)
    private String actor;

    /** Action type (PCI DSS 10.3.3) */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private AuditActionType actionType;

    /** ID of the affected resource - transaction ID, merchant ID (PCI DSS 10.3.4) */
    @Column(length = 100)
    private String resourceId;

    /** Resource type */
    @Column(length = 50)
    private String resourceType;

    /** Client IP address (PCI DSS 10.3.5) */
    @Column(length = 45)
    private String clientIp;

    /** User-Agent */
    @Column(length = 255)
    private String userAgent;

    /** Action outcome (PCI DSS 10.3.6) */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AuditOutcome outcome;

    /** Failure reason, if any */
    @Column(length = 255)
    private String failureReason;

    /** Additional sanitized details (no sensitive data) */
    @Column(columnDefinition = "TEXT")
    private String details;

    /** HTTP method, if applicable */
    @Column(length = 10)
    private String httpMethod;

    /** Endpoint that was called */
    @Column(length = 255)
    private String endpoint;

    /** Request ID for correlation */
    @Column(length = 50)
    private String requestId;

    /** Operation duration in milliseconds */
    private Long durationMs;

    public enum AuditActionType {
        // Authentication
        LOGIN_ATTEMPT,
        LOGIN_SUCCESS,
        LOGIN_FAILURE,
        LOGOUT,

        // Card data access
        CARD_DATA_ACCESS,
        CARD_DATA_VIEWED,
        CARD_PAYMENT_INITIATED,
        CARD_PAYMENT_PROCESSED,

        // Transactions
        TRANSACTION_CREATED,
        TRANSACTION_VIEWED,
        TRANSACTION_UPDATED,
        TRANSACTION_STATUS_CHANGED,
        TRANSACTION_SEARCH,

        // Merchant operations
        MERCHANT_REGISTERED,
        MERCHANT_UPDATED,
        MERCHANT_VIEWED,
        MERCHANT_DELETED,
        MERCHANT_SUBSCRIPTION_CHANGED,

        // Payment method operations
        PAYMENT_METHOD_SELECTED,
        BANK_PAYMENT_INITIATED,
        PAYPAL_PAYMENT_INITIATED,
        CRYPTO_PAYMENT_INITIATED,
        QR_PAYMENT_INITIATED,

        // Security events
        INVALID_ACCESS_ATTEMPT,
        RATE_LIMIT_EXCEEDED,
        VALIDATION_FAILED,
        ENCRYPTION_ERROR,
        DECRYPTION_ERROR,

        // System
        SYSTEM_STARTUP,
        SYSTEM_SHUTDOWN,
        CONFIGURATION_CHANGED,
        AUDIT_LOG_ACCESSED
    }

    public enum AuditOutcome {
        SUCCESS,
        FAILURE,
        ACCESS_DENIED,
        VALIDATION_ERROR,
        SYSTEM_ERROR
    }

    /**
     * Builder pattern for easier audit-log creation.
     */
    public static AuditLogBuilder builder() {
        return new AuditLogBuilder();
    }

    public static class AuditLogBuilder {
        private final AuditLog log = new AuditLog();

        public AuditLogBuilder() {
            log.setTimestamp(Instant.now());
        }

        public AuditLogBuilder actor(String actor) {
            log.setActor(actor);
            return this;
        }

        public AuditLogBuilder actionType(AuditActionType actionType) {
            log.setActionType(actionType);
            return this;
        }

        public AuditLogBuilder resourceId(String resourceId) {
            log.setResourceId(resourceId);
            return this;
        }

        public AuditLogBuilder resourceType(String resourceType) {
            log.setResourceType(resourceType);
            return this;
        }

        public AuditLogBuilder clientIp(String clientIp) {
            log.setClientIp(clientIp);
            return this;
        }

        public AuditLogBuilder userAgent(String userAgent) {
            log.setUserAgent(userAgent != null && userAgent.length() > 255 
                ? userAgent.substring(0, 255) : userAgent);
            return this;
        }

        public AuditLogBuilder outcome(AuditOutcome outcome) {
            log.setOutcome(outcome);
            return this;
        }

        public AuditLogBuilder failureReason(String reason) {
            log.setFailureReason(reason);
            return this;
        }

        public AuditLogBuilder details(String details) {
            log.setDetails(details);
            return this;
        }

        public AuditLogBuilder httpMethod(String method) {
            log.setHttpMethod(method);
            return this;
        }

        public AuditLogBuilder endpoint(String endpoint) {
            log.setEndpoint(endpoint);
            return this;
        }

        public AuditLogBuilder requestId(String requestId) {
            log.setRequestId(requestId);
            return this;
        }

        public AuditLogBuilder durationMs(Long durationMs) {
            log.setDurationMs(durationMs);
            return this;
        }

        public AuditLog build() {
            if (log.getActor() == null) log.setActor("SYSTEM");
            if (log.getOutcome() == null) log.setOutcome(AuditOutcome.SUCCESS);
            return log;
        }
    }
}
