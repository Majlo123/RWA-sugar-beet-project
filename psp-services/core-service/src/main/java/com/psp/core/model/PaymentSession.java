package com.psp.core.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * PCI DSS 3.2 - Payment Session za kontrolu pristupa plaćanju
 * 
 * Sesija ističe nakon definisanog vremena (default 15 minuta)
 * Sadrži token za jednokratnu upotrebu
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

    /** Jedinstveni token sesije */
    @Column(nullable = false, unique = true, length = 64)
    private String sessionToken;

    /** Povezana transakcija */
    @Column(nullable = false)
    private Long transactionId;

    /** Merchant koji je inicirao plaćanje */
    @Column(nullable = false, length = 50)
    private String merchantId;

    /** Iznos transakcije */
    @Column(nullable = false)
    private Double amount;

    /** Valuta */
    @Column(nullable = false, length = 3)
    private String currency;

    /** Kreirana u */
    @Column(nullable = false)
    private Instant createdAt;

    /** Ističe u */
    @Column(nullable = false)
    private Instant expiresAt;

    /** Da li je sesija korišćena */
    @Column(nullable = false)
    private Boolean isUsed = false;

    /** Vreme kada je sesija korišćena */
    private Instant usedAt;

    /** IP adresa koja je koristila sesiju */
    @Column(length = 45)
    private String usedByIp;

    /** Metoda plaćanja koja je odabrana */
    @Column(length = 20)
    private String paymentMethod;

    /** Status sesije */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SessionStatus status = SessionStatus.ACTIVE;

    /** Broj pokušaja korišćenja */
    @Column(nullable = false)
    private Integer attemptCount = 0;

    /** URL za uspeh */
    @Column(length = 500)
    private String successUrl;

    /** URL za neuspeh */
    @Column(length = 500)
    private String failedUrl;

    /** URL za grešku */
    @Column(length = 500)
    private String errorUrl;

    public enum SessionStatus {
        ACTIVE,      // Sesija je aktivna
        USED,        // Sesija je uspešno korišćena
        EXPIRED,     // Sesija je istekla
        CANCELLED,   // Sesija je otkazana
        BLOCKED      // Sesija je blokirana (previše pokušaja)
    }

    /**
     * Proverava da li je sesija validna (nije istekla i nije korišćena)
     */
    public boolean isValid() {
        if (isUsed || status != SessionStatus.ACTIVE) {
            return false;
        }
        return Instant.now().isBefore(expiresAt);
    }

    /**
     * Označi sesiju kao korišćenu
     */
    public void markAsUsed(String ipAddress) {
        this.isUsed = true;
        this.usedAt = Instant.now();
        this.usedByIp = ipAddress;
        this.status = SessionStatus.USED;
    }

    /**
     * Povećaj broj pokušaja
     */
    public void incrementAttempts() {
        this.attemptCount++;
        // Blokiraj nakon 5 neuspešnih pokušaja
        if (this.attemptCount >= 5) {
            this.status = SessionStatus.BLOCKED;
        }
    }

    /**
     * Označi kao isteklu
     */
    public void markAsExpired() {
        this.status = SessionStatus.EXPIRED;
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        if (expiresAt == null) expiresAt = createdAt.plusSeconds(15 * 60); // 15 minuta
        if (status == null) status = SessionStatus.ACTIVE;
        if (isUsed == null) isUsed = false;
        if (attemptCount == null) attemptCount = 0;
    }
}
