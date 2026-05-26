package com.bank.dto;

import lombok.Data;

@Data
public class PaymentUrlRequest {
    private String merchantId;      // Merchant ID
    private Double amount;
    private String currency;
    private String merchantOrderId; // Transaction ID
    private String merchantTimestamp;
    private String successUrl;      // URL for successful payment
    private String failedUrl;       // URL for failed payment
}