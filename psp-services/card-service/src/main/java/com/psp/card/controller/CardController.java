package com.psp.card.controller;

import com.psp.card.dto.CardPaymentRequest;
import com.psp.card.service.CardService; // REQUIRED IMPORT
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/cards")
public class CardController {

    @Autowired
    private CardService cardService;

    @PostMapping("/pay")
    public ResponseEntity<?> initiateCardPayment(@RequestBody CardPaymentRequest request) {
        
        if (request.getPspTransactionId() == null) {
            return ResponseEntity.badRequest().body("Error: pspTransactionId must not be null");
        }

        // STEP 1: Update the payment method in the Core service.
        cardService.updateTransactionMethod(request.getPspTransactionId());

        // STEP 2: Fetch the URL from the bank service.
        try {
            Map<String, Object> bankData = cardService.getPaymentUrlFromBank(request);
            return ResponseEntity.ok(bankData);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Bank unavailable: " + e.getMessage());
        }
    }
}