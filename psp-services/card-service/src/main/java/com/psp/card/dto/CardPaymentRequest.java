package com.psp.card.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CardPaymentRequest {
    // Data sent by the PSP frontend to this service.
    private Double amount;
    private String currency;
    private String merchantOrderId; // Transaction ID (STAN)
    private String merchantTimestamp;

    // Added field on CardPaymentRequest.
    private Long pspTransactionId;

    // Getter/setter.
    public Long getPspTransactionId() { return pspTransactionId; }
    public void setPspTransactionId(Long pspTransactionId) { this.pspTransactionId = pspTransactionId; }
}