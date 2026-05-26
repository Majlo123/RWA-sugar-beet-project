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
 * PCI DSS - Repository for payment sessions.
 */
@Repository
public interface PaymentSessionRepository extends JpaRepository<PaymentSession, Long> {

    /**
     * Find a session by its token.
     */
    Optional<PaymentSession> findBySessionToken(String sessionToken);

    /**
     * Find active sessions for a transaction.
     */
    List<PaymentSession> findByTransactionIdAndStatus(Long transactionId, SessionStatus status);

    /**
     * Find expired sessions for cleanup.
     */
    @Query("SELECT p FROM PaymentSession p WHERE p.expiresAt < :now AND p.status = 'ACTIVE'")
    List<PaymentSession> findExpiredSessions(@Param("now") Instant now);

    /**
     * Mark expired sessions.
     */
    @Modifying
    @Query("UPDATE PaymentSession p SET p.status = 'EXPIRED' WHERE p.expiresAt < :now AND p.status = 'ACTIVE'")
    int markExpiredSessions(@Param("now") Instant now);

    /**
     * Number of active sessions for a merchant (rate limiting).
     */
    @Query("SELECT COUNT(p) FROM PaymentSession p WHERE p.merchantId = :merchantId AND p.status = 'ACTIVE' AND p.createdAt > :since")
    long countActiveSessions(@Param("merchantId") String merchantId, @Param("since") Instant since);

    /**
     * Find a session by its transaction ID.
     */
    Optional<PaymentSession> findByTransactionId(Long transactionId);
}
