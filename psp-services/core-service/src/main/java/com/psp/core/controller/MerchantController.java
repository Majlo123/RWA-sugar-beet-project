package com.psp.core.controller;

import com.psp.core.dto.MerchantMethodsResponse;
import com.psp.core.dto.MerchantUpdateRequest;
import com.psp.core.model.Merchant;
import com.psp.core.service.MerchantService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/merchants")
public class MerchantController {

    @Autowired
    private MerchantService merchantService;

    @PostMapping("/register")
    public ResponseEntity<Merchant> registerMerchant(@RequestBody Merchant merchant) {
        Merchant registered = merchantService.registerMerchant(merchant);
        return ResponseEntity.ok(registered);
    }

    @PutMapping("/{merchantId}/subscription")
    public ResponseEntity<Merchant> updateSubscription(@PathVariable String merchantId, @RequestBody MerchantUpdateRequest request) {
        try {
            Merchant updated = merchantService.updateMerchantSubscription(merchantId, request);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/{merchantId}")
    public ResponseEntity<Merchant> getMerchant(@PathVariable String merchantId) {
        try {
            Merchant merchant = merchantService.getMerchant(merchantId);
            return ResponseEntity.ok(merchant);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/{merchantId}/methods")
    public ResponseEntity<MerchantMethodsResponse> getMerchantMethods(@PathVariable String merchantId) {
        try {
            MerchantMethodsResponse response = merchantService.getMerchantMethods(merchantId);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
