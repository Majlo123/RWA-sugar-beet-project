package com.psp.core.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonProperty;

@Entity
@Table(name = "transactions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Podaci za autentifikaciju i osnovni detalji
    private String merchantId;
    private Double amount;
    private String currency;
    private String merchantOrderId;
    private LocalDateTime merchantTimestamp;
    
    // Statusi i metodi (CARD, QR, itd.)
    @JsonProperty("paymentMethod")
    private String paymentMethod;
    private String status; // CREATED, PAID, FAILED, ERROR
    private String reason; // Razlog odbijanja (npr. INVALID_CVV)
    
    // Bankarski podaci za praćenje
    private String stan; 
    private LocalDateTime pspTimestamp;
    private String globalTransactionId; 
    private LocalDateTime acquirerTimestamp;

    // OSETLJIVI PODACI - MORAJU BITI @Transient
    @Transient 
    private String cardHolder;
    
    @Transient
    private String pan;
    
    @Transient
    private String expiryDate;
    
    @Transient
    private String cvv;

    @Transient 
    private String merchantPassword;

    // URL-ovi za navigaciju
    private String successUrl;
    private String failedUrl;
    private String errorUrl;
}