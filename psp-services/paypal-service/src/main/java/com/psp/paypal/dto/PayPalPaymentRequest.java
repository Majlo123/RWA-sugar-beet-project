package com.psp.paypal.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PayPalPaymentRequest {
    private Long pspTransactionId;      // ID transakcije u Core servisu
    private String merchantOrderId;      // ID za identifikaciju
    private Double amount;
    private String currency;
    private String merchantTimestamp;
}
