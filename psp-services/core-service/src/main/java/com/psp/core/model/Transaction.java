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

    // Authentication data and core details.
    private String merchantId;
    private Double amount;
    private String currency;
    private String merchantOrderId;
    private LocalDateTime merchantTimestamp;

    // Statuses and methods (CARD, QR, etc.).
    @JsonProperty("paymentMethod")
    private String paymentMethod;
    private String status; // CREATED, PAID, FAILED, ERROR
    private String reason; // Reason for rejection (e.g., INVALID_CVV)

    // Banking trace data.
    private String stan;
    private LocalDateTime pspTimestamp;
    private String globalTransactionId;
    private LocalDateTime acquirerTimestamp;

    // SENSITIVE DATA - MUST BE @Transient.
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

    // Navigation URLs.
    private String successUrl;
    private String failedUrl;
    private String errorUrl;
}