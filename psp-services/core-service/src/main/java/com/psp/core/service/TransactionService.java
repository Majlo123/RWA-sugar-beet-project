package com.psp.core.service;

import com.psp.core.dto.PaymentRequest;
import com.psp.core.model.AuditLog.AuditActionType;
import com.psp.core.model.AuditLog.AuditOutcome;
import com.psp.core.model.Merchant;
import com.psp.core.model.PaymentSession;
import com.psp.core.model.Transaction;
import com.psp.core.repository.MerchantRepository;
import com.psp.core.repository.PaymentSessionRepository;
import com.psp.core.repository.TransactionRepository;
import com.psp.core.security.PanMasker;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.*;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * PCI DSS - Transaction management service with audit logging.
 */
@Service
public class TransactionService {

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private PaymentSessionRepository paymentSessionRepository;

    @Autowired
    private MerchantRepository merchantRepository;

    @Autowired
    private MerchantService merchantService;

    @Autowired
    private AuditService auditService;

    /**
     * PCI DSS 8.2 - Merchant authentication using secure hashing.
     */
    public Optional<Merchant> authenticateMerchant(String id, String password) {
        return merchantService.authenticateMerchant(id, password);
    }

    /**
     * Create the initial transaction with audit logging.
     */
    @Transactional
    public Transaction createInitialTransaction(PaymentRequest request) {
        Transaction transaction = new Transaction();
        transaction.setMerchantId(request.getMerchantId());
        transaction.setAmount(request.getAmount());
        transaction.setCurrency(request.getCurrency());
        transaction.setMerchantOrderId(request.getMerchantOrderId());
        
        try {
            transaction.setMerchantTimestamp(LocalDateTime.parse(request.getMerchantTimestamp()));
        } catch (Exception e) {
            transaction.setMerchantTimestamp(LocalDateTime.now());
        }
        
        transaction.setSuccessUrl(request.getSuccessUrl());
        transaction.setFailedUrl(request.getFailedUrl());
        transaction.setErrorUrl(request.getErrorUrl());
        transaction.setStatus("CREATED"); 
        transaction.setPspTimestamp(LocalDateTime.now());
        transaction.setStan(String.valueOf(new Random().nextInt(900000) + 100000));

        Transaction saved = transactionRepository.save(transaction);

        // PCI DSS 3.2 - Create a tokenized payment session.
        PaymentSession session = new PaymentSession();
        session.setSessionToken(generateSecureToken());
        session.setTransactionId(saved.getId());
        session.setMerchantId(request.getMerchantId());
        session.setAmount(request.getAmount());
        session.setCurrency(request.getCurrency());
        session.setPaymentMethod(request.getPaymentMethod());
        session.setSuccessUrl(request.getSuccessUrl());
        session.setFailedUrl(request.getFailedUrl());
        session.setErrorUrl(request.getErrorUrl());
        session.setCreatedAt(Instant.now());
        session.setExpiresAt(Instant.now().plusSeconds(15 * 60)); // 15 minutes
        session.setIsUsed(false);
        session.setStatus(PaymentSession.SessionStatus.ACTIVE);
        session.setAttemptCount(0);
        
        paymentSessionRepository.save(session);

        // PCI DSS 10.2 - Audit log for transaction creation
        auditService.logTransactionCreated(
            request.getMerchantId(), 
            saved.getId(), 
            saved.getAmount(), 
            saved.getCurrency()
        );

        return saved;
    }

    /**
     * Generate a secure payment-session token.
     */
    private String generateSecureToken() {
        SecureRandom random = new SecureRandom();
        byte[] tokenBytes = new byte[32];
        random.nextBytes(tokenBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
    }

    /**
     * Update the transaction status with audit logging.
     */
    @Transactional
    public boolean updateStatus(String identifier, Map<String, Object> statusUpdate) {
        String cleanId = identifier.trim();

        // 1. Try a direct lookup by merchantOrderId.
        Transaction transaction = transactionRepository.findByMerchantOrderId(cleanId);

        // 2. If not found, fall back to a flexible lookup.
        if (transaction == null) {
            List<Transaction> all = transactionRepository.findAll();
            transaction = all.stream()
                .filter(t -> (t.getMerchantOrderId() != null && t.getMerchantOrderId().equals(cleanId)) || 
                             (t.getStan() != null && t.getStan().equals(cleanId)) ||
                             (t.getId() != null && String.valueOf(t.getId()).equals(cleanId)))
                .findFirst()
                .orElse(null);
        }

        if (transaction != null) {
            String oldStatus = transaction.getStatus();
            String status = (String) statusUpdate.get("status");
            
            // Handle PAID / SUCCESS status.
            if ("SUCCESS".equalsIgnoreCase(status) || "PAID".equalsIgnoreCase(status)) {
                transaction.setStatus("PAID");
                if (statusUpdate.containsKey("globalTransactionId")) {
                    transaction.setGlobalTransactionId(statusUpdate.get("globalTransactionId").toString());
                }
            }
            // Handle FAILED status.
            else if ("FAILED".equalsIgnoreCase(status)) {
                transaction.setStatus("FAILED");
                if (statusUpdate.containsKey("reason")) {
                    transaction.setReason(statusUpdate.get("reason").toString());
                }
            }

            // Update timestamp if provided.
            if (statusUpdate.containsKey("acquirerTimestamp")) {
                transaction.setAcquirerTimestamp(LocalDateTime.now());
            }

            transactionRepository.saveAndFlush(transaction);

            // PCI DSS 10.2 - Audit log for the status change
            auditService.logTransactionStatusChanged(
                transaction.getMerchantId(),
                String.valueOf(transaction.getId()),
                oldStatus,
                transaction.getStatus()
            );

            return true;
        }

        // Log the failed attempt.
        auditService.logFailure(AuditActionType.TRANSACTION_UPDATED, "SYSTEM", cleanId, "Transaction not found");
        return false;
    }

    /**
     * Update the payment method with audit logging.
     */
    @Transactional
    public boolean updatePaymentMethod(Long id, String method) {
        return transactionRepository.findById(id).map(transaction -> {
            String oldMethod = transaction.getPaymentMethod();
            transaction.setPaymentMethod(method);
            transactionRepository.save(transaction);
            
            System.out.println("✅ CORE SERVICE: method " + method + " saved for ID: " + id);

            // PCI DSS 10.2 - Audit log
            auditService.log(AuditActionType.PAYMENT_METHOD_SELECTED, 
                transaction.getMerchantId(),
                String.valueOf(id), 
                "TRANSACTION", 
                AuditOutcome.SUCCESS,
                String.format("Method: %s -> %s", oldMethod, method));

            return true;
        }).orElse(false);
    }

    /**
     * Return a transaction by ID with audit logging.
     */
    @Transactional(readOnly = true)
    public Optional<Transaction> getTransactionById(Long id) {
        Optional<Transaction> transaction = transactionRepository.findById(id);
        
        transaction.ifPresent(t -> {
            auditService.log(AuditActionType.TRANSACTION_VIEWED, 
                t.getMerchantId(),
                String.valueOf(id), 
                "TRANSACTION", 
                AuditOutcome.SUCCESS, null);
        });

        return transaction;
    }

    /**
     * Return all transactions with audit logging.
     */
    @Transactional(readOnly = true)
    public List<Transaction> getAllTransactions() {
        auditService.log(AuditActionType.TRANSACTION_SEARCH, 
            "SYSTEM", null, "TRANSACTION", AuditOutcome.SUCCESS, "List all");
        return transactionRepository.findAll();
    }

    /**
     * Log access to card data (for PCI DSS compliance).
     */
    public void logCardDataAccess(Long transactionId, String pan, String actor) {
        String maskedPan = PanMasker.mask(pan);
        auditService.logCardDataAccess(actor, String.valueOf(transactionId), maskedPan);
    }
}