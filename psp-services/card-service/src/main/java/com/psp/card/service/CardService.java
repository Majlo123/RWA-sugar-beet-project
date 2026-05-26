package com.psp.card.service;

import com.psp.card.dto.CardPaymentRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
public class CardService {

    @Autowired
    private RestTemplate restTemplate;

    private final String BANK_SERVICE_URL = "http://bank-service:8080/api/bank/request-payment-url";
    private final String CORE_SERVICE_UPDATE_URL = "http://core-service:8080/transactions/update-method/";

    public void updateTransactionMethod(Long pspTransactionId) {
        try {
            Map<String, String> updateRequest = new HashMap<>();
            updateRequest.put("method", "CARD");
            restTemplate.put(CORE_SERVICE_UPDATE_URL + pspTransactionId, updateRequest);
            System.out.println("✅ CORE: CARD method recorded for ID: " + pspTransactionId);
        } catch (Exception e) {
            System.out.println("⚠️ CORE ERROR: Failed to record payment method: " + e.getMessage());
        }
    }

    public Map<String, Object> getPaymentUrlFromBank(CardPaymentRequest request) {
        String baseUrl = System.getenv().getOrDefault("PSP_FRONTEND_URL", "https://localhost");
        
        Map<String, Object> bankRequest = new HashMap<>();
        bankRequest.put("merchantId", "PSP_CLIENT_ID_123");
        bankRequest.put("amount", request.getAmount());
        bankRequest.put("currency", request.getCurrency());
        bankRequest.put("merchantOrderId", request.getMerchantOrderId());
        bankRequest.put("merchantTimestamp", LocalDateTime.now().toString());
        bankRequest.put("successUrl", baseUrl + "/success");
        bankRequest.put("failedUrl", baseUrl + "/failed");

        ResponseEntity<Map> bankResponse = restTemplate.postForEntity(BANK_SERVICE_URL, bankRequest, Map.class);
        return bankResponse.getBody();
    }
}