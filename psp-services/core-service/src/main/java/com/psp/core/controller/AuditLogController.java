package com.psp.core.controller;

import com.psp.core.model.AuditLog;
import com.psp.core.model.AuditLog.AuditActionType;
import com.psp.core.model.AuditLog.AuditOutcome;
import com.psp.core.service.AuditService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * PCI DSS 10 - Controller for audit log access.
 */
@RestController
@RequestMapping("/api/audit")
public class AuditLogController {

    @Autowired
    private AuditService auditService;

    /**
     * Return paginated audit logs.
     */
    @GetMapping("/logs")
    public ResponseEntity<Page<AuditLog>> getLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(auditService.getAllLogs(page, size));
    }

    /**
     * Return logs for a specific resource.
     */
    @GetMapping("/logs/resource/{resourceId}")
    public ResponseEntity<List<AuditLog>> getLogsForResource(@PathVariable String resourceId) {
        return ResponseEntity.ok(auditService.getLogsForResource(resourceId));
    }

    /**
     * Search audit logs.
     */
    @GetMapping("/logs/search")
    public ResponseEntity<Page<AuditLog>> searchLogs(
            @RequestParam(required = false) String actor,
            @RequestParam(required = false) AuditActionType actionType,
            @RequestParam(required = false) AuditOutcome outcome,
            @RequestParam(required = false) String resourceId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        
        Instant start = startDate != null ? startDate.toInstant(ZoneOffset.UTC) : null;
        Instant end = endDate != null ? endDate.toInstant(ZoneOffset.UTC) : null;
        
        return ResponseEntity.ok(auditService.searchLogs(
            actor, actionType, outcome, resourceId, start, end, 
            org.springframework.data.domain.PageRequest.of(page, size)
        ));
    }

    /**
     * Return card-data accesses for the PCI DSS report.
     */
    @GetMapping("/logs/card-access")
    public ResponseEntity<List<AuditLog>> getCardDataAccessLogs(
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(auditService.getCardDataAccessLogs(days));
    }

    /**
     * PCI DSS statistika za dashboard
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        Map<String, Object> stats = new HashMap<>();
        
        Page<AuditLog> recentLogs = auditService.getAllLogs(0, 1);
        stats.put("totalLogs", recentLogs.getTotalElements());
        
        List<AuditLog> cardAccess = auditService.getCardDataAccessLogs(7);
        stats.put("cardAccessLast7Days", cardAccess.size());
        
        // Number of failed login attempts in the last 24h.
        Instant since24h = Instant.now().minusSeconds(24 * 60 * 60);
        Page<AuditLog> failedLogins = auditService.searchLogs(
            null, AuditActionType.LOGIN_FAILURE, null, null, since24h, Instant.now(),
            org.springframework.data.domain.PageRequest.of(0, 1000)
        );
        stats.put("failedLoginsLast24h", failedLogins.getTotalElements());
        
        return ResponseEntity.ok(stats);
    }
}
