package com.psp.core.resilience;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import io.github.resilience4j.bulkhead.annotation.Bulkhead;
import io.github.resilience4j.timelimiter.annotation.TimeLimiter;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.concurrent.CompletableFuture;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * High Availability Example: Implementing Resilience Patterns
 * 
 * This service demonstrates how to use Resilience4j for:
 * - Circuit Breaker Pattern (stop cascading failures)
 * - Retry Pattern (handle transient failures)
 * - Bulkhead Pattern (isolate thread pools)
 * - Timeout Pattern (prevent hanging requests)
 * 
 * PCI DSS Compliance: All external API calls are monitored for security
 */
@Service
public class ResilientExternalServiceClient {
    
    private static final Logger logger = LoggerFactory.getLogger(ResilientExternalServiceClient.class);
    
    private final RestTemplate restTemplate;
    
    public ResilientExternalServiceClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }
    
    /**
     * Example 1: Calling Bank API with Circuit Breaker + Retry
     * 
     * Circuit Breaker Configuration (from application-ha.yml):
     * - Open circuit when 40% of calls fail
     * - Wait 20 seconds before attempting to recover
     * - Allow 3 test calls in half-open state
     * 
     * Retry Configuration:
     * - Retry up to 3 times for transient errors
     * - Wait 1 second between retries
     * - Only retry on ConnectException, SocketTimeoutException
     */
    @CircuitBreaker(
        name = "bank-api",
        fallbackMethod = "bankApiFallback"
    )
    @Retry(
        name = "transient-errors"
    )
    @Bulkhead(
        name = "external-services"
    )
    @TimeLimiter(
        name = "external-api"
    )
    public String callBankApi(String orderId, double amount) {
        logger.info("Calling Bank API for order: {}", orderId);
        
        // This would normally call the bank's external API
        String response = restTemplate.getForObject(
            "http://external-bank-api/charge?orderId=" + orderId + "&amount=" + amount,
            String.class
        );
        
        logger.info("Bank API response: {}", response);
        return response;
    }
    
    /**
     * Fallback method called when circuit breaker is OPEN or all retries fail
     * Must have same signature as original method + Exception parameter
     */
    public String bankApiFallback(String orderId, double amount, Exception ex) {
        logger.warn("Bank API fallback triggered for order: {}. Cause: {}", orderId, ex.getMessage());
        
        // Return graceful degradation response
        return "PENDING_MANUAL_REVIEW";
        
        // Alternative: retry later using message queue
        // messageQueue.send(new PaymentRetryMessage(orderId, amount));
        // return "QUEUED_FOR_RETRY";
    }
    
    /**
     * Example 2: PayPal API with Different Resilience Settings
     * 
     * PayPal has higher failure threshold since they're more reliable
     */
    @CircuitBreaker(
        name = "paypal-api",
        fallbackMethod = "paypalApiFallback"
    )
    @Retry(
        name = "transient-errors"
    )
    @Bulkhead(
        name = "external-services"
    )
    public String callPayPalApi(String transactionId, double amount) {
        logger.info("Calling PayPal API for transaction: {}", transactionId);
        
        String response = restTemplate.postForObject(
            "https://api.paypal.com/charge",
            new PayPalRequest(transactionId, amount),
            String.class
        );
        
        logger.info("PayPal API response: {}", response);
        return response;
    }
    
    public String paypalApiFallback(String transactionId, double amount, Exception ex) {
        logger.warn("PayPal API fallback for transaction: {}. Cause: {}", transactionId, ex.getMessage());
        return "PAYMENT_PENDING";
    }
    
    /**
     * Example 3: Database Query with Timeout + Retry
     * 
     * Database queries have shorter timeout and higher bulkhead limit
     */
    @CircuitBreaker(
        name = "database",
        fallbackMethod = "databaseFallback"
    )
    @Retry(
        name = "database-retry"
    )
    @Bulkhead(
        name = "database-ops"
    )
    @TimeLimiter(
        name = "database-query"
    )
    public String queryDatabase(String query) {
        logger.debug("Executing database query: {}", query);
        
        // Simulated database operation
        return "QUERY_RESULT";
    }
    
    public String databaseFallback(String query, Exception ex) {
        logger.error("Database query failed: {}. Error: {}", query, ex.getMessage());
        return "DATABASE_TEMPORARILY_UNAVAILABLE";
    }
    
    /**
     * Example 4: Async Call with CircuitBreaker and CompletableFuture
     * 
     * Useful for non-blocking async operations
     */
    @CircuitBreaker(
        name = "bank-api",
        fallbackMethod = "asyncBankApiFallback"
    )
    @Retry(
        name = "transient-errors"
    )
    public CompletableFuture<String> callBankApiAsync(String orderId, double amount) {
        logger.info("Calling Bank API asynchronously for order: {}", orderId);
        
        return CompletableFuture.supplyAsync(() ->
            restTemplate.getForObject(
                "http://external-bank-api/charge?orderId=" + orderId,
                String.class
            )
        );
    }
    
    public CompletableFuture<String> asyncBankApiFallback(
        String orderId, double amount, Exception ex
    ) {
        logger.warn("Async Bank API fallback for order: {}", orderId);
        return CompletableFuture.completedFuture("PENDING_ASYNC");
    }
    
    /**
     * Example 5: Monitoring Circuit Breaker State
     * 
     * Can be called from health check endpoints
     */
    public String getCircuitBreakerStatus(String circuitBreakerName) {
        // This would integrate with Resilience4j registry
        // CircuitBreakerRegistry registry = CircuitBreakerRegistry.ofDefaults();
        // CircuitBreaker circuitBreaker = registry.circuitBreaker(circuitBreakerName);
        // return circuitBreaker.getState().toString();
        
        return "CIRCUIT_BREAKER_INFO";
    }
    
    // Helper DTOs
    
    public static class PayPalRequest {
        private String transactionId;
        private double amount;
        
        public PayPalRequest(String transactionId, double amount) {
            this.transactionId = transactionId;
            this.amount = amount;
        }
        
        public String getTransactionId() { return transactionId; }
        public double getAmount() { return amount; }
    }
}

/**
 * USAGE EXAMPLES IN CONTROLLERS
 */
@org.springframework.web.bind.annotation.RestController
@org.springframework.web.bind.annotation.RequestMapping("/api/payments")
class PaymentController {
    
    private final ResilientExternalServiceClient externalClient;
    
    public PaymentController(ResilientExternalServiceClient externalClient) {
        this.externalClient = externalClient;
    }
    
    /**
     * Process payment with automatic resilience
     * 
     * Client calls: POST /api/payments/process
     * {
     *   "orderId": "ORDER-123",
     *   "amount": 100.00,
     *   "method": "BANK_TRANSFER"
     * }
     */
    @org.springframework.web.bind.annotation.PostMapping("/process")
    public org.springframework.http.ResponseEntity<?> processPayment(
        @org.springframework.web.bind.annotation.RequestBody PaymentRequest request
    ) {
        try {
            String result = externalClient.callBankApi(request.getOrderId(), request.getAmount());
            
            return org.springframework.http.ResponseEntity.ok(
                org.springframework.http.HttpStatus.OK
            );
        } catch (io.github.resilience4j.circuitbreaker.CallNotPermittedException ex) {
            // Circuit breaker is OPEN - service unavailable
            return org.springframework.http.ResponseEntity.status(
                org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE
            ).body("Service temporarily unavailable. Please try again later.");
        } catch (Exception ex) {
            return org.springframework.http.ResponseEntity.status(
                org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR
            ).body("Payment processing failed: " + ex.getMessage());
        }
    }
    
    public static class PaymentRequest {
        private String orderId;
        private double amount;
        private String method;
        
        public String getOrderId() { return orderId; }
        public void setOrderId(String orderId) { this.orderId = orderId; }
        
        public double getAmount() { return amount; }
        public void setAmount(double amount) { this.amount = amount; }
        
        public String getMethod() { return method; }
        public void setMethod(String method) { this.method = method; }
    }
}
