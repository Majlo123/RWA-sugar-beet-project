package com.psp.card.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CardPaymentRequest {
    // Podaci koje PSP Frontend šalje ovom servisu
    private Double amount;
    private String currency;
    private String merchantOrderId; // ID transakcije (STAN)
    private String merchantTimestamp;

    // Dodaj ovo polje u CardPaymentRequest
private Long pspTransactionId;

// I getter/setter
public Long getPspTransactionId() { return pspTransactionId; }
public void setPspTransactionId(Long pspTransactionId) { this.pspTransactionId = pspTransactionId; }
}