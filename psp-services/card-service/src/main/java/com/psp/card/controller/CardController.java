package com.psp.card.controller;

import com.psp.card.dto.CardPaymentRequest;
import com.psp.card.service.CardService; // OBAVEZNO DODAJ IMPORT
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
            return ResponseEntity.badRequest().body("Greška: pspTransactionId ne sme biti null");
        }

        // KORAK 1: Ažuriranje metode u Core servisu preko servisa
        cardService.updateTransactionMethod(request.getPspTransactionId());

        // KORAK 2: Dobavljanje URL-a od banke preko servisa
        try {
            Map<String, Object> bankData = cardService.getPaymentUrlFromBank(request);
            return ResponseEntity.ok(bankData);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Banka nedostupna: " + e.getMessage());
        }
    }
}