package com.psp.crypto.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "crypto_transactions")
public class CryptoTransaction {
    @Id
    private String id;
    
    private Long pspTransactionId;
    private String merchantOrderId;
    private Double fiatAmount;
    private String fiatCurrency;
    
    private String btcAddress;
    private Double btcAmount;
    private String network; // testnet
    
    private String status; // PENDING, CONFIRMED, COMPLETED, FAILED
    private String txHash; // Bitcoin transaction hash
    private Integer confirmations;
    
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
}
