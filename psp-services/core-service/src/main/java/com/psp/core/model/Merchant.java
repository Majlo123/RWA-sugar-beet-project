package com.psp.core.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

/**
 * PCI DSS 8.2 - Merchant entity with securely stored credentials.
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "merchants", indexes = {
    @Index(name = "idx_merchant_name", columnList = "name")
})
public class Merchant {

    @Id
    @Pattern(regexp = "^[a-zA-Z0-9\\-_]{3,50}$", message = "Invalid merchant ID format")
    private String merchantId;

    /**
     * PCI DSS 8.2.1 - Password stored as a hash (salt:hash format).
     * It is never stored as plaintext.
     */
    @NotBlank(message = "Merchant password is required")
    @Column(nullable = false)
    private String merchantPassword;

    @NotBlank(message = "Merchant name is required")
    @Size(min = 2, max = 100)
    @Column(nullable = false, length = 100)
    private String name;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "merchant_payment_methods", 
                     joinColumns = @JoinColumn(name = "merchant_id"))
    @Column(name = "payment_method")
    private List<String> paymentMethods;

    // Callback URLs
    @Column(length = 500)
    private String successUrl;
    
    @Column(length = 500)
    private String failedUrl;
    
    @Column(length = 500)
    private String errorUrl;

    // PCI DSS Security Fields
    
    /** Registration time */
    @Column(name = "created_at")
    private Instant createdAt;

    /** Last update time */
    @Column(name = "updated_at")
    private Instant updatedAt;

    /** Whether the merchant is active */
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    /** Number of failed authentication attempts */
    @Column(name = "failed_auth_attempts")
    private Integer failedAuthAttempts = 0;

    /** Time of the last failed attempt */
    @Column(name = "last_failed_auth")
    private Instant lastFailedAuth;

    /** Whether the account is locked */
    @Column(name = "is_locked")
    private Boolean isLocked = false;

    /** Time the account is locked until */
    @Column(name = "locked_until")
    private Instant lockedUntil;

    /** Last successful authentication */
    @Column(name = "last_successful_auth")
    private Instant lastSuccessfulAuth;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
        if (isActive == null) isActive = true;
        if (failedAuthAttempts == null) failedAuthAttempts = 0;
        if (isLocked == null) isLocked = false;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    /**
     * Return true if the account is currently locked.
     */
    public boolean isCurrentlyLocked() {
        if (isLocked == null || !isLocked) return false;
        if (lockedUntil == null) return true;
        return Instant.now().isBefore(lockedUntil);
    }

    /**
     * Increment the failed-attempt counter.
     */
    public void incrementFailedAttempts() {
        if (failedAuthAttempts == null) failedAuthAttempts = 0;
        failedAuthAttempts++;
        lastFailedAuth = Instant.now();

        // PCI DSS 8.1.6 - Lock the account after 6 failed attempts.
        if (failedAuthAttempts >= 6) {
            isLocked = true;
            lockedUntil = Instant.now().plusSeconds(30 * 60); // 30 minutes
        }
    }

    /**
     * Reset the failed-attempt counter after successful authentication.
     */
    public void resetFailedAttempts() {
        failedAuthAttempts = 0;
        lastFailedAuth = null;
        isLocked = false;
        lockedUntil = null;
        lastSuccessfulAuth = Instant.now();
    }
}