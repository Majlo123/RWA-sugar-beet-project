package com.psp.paypal.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "paypal_transactions")
public class PayPalTransaction {
    @Id
    private String id;
    
    private Long pspTransactionId;
    private String merchantOrderId;
    private Double amount;
    private String currency;
    
    private String paypalPaymentId;      // PayPal internal payment ID
    private String paypalPayerId;         // PayPal user ID
    private String status;                // CREATED, APPROVED, COMPLETED, FAILED
    
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
    
    private String approvalUrl;           // URL za PayPal login
    private String errorMessage;
}
