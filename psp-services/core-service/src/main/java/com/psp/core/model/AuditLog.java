package com.psp.core.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * PCI DSS 10.2 - Audit log za praćenje svih sigurnosno relevantnih događaja
 * 
 * Req 10.2.1 - Pristup podacima vlasnika kartice
 * Req 10.2.2 - Sve akcije pojedinaca sa root/admin pristupom
 * Req 10.2.3 - Pristup svim audit tragovima
 * Req 10.2.4 - Nevalidni logički pristupi
 * Req 10.2.5 - Korišćenje i promene identifikacionih mehanizama
 * Req 10.2.6 - Inicijalizacija, zaustavljanje ili pauziranje audit logova
 * Req 10.2.7 - Kreiranje i brisanje sistemskih objekata
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

    /** Vreme kada je događaj nastao (PCI DSS 10.3.1) */
    @Column(nullable = false)
    private Instant timestamp;

    /** Ko je izvršio akciju - merchant ID, system, anonymous (PCI DSS 10.3.2) */
    @Column(nullable = false, length = 100)
    private String actor;

    /** Tip akcije (PCI DSS 10.3.3) */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private AuditActionType actionType;

    /** ID resursa koji je pogođen - transakcija ID, merchant ID (PCI DSS 10.3.4) */
    @Column(length = 100)
    private String resourceId;

    /** Tip resursa */
    @Column(length = 50)
    private String resourceType;

    /** IP adresa klijenta (PCI DSS 10.3.5) */
    @Column(length = 45)
    private String clientIp;

    /** User-Agent */
    @Column(length = 255)
    private String userAgent;

    /** Ishod akcije (PCI DSS 10.3.6) */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AuditOutcome outcome;

    /** Razlog neuspeha ako postoji */
    @Column(length = 255)
    private String failureReason;

    /** Dodatni sanitizovani detalji (bez osetljivih podataka) */
    @Column(columnDefinition = "TEXT")
    private String details;

    /** HTTP metoda ako je primenjivo */
    @Column(length = 10)
    private String httpMethod;

    /** Endpoint koji je pozvan */
    @Column(length = 255)
    private String endpoint;

    /** Request ID za korelaciju */
    @Column(length = 50)
    private String requestId;

    /** Vreme trajanja operacije u milisekundama */
    private Long durationMs;

    public enum AuditActionType {
        // Autentifikacija
        LOGIN_ATTEMPT,
        LOGIN_SUCCESS,
        LOGIN_FAILURE,
        LOGOUT,
        
        // Pristup podacima kartice
        CARD_DATA_ACCESS,
        CARD_DATA_VIEWED,
        CARD_PAYMENT_INITIATED,
        CARD_PAYMENT_PROCESSED,
        
        // Transakcije
        TRANSACTION_CREATED,
        TRANSACTION_VIEWED,
        TRANSACTION_UPDATED,
        TRANSACTION_STATUS_CHANGED,
        TRANSACTION_SEARCH,
        
        // Merchant operacije
        MERCHANT_REGISTERED,
        MERCHANT_UPDATED,
        MERCHANT_VIEWED,
        MERCHANT_DELETED,
        MERCHANT_SUBSCRIPTION_CHANGED,
        
        // Payment method operacije
        PAYMENT_METHOD_SELECTED,
        BANK_PAYMENT_INITIATED,
        PAYPAL_PAYMENT_INITIATED,
        CRYPTO_PAYMENT_INITIATED,
        QR_PAYMENT_INITIATED,
        
        // Sigurnosni događaji
        INVALID_ACCESS_ATTEMPT,
        RATE_LIMIT_EXCEEDED,
        VALIDATION_FAILED,
        ENCRYPTION_ERROR,
        DECRYPTION_ERROR,
        
        // Sistem
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
     * Builder pattern za lakše kreiranje audit logova
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
