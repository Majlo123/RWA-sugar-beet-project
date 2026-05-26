package com.bank.controller;

import com.bank.dto.PaymentUrlRequest;
import com.bank.security.PanMasker;
import com.bank.service.PaymentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

/**
 * PCI DSS - Bank Controller sa sigurnosnim merama
 */
@RestController
@RequestMapping("/api/bank")
public class BankController {

    @Autowired
    private PaymentService paymentService;

    @PostMapping("/request-payment-url")
    public ResponseEntity<?> generatePaymentUrl(@RequestBody PaymentUrlRequest request) {
        try {
            System.out.println("🔐 BANK: Payment URL request received");
            return ResponseEntity.ok(paymentService.createPaymentSession(request));
        } catch (Exception e) {
            System.err.println("❌ BANK: Payment URL request failed: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        }
    }

    /**
     * PCI DSS 3.2.3 - Ne čuvaj SAD (Sensitive Authentication Data) nakon autorizacije
     * PCI DSS 3.4 - Maskiraj PAN kada se prikazuje
     */
    @PostMapping("/pay")
    public ResponseEntity<?> processPayment(@RequestBody Map<String, Object> paymentData) {
        String orderId = (String) paymentData.get("merchantOrderId");
        
        // PCI DSS 10.2 - Logiraj sve pokušaje plaćanja sa maskiranim PAN-om
        String pan = (String) paymentData.get("pan");
        String maskedPan = PanMasker.mask(pan);
        System.out.println("💳 BANK: Payment attempt - Order: " + orderId + ", Card: " + maskedPan);
        
        if (paymentService.isOrderProcessed(orderId)) {
            System.out.println("⚠️ BANK: Duplicate payment attempt - Order: " + orderId);
            return ResponseEntity.status(HttpStatus.CONFLICT).body("ALREADY_PROCESSED");
        }

        String expiry = (String) paymentData.get("expiryDate");
        String cvv = (String) paymentData.get("cvv");
        Double amount = Double.valueOf(paymentData.get("amount").toString());

        // PCI DSS 6.5 - Validacija inputa
        String validationResult = paymentService.validateCard(pan, expiry, cvv);
        if (!"VALID".equals(validationResult)) {
            System.out.println("❌ BANK: Card validation failed - " + validationResult + ", Card: " + maskedPan);
            paymentService.notifyPsp(orderId, "FAILED", null, validationResult);
            paymentService.markAsProcessed(orderId);
            return ResponseEntity.badRequest().body(validationResult);
        }

        // Simulacija provere sredstava
        if (amount > 20000) {
            System.out.println("💰 BANK: Insufficient funds - Amount: " + amount + ", Card: " + maskedPan);
            paymentService.notifyPsp(orderId, "FAILED", null, "INSUFFICIENT_FUNDS");
            paymentService.markAsProcessed(orderId);
            return ResponseEntity.badRequest().body("INSUFFICIENT_FUNDS");
        }

        // Uspešno plaćanje
        String globalId = UUID.randomUUID().toString();
        System.out.println("✅ BANK: Payment successful - Order: " + orderId + ", GlobalID: " + globalId + ", Card: " + maskedPan);
        
        paymentService.notifyPsp(orderId, "PAID", globalId, null);
        paymentService.markAsProcessed(orderId);

        Map<String, String> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("globalTransactionId", globalId);
        response.put("maskedPan", maskedPan); // Vraćaj samo maskirani PAN
        return ResponseEntity.ok(response);
    }
}