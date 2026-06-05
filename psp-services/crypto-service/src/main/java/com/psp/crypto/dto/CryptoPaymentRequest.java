package com.psp.crypto.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CryptoPaymentRequest {
    @NotNull
    private Long pspTransactionId;

    @NotBlank
    private String merchantOrderId;

    @NotNull
    @Min(0)
    private Double amount;

    @NotBlank
    private String currency; // fiat currency sent from web shop

    private String cryptoType; // "BTC" or "POL" (default: POL for faster, cheaper confirmations)

    private String merchantTimestamp;
}
