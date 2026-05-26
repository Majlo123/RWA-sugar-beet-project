package com.psp.paypal.controller;

import com.psp.paypal.dto.PayPalExecuteRequest;
import com.psp.paypal.dto.PayPalPaymentRequest;
import com.psp.paypal.service.PayPalService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/paypal")
public class PayPalController {

    @Autowired
    private PayPalService payPalService;

    @PostMapping("/create-payment")
    public ResponseEntity<?> createPayment(@RequestBody PayPalPaymentRequest request) {
        try {
            Map<String, String> response = payPalService.createPayment(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PostMapping("/execute-payment")
    public ResponseEntity<?> executePayment(@RequestBody PayPalExecuteRequest request) {
        try {
            Map<String, String> response = payPalService.executePayment(
                request.getPaymentId(),
                request.getPayerId(),
                request.getMerchantOrderId()
            );
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PostMapping("/cancel-payment")
    public ResponseEntity<?> cancelPayment(@RequestParam String paymentId, 
                                           @RequestParam String merchantOrderId) {
        try {
            payPalService.cancelPayment(paymentId, merchantOrderId);
            return ResponseEntity.ok("Payment cancelled");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }
}
