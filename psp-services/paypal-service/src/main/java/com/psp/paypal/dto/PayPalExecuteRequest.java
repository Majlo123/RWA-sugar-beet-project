package com.psp.paypal.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PayPalExecuteRequest {
    private String paymentId;
    private String payerId;
    private String merchantOrderId;
}
