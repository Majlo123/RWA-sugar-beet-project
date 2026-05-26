package com.bank.service;

import com.bank.dto.PaymentUrlRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PaymentService {

    @Autowired
    private RestTemplate restTemplate;

    private static final String VALID_PSP_CLIENT_ID = "PSP_CLIENT_ID_123";
    private static final java.util.Set<String> processedOrders = ConcurrentHashMap.newKeySet();

    public Map<String, String> createPaymentSession(PaymentUrlRequest request) {
        if (!VALID_PSP_CLIENT_ID.equals(request.getMerchantId())) {
            throw new RuntimeException("UNAUTHORIZED_PSP");
        }

        String paymentId = UUID.randomUUID().toString();
        Instant expiryTime = Instant.now().plus(15, ChronoUnit.MINUTES);

        String baseUrl = System.getenv().getOrDefault("PSP_FRONTEND_URL", "https://localhost");
        String successUrl = request.getSuccessUrl() != null ? request.getSuccessUrl() : baseUrl + "/success";
        String failedUrl = request.getFailedUrl() != null ? request.getFailedUrl() : baseUrl + "/failed";
        
        String paymentUrl = baseUrl + "/bank-payment/" + paymentId + 
                            "?amount=" + request.getAmount() + 
                            "&merchantOrderId=" + request.getMerchantOrderId() +
                            "&expiresAt=" + expiryTime.toString() +
                            "&successUrl=" + successUrl +
                            "&failedUrl=" + failedUrl;

        Map<String, String> response = new HashMap<>();
        response.put("paymentId", paymentId);
        response.put("paymentUrl", paymentUrl);
        response.put("expiresAt", expiryTime.toString());
        return response;
    }

    public boolean isOrderProcessed(String merchantOrderId) {
        return processedOrders.contains(merchantOrderId);
    }

    public void markAsProcessed(String merchantOrderId) {
        processedOrders.add(merchantOrderId);
    }

    // --- KEY CHANGE: split validations with specific error messages. ---
    public String validateCard(String pan, String expiryDate, String cvv) {
        if (cvv == null || !cvv.matches("^[0-9]{3}$")) return "INVALID_CVV";
        if (expiryDate == null || !expiryDate.matches("(0[1-9]|1[0-2])/[0-9]{2}")) return "INVALID_DATE_FORMAT";
        if (isCardExpired(expiryDate)) return "CARD_EXPIRED";
        if (!luhnCheck(pan)) return "LUHN_FAILED";
        return "VALID";
    }

    public void notifyPsp(String merchantOrderId, String status, String globalId, String reason) {
        try {
            String coreUrl = "http://core-service:8080/transactions/update-status/" + merchantOrderId;
            Map<String, Object> statusUpdate = new HashMap<>();
            statusUpdate.put("status", status);
            statusUpdate.put("reason", reason); // This reason will now show up accurately in the history.
            statusUpdate.put("globalTransactionId", globalId);
            statusUpdate.put("acquirerTimestamp", LocalDateTime.now().toString());

            restTemplate.put(coreUrl, statusUpdate);
            System.out.println("📞 WEBHOOK [" + status + "] -> Reason: " + reason);
        } catch (Exception e) {
            System.err.println("⚠️ Error sending status: " + e.getMessage());
        }
    }

    private boolean luhnCheck(String cardNo) {
        if (cardNo == null) return false;
        String cleanPan = cardNo.replaceAll("\\D", "");
        int nSum = 0;
        boolean isSecond = false;
        for (int i = cleanPan.length() - 1; i >= 0; i--) {
            int d = cleanPan.charAt(i) - '0';
            if (isSecond) d = d * 2;
            nSum += d / 10;
            nSum += d % 10;
            isSecond = !isSecond;
        }
        return (nSum % 10 == 0);
    }

    private boolean isCardExpired(String expiryDate) {
        try {
            String[] parts = expiryDate.split("/");
            int month = Integer.parseInt(parts[0]);
            int year = Integer.parseInt("20" + parts[1]);
            return YearMonth.of(year, month).isBefore(YearMonth.now());
        } catch (Exception e) { return true; }
    }
}