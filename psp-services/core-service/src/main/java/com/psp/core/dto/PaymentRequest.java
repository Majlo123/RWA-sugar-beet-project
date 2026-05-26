package com.psp.core.dto;

import jakarta.validation.constraints.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * PCI DSS 6.5 - Payment Request sa validacijom
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentRequest {
    
    @NotBlank(message = "Merchant ID is required")
    @Pattern(regexp = "^[a-zA-Z0-9\\-_]{3,50}$", message = "Invalid merchant ID format")
    private String merchantId;
    
    @NotBlank(message = "Merchant password is required")
    private String merchantPassword;
    
    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be positive")
    @DecimalMax(value = "999999999.99", message = "Amount too large")
    private Double amount;
    
    @NotBlank(message = "Currency is required")
    @Pattern(regexp = "^[A-Z]{3}$", message = "Currency must be 3-letter code")
    private String currency;
    
    @NotBlank(message = "Merchant order ID is required")
    @Pattern(regexp = "^[a-zA-Z0-9\\-_]{1,100}$", message = "Invalid order ID format")
    private String merchantOrderId;
    
    private String merchantTimestamp;
    
    @NotBlank(message = "Payment method is required")
    @Pattern(regexp = "^(BANK|CARD|PAYPAL|QR|CRYPTO)$", message = "Invalid payment method")
    private String paymentMethod;
    
    @Pattern(regexp = "^https?://.*", message = "Success URL must be valid HTTP(S) URL")
    private String successUrl;
    
    @Pattern(regexp = "^https?://.*", message = "Failed URL must be valid HTTP(S) URL")
    private String failedUrl;
    
    @Pattern(regexp = "^https?://.*", message = "Error URL must be valid HTTP(S) URL")
    private String errorUrl;
}