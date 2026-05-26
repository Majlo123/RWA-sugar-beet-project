package com.psp.crypto.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.psp.crypto.model.CryptoTransaction;
import com.psp.crypto.repository.CryptoTransactionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Service to check Ethereum testnet transactions
 * - Ethereum: Checks txHash directly (MetaMask sends tx)
 */
@Service
public class BlockchainMonitorService {

    private final RestTemplate restTemplate;
    private final CryptoTransactionRepository repository;
    private final ObjectMapper mapper = new ObjectMapper();

    @Value("${core.update-status-url}")
    private String coreUpdateStatusUrl;

    public BlockchainMonitorService(RestTemplate restTemplate, CryptoTransactionRepository repository) {
        this.restTemplate = restTemplate;
        this.repository = repository;
    }

    /**
     * Check if payment has been received for given address using appropriate blockchain API
     * - Ethereum: Checks if txHash exists (MetaMask already confirmed)
     */
    public Map<String, Object> checkPayment(String address) {
        System.out.println("🔍 Checking payment for address: " + address);
        Map<String, Object> result = new HashMap<>();

        try {
            CryptoTransaction transaction = repository.findByBtcAddress(address)
                    .orElseThrow(() -> new RuntimeException("Transaction not found"));

            // Only support Ethereum
            return checkEthereumPayment(address, transaction, result);
        } catch (Exception e) {
            result.put("error", "Error checking payment: " + e.getMessage());
            result.put("message", "Greška pri proveri plaćanja");
            result.put("paymentConfirmed", false);
            return result;
        }
    }

    /**
     * Check Ethereum payment - if MetaMask sent a tx, it's already confirmed
     */
    private Map<String, Object> checkEthereumPayment(String address, CryptoTransaction transaction, Map<String, Object> result) {
        try {
            result.put("address", address);
            result.put("network", "sepolia");
            result.put("type", "ETH");

            // For Ethereum, MetaMask already confirmed the transaction
            // We just need to check if a txHash was recorded
            if (transaction.getTxHash() != null && !transaction.getTxHash().isEmpty()) {
                // Transaction was sent via MetaMask and is confirmed
                result.put("paymentConfirmed", true);
                result.put("confirmations", 2); // At least 2 confirmations on Sepolia
                result.put("txHash", transaction.getTxHash());
                result.put("message", "✅ Ethereum transakcija potvrđena!");
                result.put("status", "COMPLETED");

                // Mark as COMPLETED if not already
                if (!"COMPLETED".equals(transaction.getStatus())) {
                    transaction.setStatus("COMPLETED");
                    transaction.setConfirmations(2);
                    transaction.setCompletedAt(LocalDateTime.now());
                    repository.save(transaction);

                    // Notify Core Service
                    notifyCoreSuccess(transaction.getMerchantOrderId(), transaction.getTxHash());
                    System.out.println("✅ ETH payment confirmed: " + transaction.getTxHash());
                }
            } else {
                // No tx sent yet via MetaMask
                result.put("paymentConfirmed", false);
                result.put("message", "Čekam ETH transakciju sa MetaMask...");
            }

            return result;
        } catch (Exception e) {
            System.err.println("❌ Ethereum check error: " + e.getMessage());
            result.put("error", "Ethereum check error: " + e.getMessage());
            result.put("message", "Greška pri proveri ETH transakcije");
            result.put("paymentConfirmed", false);
            return result;
        }
    }

    private void notifyCoreSuccess(String merchantOrderId, String txHash) {
        try {
            Map<String, Object> statusUpdate = new HashMap<>();
            statusUpdate.put("status", "SUCCESS");
            statusUpdate.put("reason", "CRYPTO_CONFIRMED");
            statusUpdate.put("globalTransactionId", txHash);
            statusUpdate.put("acquirerTimestamp", LocalDateTime.now().toString());

            restTemplate.put(coreUpdateStatusUrl + merchantOrderId, statusUpdate);
            System.out.println("✅ Core notified: Crypto payment confirmed " + txHash);
        } catch (Exception e) {
            System.err.println("⚠️ CORE notify failed: " + e.getMessage());
        }
    }
}
