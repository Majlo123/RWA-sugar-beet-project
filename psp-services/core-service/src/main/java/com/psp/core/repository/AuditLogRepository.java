package com.psp.core.repository;

import com.psp.core.model.AuditLog;
import com.psp.core.model.AuditLog.AuditActionType;
import com.psp.core.model.AuditLog.AuditOutcome;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

/**
 * PCI DSS 10.5 - Repository for secure audit log storage.
 */
@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    /**
     * Find all logs for a given actor.
     */
    List<AuditLog> findByActorOrderByTimestampDesc(String actor);

    /**
     * Find all logs for a given resource.
     */
    List<AuditLog> findByResourceIdOrderByTimestampDesc(String resourceId);

    /**
     * Find logs by action type.
     */
    List<AuditLog> findByActionTypeOrderByTimestampDesc(AuditActionType actionType);

    /**
     * Find logs within a time range.
     */
    @Query("SELECT a FROM AuditLog a WHERE a.timestamp BETWEEN :start AND :end ORDER BY a.timestamp DESC")
    List<AuditLog> findByTimestampRange(
        @Param("start") Instant start,
        @Param("end") Instant end
    );

    /**
     * Find failed access attempts for a given actor.
     */
    @Query("SELECT a FROM AuditLog a WHERE a.actor = :actor AND a.outcome IN ('FAILURE', 'ACCESS_DENIED') " +
           "AND a.timestamp > :since ORDER BY a.timestamp DESC")
    List<AuditLog> findFailedAttemptsByActor(
        @Param("actor") String actor,
        @Param("since") Instant since
    );

    /**
     * Find all accesses to card data.
     */
    @Query("SELECT a FROM AuditLog a WHERE a.actionType IN ('CARD_DATA_ACCESS', 'CARD_DATA_VIEWED', 'CARD_PAYMENT_PROCESSED') " +
           "AND a.timestamp > :since ORDER BY a.timestamp DESC")
    List<AuditLog> findCardDataAccess(@Param("since") Instant since);

    /**
     * Pagination for UI audit-log display.
     */
    Page<AuditLog> findAllByOrderByTimestampDesc(Pageable pageable);

    /**
     * Search by multiple criteria.
     */
    @Query("SELECT a FROM AuditLog a WHERE " +
           "(:actor IS NULL OR a.actor = :actor) AND " +
           "(:actionType IS NULL OR a.actionType = :actionType) AND " +
           "(:outcome IS NULL OR a.outcome = :outcome) AND " +
           "(:resourceId IS NULL OR a.resourceId = :resourceId) AND " +
           "a.timestamp BETWEEN :start AND :end " +
           "ORDER BY a.timestamp DESC")
    Page<AuditLog> searchAuditLogs(
        @Param("actor") String actor,
        @Param("actionType") AuditActionType actionType,
        @Param("outcome") AuditOutcome outcome,
        @Param("resourceId") String resourceId,
        @Param("start") Instant start,
        @Param("end") Instant end,
        Pageable pageable
    );

    /**
     * Count failed login attempts from a given IP address in the last N minutes.
     * Used to detect brute-force attacks.
     */
    @Query("SELECT COUNT(a) FROM AuditLog a WHERE a.clientIp = :ip AND " +
           "a.actionType = 'LOGIN_FAILURE' AND a.timestamp > :since")
    long countFailedLoginsByIp(@Param("ip") String ip, @Param("since") Instant since);

    /**
     * Statistics for the dashboard.
     */
    @Query("SELECT a.actionType, COUNT(a) FROM AuditLog a WHERE a.timestamp > :since " +
           "GROUP BY a.actionType ORDER BY COUNT(a) DESC")
    List<Object[]> getActionTypeStats(@Param("since") Instant since);
}
