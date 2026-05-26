package com.psp.core.controller;

import com.psp.core.dto.PaymentRequest;
import com.psp.core.model.Transaction;
import com.psp.core.service.TransactionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/transactions")
public class TransactionController {

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private com.psp.core.repository.TransactionRepository transactionRepository;

    @PostMapping("/initiate")
    public ResponseEntity<?> initiateTransaction(@RequestBody PaymentRequest request) {
        if (isAuthDisabled()) {
            Transaction saved = transactionService.createInitialTransaction(request);
            Map<String, Object> response = new HashMap<>();
            response.put("pspTransactionId", saved.getId());
            response.put("paymentUrl", "/payment-methods/" + saved.getId());
            return ResponseEntity.ok(response);
        }

        return transactionService.authenticateMerchant(request.getMerchantId(), request.getMerchantPassword())
            .map(merchant -> {
                Transaction saved = transactionService.createInitialTransaction(request);
                Map<String, Object> response = new HashMap<>();
                response.put("pspTransactionId", saved.getId());
                response.put("paymentUrl", "/payment-methods/" + saved.getId());
                return ResponseEntity.ok(response);
            })
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Auth failed"));
    }

    private boolean isAuthDisabled() {
        try {
            String flag = System.getenv("PSP_DISABLE_AUTH");
            if (flag == null) return false;
            return flag.equalsIgnoreCase("true") || flag.equals("1");
        } catch (Exception e) {
            return false;
        }
    }

    @PutMapping("/update-status/{merchantOrderId}")
    public ResponseEntity<?> updateStatus(@PathVariable String merchantOrderId, @RequestBody Map<String, Object> statusUpdate) {
        if (transactionService.updateStatus(merchantOrderId, statusUpdate)) {
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Transaction> getDetails(@PathVariable Long id) {
        return transactionRepository.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping
    public List<Transaction> getAll() {
        return transactionRepository.findAll();
    }

    @PutMapping("/update-method/{id}")
public ResponseEntity<?> updatePaymentMethod(@PathVariable Long id, @RequestBody Map<String, String> body) {
    String method = body.get("method");
    if (transactionService.updatePaymentMethod(id, method)) {
        return ResponseEntity.ok().build();
    }
    return ResponseEntity.notFound().build();
}
}