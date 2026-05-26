package com.psp.crypto.controller;

import com.psp.crypto.dto.CryptoPaymentRequest;
import com.psp.crypto.dto.CryptoPaymentResponse;
import com.psp.crypto.service.BlockchainMonitorService;
import com.psp.crypto.service.CryptoService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/crypto")
public class CryptoController {

    private final CryptoService cryptoService;
    private final BlockchainMonitorService blockchainMonitor;

    public CryptoController(CryptoService cryptoService, BlockchainMonitorService blockchainMonitor) {
        this.cryptoService = cryptoService;
        this.blockchainMonitor = blockchainMonitor;
    }

    @PostMapping("/create-payment")
    public ResponseEntity<CryptoPaymentResponse> createPayment(@Valid @RequestBody CryptoPaymentRequest request) {
        return ResponseEntity.ok(cryptoService.createPayment(request));
    }

    @PostMapping("/update-tx-hash")
    public ResponseEntity<Void> updateTxHash(@RequestBody Map<String, String> payload) {
        String address = payload.get("address");
        String txHash = payload.get("txHash");
        cryptoService.updateTxHash(address, txHash);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/check-payment/{address}")
    public ResponseEntity<Map<String, Object>> checkPayment(@PathVariable String address) {
        return ResponseEntity.ok(blockchainMonitor.checkPayment(address));
    }
}
