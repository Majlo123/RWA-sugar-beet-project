package com.psp.core.repository;

import com.psp.core.model.PaymentSession;
import com.psp.core.model.PaymentSession.SessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * PCI DSS - Repository za payment sesije
 */
@Repository
public interface PaymentSessionRepository extends JpaRepository<PaymentSession, Long> {

    /**
     * Pronađi sesiju po tokenu
     */
    Optional<PaymentSession> findBySessionToken(String sessionToken);

    /**
     * Pronađi aktivne sesije za transakciju
     */
    List<PaymentSession> findByTransactionIdAndStatus(Long transactionId, SessionStatus status);

    /**
     * Pronađi istekle sesije za čišćenje
     */
    @Query("SELECT p FROM PaymentSession p WHERE p.expiresAt < :now AND p.status = 'ACTIVE'")
    List<PaymentSession> findExpiredSessions(@Param("now") Instant now);

    /**
     * Označi istekle sesije
     */
    @Modifying
    @Query("UPDATE PaymentSession p SET p.status = 'EXPIRED' WHERE p.expiresAt < :now AND p.status = 'ACTIVE'")
    int markExpiredSessions(@Param("now") Instant now);

    /**
     * Broj aktivnih sesija za merchant-a (rate limiting)
     */
    @Query("SELECT COUNT(p) FROM PaymentSession p WHERE p.merchantId = :merchantId AND p.status = 'ACTIVE' AND p.createdAt > :since")
    long countActiveSessions(@Param("merchantId") String merchantId, @Param("since") Instant since);

    /**
     * Pronađi sesiju po transaction ID-u
     */
    Optional<PaymentSession> findByTransactionId(Long transactionId);
}
