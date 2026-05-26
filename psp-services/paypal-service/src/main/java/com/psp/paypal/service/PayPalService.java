package com.psp.paypal.service;

import com.paypal.core.PayPalHttpClient;
import com.paypal.http.HttpResponse;
import com.paypal.orders.*;
import com.psp.paypal.dto.PayPalPaymentRequest;
import com.psp.paypal.model.PayPalTransaction;
import com.psp.paypal.repository.PayPalTransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * PayPal Service - Real PayPal API Integration
 * Uses PayPal Orders API v2 for payment processing
 * Documentation: https://developer.paypal.com/docs/api/orders/v2/
 */
@Service
public class PayPalService {

    @Autowired
    private PayPalTransactionRepository repository;

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private PayPalHttpClient payPalHttpClient;

    @Value("${paypal.return-url}")
    private String returnUrl;

    @Value("${paypal.cancel-url}")
    private String cancelUrl;

    private final String CORE_SERVICE_UPDATE_METHOD_URL = "http://core-service:8080/transactions/update-method/";
    private final String CORE_SERVICE_UPDATE_STATUS_URL = "http://core-service:8080/transactions/update-status/";

    /**
     * Creates a PayPal order using the real PayPal Orders API v2
     * @param request Payment request with amount and merchant details
     * @return Map containing orderId and approval URL
     */
    public Map<String, String> createPayment(PayPalPaymentRequest request) {
        try {
            // Update payment method in Core service
            updateCoreTransactionMethod(request.getPspTransactionId());

            // Build PayPal Order Request
            OrderRequest orderRequest = buildOrderRequest(request);

            // Create order via PayPal API
            OrdersCreateRequest ordersCreateRequest = new OrdersCreateRequest();
            ordersCreateRequest.prefer("return=representation");
            ordersCreateRequest.requestBody(orderRequest);

            HttpResponse<Order> response = payPalHttpClient.execute(ordersCreateRequest);
            Order order = response.result();

            // Extract approval URL from PayPal response
            String approvalUrl = order.links().stream()
                    .filter(link -> "approve".equals(link.rel()))
                    .findFirst()
                    .map(LinkDescription::href)
                    .orElseThrow(() -> new RuntimeException("No approval URL found"));

            // Save transaction to MongoDB
            PayPalTransaction transaction = new PayPalTransaction();
            transaction.setPspTransactionId(request.getPspTransactionId());
            transaction.setMerchantOrderId(request.getMerchantOrderId());
            transaction.setAmount(request.getAmount());
            transaction.setCurrency(request.getCurrency());
            transaction.setPaypalPaymentId(order.id());
            transaction.setStatus(order.status());
            transaction.setApprovalUrl(approvalUrl);
            transaction.setCreatedAt(LocalDateTime.now());
            repository.save(transaction);

            // Prepare response
            Map<String, String> result = new HashMap<>();
            result.put("paymentId", order.id());
            result.put("approvalUrl", approvalUrl);
            result.put("status", order.status());
            
            System.out.println("✅ PayPal Order Created: " + order.id());
            return result;

        } catch (IOException e) {
            System.err.println("❌ PayPal API Error: " + e.getMessage());
            
            // Extract more detailed error information
            String errorMessage = e.getMessage();
            if (errorMessage != null) {
                if (errorMessage.contains("CURRENCY_NOT_SUPPORTED")) {
                    errorMessage = "Currency not supported by PayPal. Supported currencies: USD, EUR, GBP, CAD, AUD, JPY, etc. Full list: https://developer.paypal.com/docs/reports/reference/paypal-supported-currencies/";
                } else if (errorMessage.contains("AUTHENTICATION_FAILURE")) {
                    errorMessage = "PayPal authentication failed. Check your Client ID and Secret in application.yml";
                }
            }
            
            throw new RuntimeException("Failed to create PayPal payment: " + errorMessage);
        }
    }

    /**
     * Captures/executes a PayPal order after user approval
     * @param paymentId PayPal order ID
     * @param payerId PayPal payer ID (optional, captured automatically)
     * @param merchantOrderId Merchant order ID for tracking
     * @return Map containing payment status
     */
    public Map<String, String> executePayment(String paymentId, String payerId, String merchantOrderId) {
        try {
            PayPalTransaction transaction = repository.findByPaypalPaymentId(paymentId)
                    .orElseThrow(() -> new RuntimeException("PAYMENT_NOT_FOUND"));

            // Capture the order via PayPal API
            OrdersCaptureRequest captureRequest = new OrdersCaptureRequest(paymentId);
            captureRequest.prefer("return=representation");

            HttpResponse<Order> response = payPalHttpClient.execute(captureRequest);
            Order capturedOrder = response.result();

            // Check capture status
            if ("COMPLETED".equals(capturedOrder.status())) {
                // Update transaction
                transaction.setPaypalPayerId(payerId);
                transaction.setStatus("COMPLETED");
                transaction.setCompletedAt(LocalDateTime.now());
                repository.save(transaction);

                // Notify Core Service
                notifyCoreService(merchantOrderId, "SUCCESS", paymentId, null);

                Map<String, String> result = new HashMap<>();
                result.put("status", "SUCCESS");
                result.put("paymentId", paymentId);
                result.put("captureStatus", capturedOrder.status());
                
                System.out.println("✅ PayPal Payment Captured: " + paymentId);
                return result;

            } else {
                // Payment not completed
                transaction.setStatus("FAILED");
                transaction.setErrorMessage("CAPTURE_FAILED");
                repository.save(transaction);

                notifyCoreService(merchantOrderId, "FAILED", null, "CAPTURE_FAILED");
                throw new RuntimeException("Payment capture failed: " + capturedOrder.status());
            }

        } catch (IOException e) {
            System.err.println("❌ PayPal Capture Error: " + e.getMessage());
            
            // Update transaction status
            repository.findByPaypalPaymentId(paymentId).ifPresent(transaction -> {
                transaction.setStatus("FAILED");
                transaction.setErrorMessage(e.getMessage());
                repository.save(transaction);
            });
            
            notifyCoreService(merchantOrderId, "FAILED", null, e.getMessage());
            throw new RuntimeException("Failed to capture payment: " + e.getMessage());
        }
    }

    /**
     * Cancels a PayPal payment
     * @param paymentId PayPal order ID
     * @param merchantOrderId Merchant order ID
     */
    public void cancelPayment(String paymentId, String merchantOrderId) {
        PayPalTransaction transaction = repository.findByPaypalPaymentId(paymentId).orElse(null);
        
        if (transaction != null) {
            transaction.setStatus("CANCELLED");
            repository.save(transaction);
        }

        notifyCoreService(merchantOrderId, "FAILED", null, "USER_CANCELLED");
        System.out.println("❌ Payment Cancelled: " + paymentId);
    }

    /**
     * Builds PayPal OrderRequest according to API v2 specification
     */
    private OrderRequest buildOrderRequest(PayPalPaymentRequest request) {
        OrderRequest orderRequest = new OrderRequest();
        
        // Set intent to CAPTURE (immediate payment)
        orderRequest.checkoutPaymentIntent("CAPTURE");

        // Determine currency - trim whitespace and default to USD
        String currency = (request.getCurrency() != null && !request.getCurrency().trim().isEmpty()) 
                ? request.getCurrency().trim().toUpperCase() 
                : "USD";
        
        // Log request details for debugging
        System.out.println("🔍 Creating PayPal Order:");
        System.out.println("   Amount: " + request.getAmount());
        System.out.println("   Currency: '" + currency + "' (length: " + currency.length() + ")");
        System.out.println("   Order ID: " + request.getMerchantOrderId());

        // Build purchase units
        List<PurchaseUnitRequest> purchaseUnits = new ArrayList<>();
        PurchaseUnitRequest purchaseUnit = new PurchaseUnitRequest()
                .referenceId(request.getMerchantOrderId())
                .description("Payment for Order " + request.getMerchantOrderId())
                .customId(request.getMerchantOrderId())
                .amountWithBreakdown(new AmountWithBreakdown()
                        .currencyCode(currency)
                        .value(String.format("%.2f", request.getAmount())));
        
        purchaseUnits.add(purchaseUnit);
        orderRequest.purchaseUnits(purchaseUnits);

        // Application context (return/cancel URLs)
        ApplicationContext applicationContext = new ApplicationContext()
                .returnUrl(returnUrl + "?merchantOrderId=" + request.getMerchantOrderId())
                .cancelUrl(cancelUrl + "?merchantOrderId=" + request.getMerchantOrderId())
                .brandName("PSP Payment System")
                .landingPage("BILLING")
                .shippingPreference("NO_SHIPPING")
                .userAction("PAY_NOW");
        
        orderRequest.applicationContext(applicationContext);

        return orderRequest;
    }

    // Helper methods
    private void updateCoreTransactionMethod(Long pspTransactionId) {
        try {
            Map<String, String> updateRequest = new HashMap<>();
            updateRequest.put("method", "PAYPAL");
            restTemplate.put(CORE_SERVICE_UPDATE_METHOD_URL + pspTransactionId, updateRequest);
            System.out.println("✅ CORE: Method PAYPAL set for ID: " + pspTransactionId);
        } catch (Exception e) {
            System.err.println("⚠️ CORE ERROR: Failed to update method: " + e.getMessage());
        }
    }

    private void notifyCoreService(String merchantOrderId, String status, String paymentId, String reason) {
        try {
            Map<String, Object> statusUpdate = new HashMap<>();
            statusUpdate.put("status", status);
            statusUpdate.put("reason", reason != null ? reason : "PAYPAL_" + status);
            statusUpdate.put("globalTransactionId", paymentId);
            statusUpdate.put("acquirerTimestamp", LocalDateTime.now().toString());

            restTemplate.put(CORE_SERVICE_UPDATE_STATUS_URL + merchantOrderId, statusUpdate);
            System.out.println("📞 WEBHOOK [" + status + "] -> Reason: " + reason);
        } catch (Exception e) {
            System.err.println("⚠️ Error notifying Core service: " + e.getMessage());
        }
    }
}
