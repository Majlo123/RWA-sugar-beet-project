package com.psp.core.controller;

import com.psp.core.model.AuditLog;
import com.psp.core.model.Merchant;
import com.psp.core.model.User;
import com.psp.core.repository.MerchantRepository;
import com.psp.core.repository.UserRepository;
import com.psp.core.service.AuditService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Admin Controller for Super Admin operations
 * PCI DSS 7.1 - Role-based access control
 * 
 * Note: When psp.disable-auth=true, authorization is bypassed for development
 */
@RestController
@RequestMapping("/admin")
@PreAuthorize("@authChecker.isAllowed()")
public class AdminController {

    @Autowired
    private MerchantRepository merchantRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuditService auditService;

    // ==================== Payment Methods Management ====================

    /**
     * Get all available payment methods
     */
    @GetMapping("/payment-methods")
    public ResponseEntity<?> getAllPaymentMethods() {
        // Get unique payment methods from all merchants
        List<Merchant> merchants = merchantRepository.findAll();
        List<String> allMethods = merchants.stream()
                .flatMap(m -> m.getPaymentMethods().stream())
                .distinct()
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(Map.of(
            "paymentMethods", allMethods,
            "message", "Available payment methods retrieved"
        ));
    }

    /**
     * Enable/Disable a payment method for a merchant
     */
    @PutMapping("/merchants/{merchantId}/payment-methods")
    public ResponseEntity<?> updateMerchantPaymentMethods(
            @PathVariable String merchantId,
            @RequestBody Map<String, List<String>> request) {
        
        List<String> methods = request.get("paymentMethods");
        if (methods == null || methods.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "At least one payment method must be active"
            ));
        }

        return merchantRepository.findById(merchantId)
                .map(merchant -> {
                    merchant.setPaymentMethods(methods);
                    merchantRepository.save(merchant);
                    return ResponseEntity.ok(Map.of(
                        "message", "Payment methods updated",
                        "merchantId", merchantId,
                        "paymentMethods", methods
                    ));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // ==================== Merchant Management ====================

    /**
     * Get all registered merchants
     */
    @GetMapping("/merchants")
    public ResponseEntity<?> getAllMerchants() {
        List<Merchant> merchants = merchantRepository.findAll();
        // Hide sensitive data
        List<Map<String, Object>> safeList = merchants.stream()
                .map(m -> {
                    Map<String, Object> safe = new HashMap<>();
                    safe.put("merchantId", m.getMerchantId());
                    safe.put("name", m.getName());
                    safe.put("paymentMethods", m.getPaymentMethods());
                    safe.put("isActive", m.getIsActive());
                    safe.put("createdAt", m.getCreatedAt());
                    safe.put("successUrl", m.getSuccessUrl());
                    safe.put("failedUrl", m.getFailedUrl());
                    return safe;
                })
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(safeList);
    }

    /**
     * Enable/Disable a merchant
     */
    @PutMapping("/merchants/{merchantId}/status")
    public ResponseEntity<?> updateMerchantStatus(
            @PathVariable String merchantId,
            @RequestBody Map<String, Boolean> request) {
        
        Boolean isActive = request.get("isActive");
        if (isActive == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "isActive field required"));
        }

        return merchantRepository.findById(merchantId)
                .map(merchant -> {
                    merchant.setIsActive(isActive);
                    merchantRepository.save(merchant);
                    return ResponseEntity.ok(Map.of(
                        "message", isActive ? "Merchant enabled" : "Merchant disabled",
                        "merchantId", merchantId,
                        "isActive", isActive
                    ));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // ==================== System Configuration ====================

    /**
     * Get system configuration overview
     */
    @GetMapping("/config")
    public ResponseEntity<?> getSystemConfig() {
        long merchantCount = merchantRepository.count();
        long userCount = userRepository.count();
        
        return ResponseEntity.ok(Map.of(
            "totalMerchants", merchantCount,
            "totalUsers", userCount,
            "systemStatus", "OPERATIONAL",
            "version", "1.0.0"
        ));
    }

    // ==================== User Management (View Only) ====================

    /**
     * Get all users (excluding passwords)
     */
    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers() {
        List<User> users = userRepository.findAll();
        List<Map<String, Object>> safeList = users.stream()
                .map(u -> {
                    Map<String, Object> safe = new HashMap<>();
                    safe.put("id", u.getId());
                    safe.put("username", u.getUsername());
                    safe.put("email", u.getEmail());
                    safe.put("role", u.getRole().name());
                    safe.put("isActive", u.getIsActive());
                    safe.put("createdAt", u.getCreatedAt());
                    safe.put("lastLogin", u.getLastLogin());
                    return safe;
                })
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(safeList);
    }

    // ==================== Audit Logs (PCI DSS 10) ====================

    /**
     * Get paginated audit logs with optional filtering
     * PCI DSS 10.2.3 - Access to all audit trails
     */
    @GetMapping("/audit-logs")
    public ResponseEntity<?> getAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size,
            @RequestParam(required = false) String actionType,
            @RequestParam(required = false) String outcome) {
        
        Page<AuditLog> logs;
        
        // Use filtered search if filters provided
        if (actionType != null || outcome != null) {
            AuditLog.AuditActionType actionTypeEnum = null;
            AuditLog.AuditOutcome outcomeEnum = null;
            
            if (actionType != null && !actionType.isEmpty()) {
                try {
                    actionTypeEnum = AuditLog.AuditActionType.valueOf(actionType);
                } catch (IllegalArgumentException e) {
                    // Invalid action type, ignore filter
                }
            }
            
            if (outcome != null && !outcome.isEmpty()) {
                try {
                    outcomeEnum = AuditLog.AuditOutcome.valueOf(outcome);
                } catch (IllegalArgumentException e) {
                    // Invalid outcome, ignore filter
                }
            }
            
            logs = auditService.searchLogs(null, actionTypeEnum, outcomeEnum, null, null, null, 
                    org.springframework.data.domain.PageRequest.of(page, size, 
                            org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "timestamp")));
        } else {
            logs = auditService.getAllLogs(page, size);
        }
        
        // Convert to safe response without sensitive data
        List<Map<String, Object>> logList = logs.getContent().stream()
                .map(log -> {
                    Map<String, Object> safe = new HashMap<>();
                    safe.put("id", log.getId());
                    safe.put("timestamp", log.getTimestamp());
                    safe.put("actor", log.getActor());
                    safe.put("actionType", log.getActionType().name());
                    safe.put("resourceId", log.getResourceId());
                    safe.put("resourceType", log.getResourceType());
                    safe.put("outcome", log.getOutcome().name());
                    safe.put("clientIp", log.getClientIp());
                    safe.put("details", log.getDetails());
                    safe.put("failureReason", log.getFailureReason());
                    return safe;
                })
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(Map.of(
            "content", logList,
            "totalElements", logs.getTotalElements(),
            "totalPages", logs.getTotalPages(),
            "currentPage", logs.getNumber(),
            "pageSize", logs.getSize()
        ));
    }
}
