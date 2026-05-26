package com.psp.core.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * PCI DSS 3.2 - Payment Session for payment access control.
 *
 * The session expires after a configured time (default: 15 minutes)
 * and carries a single-use token.
 */
@Entity
@Table(name = "payment_sessions", indexes = {
    @Index(name = "idx_session_token", columnList = "sessionToken", unique = true),
    @Index(name = "idx_session_transaction", columnList = "transactionId"),
    @Index(name = "idx_session_expires", columnList = "expiresAt")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Unique session token */
    @Column(nullable = false, unique = true, length = 64)
    private String sessionToken;

    /** Linked transaction */
    @Column(nullable = false)
    private Long transactionId;

    /** Merchant that initiated the payment */
    @Column(nullable = false, length = 50)
    private String merchantId;

    /** Transaction amount */
    @Column(nullable = false)
    private Double amount;

    /** Currency */
    @Column(nullable = false, length = 3)
    private String currency;

    /** Created at */
    @Column(nullable = false)
    private Instant createdAt;

    /** Expires at */
    @Column(nullable = false)
    private Instant expiresAt;

    /** Whether the session has been used */
    @Column(nullable = false)
    private Boolean isUsed = false;

    /** Time when the session was used */
    private Instant usedAt;

    /** IP address that used the session */
    @Column(length = 45)
    private String usedByIp;

    /** Selected payment method */
    @Column(length = 20)
    private String paymentMethod;

    /** Session status */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SessionStatus status = SessionStatus.ACTIVE;

    /** Number of use attempts */
    @Column(nullable = false)
    private Integer attemptCount = 0;

    /** Success URL */
    @Column(length = 500)
    private String successUrl;

    /** Failure URL */
    @Column(length = 500)
    private String failedUrl;

    /** Error URL */
    @Column(length = 500)
    private String errorUrl;

    public enum SessionStatus {
        ACTIVE,      // Session is active
        USED,        // Session was used successfully
        EXPIRED,     // Session has expired
        CANCELLED,   // Session was cancelled
        BLOCKED      // Session is blocked (too many attempts)
    }

    /**
     * Returns true if the session is valid (not expired and not used).
     */
    public boolean isValid() {
        if (isUsed || status != SessionStatus.ACTIVE) {
            return false;
        }
        return Instant.now().isBefore(expiresAt);
    }

    /**
     * Mark the session as used.
     */
    public void markAsUsed(String ipAddress) {
        this.isUsed = true;
        this.usedAt = Instant.now();
        this.usedByIp = ipAddress;
        this.status = SessionStatus.USED;
    }

    /**
     * Increment the attempt counter.
     */
    public void incrementAttempts() {
        this.attemptCount++;
        // Block after 5 failed attempts.
        if (this.attemptCount >= 5) {
            this.status = SessionStatus.BLOCKED;
        }
    }

    /**
     * Mark the session as expired.
     */
    public void markAsExpired() {
        this.status = SessionStatus.EXPIRED;
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        if (expiresAt == null) expiresAt = createdAt.plusSeconds(15 * 60); // 15 minutes
        if (status == null) status = SessionStatus.ACTIVE;
        if (isUsed == null) isUsed = false;
        if (attemptCount == null) attemptCount = 0;
    }
}
