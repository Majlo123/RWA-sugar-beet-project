package com.psp.crypto.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CryptoPaymentResponse {
    private String address;          // Crypto address to pay to (BTC or ETH)
    private String privateKeyWif;    // WIF for BTC or hex for ETH (demo only; secure storage in prod)
    private double cryptoAmount;     // Amount in crypto (BTC or ETH)
    private double fiatAmount;       // Fiat amount requested
    private String fiatCurrency;     // Fiat currency code
    private double cryptoUsdRate;    // Crypto price in USD
    private double cryptoEurRate;    // Crypto price in EUR
    private String network;          // "testnet" (BTC) or "sepolia" (ETH)
    private String cryptoType;       // "BTC" or "ETH"
    private String qrData;           // URI for payment (bitcoin: or ethereum:)
}
