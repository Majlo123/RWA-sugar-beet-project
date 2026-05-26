package com.psp.core.controller;

import com.psp.core.model.Transaction;
import com.psp.core.repository.TransactionRepository;
import com.psp.core.service.QRService;
import com.psp.core.service.TransactionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/qr")
public class QRPaymentController {

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private QRService qrService;

    @Autowired
    private TransactionService transactionService;

    @GetMapping("/generate/{pspTransactionId}")
    public ResponseEntity<?> generateQRCode(@PathVariable Long pspTransactionId) {
        return transactionRepository.findById(pspTransactionId).map(transaction -> {
            try {
                // Generate the code via the QR service.
                Map<String, String> qrData = qrService.generateIPSQRCode(transaction);

                // Update the method via the Transaction service.
                transaction.setPaymentMethod("QR");
                transactionRepository.save(transaction);

                return ResponseEntity.ok(qrData);
            } catch (Exception e) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                     .body("Error: " + e.getMessage());
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/simulate-pay/{pspTransactionId}")
    public ResponseEntity<?> simulatePayment(@PathVariable Long pspTransactionId) {
        return transactionRepository.findById(pspTransactionId).map(transaction -> {
            // Limit check (Item 1.2).
            if (transaction.getAmount() > 20000) {
                transactionService.updateStatus(String.valueOf(pspTransactionId),
                    Map.of("status", "FAILED", "reason", "LIMIT_EXCEEDED"));
                return ResponseEntity.badRequest().body("Amount exceeds the limit (20,000 RSD)");
            }

            // Successful simulation.
            String mockGlobalId = "QR-IPS-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            transactionService.updateStatus(String.valueOf(pspTransactionId),
                Map.of("status", "PAID", "globalTransactionId", mockGlobalId));

            return ResponseEntity.ok("Simulation successful. Global ID: " + mockGlobalId);
        }).orElse(ResponseEntity.notFound().build());
    }
}