package com.psp.crypto.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.psp.crypto.dto.CryptoPaymentRequest;
import com.psp.crypto.dto.CryptoPaymentResponse;
import com.psp.crypto.model.CryptoTransaction;
import com.psp.crypto.repository.CryptoTransactionRepository;
import org.bitcoinj.core.ECKey;
import org.bitcoinj.core.NetworkParameters;
import org.bitcoinj.params.TestNet3Params;
import org.bitcoinj.core.Address;
import org.bitcoinj.core.LegacyAddress;
import org.web3j.crypto.Keys;
import org.web3j.crypto.Credentials;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
public class CryptoService {

    private final RestTemplate restTemplate;
    private final CryptoTransactionRepository repository;
    private final ObjectMapper mapper = new ObjectMapper();

    @Value("${crypto.rate-url}")
    private String rateUrl;

    @Value("${crypto.default-vs:usd}")
    private String defaultVs;

    @Value("${crypto.network:testnet}")
    private String network;

    @Value("${core.update-method-url}")
    private String coreUpdateMethodUrl;

    @Value("${core.update-status-url}")
    private String coreUpdateStatusUrl;

    public CryptoService(RestTemplate restTemplate, CryptoTransactionRepository repository) {
        this.restTemplate = restTemplate;
        this.repository = repository;
    }

    public void updateTxHash(String address, String txHash) {
        CryptoTransaction transaction = repository.findByBtcAddress(address)
                .orElseThrow(() -> new RuntimeException("Transaction not found"));

        transaction.setTxHash(txHash);
        repository.save(transaction);
    }

    public CryptoPaymentResponse createPayment(CryptoPaymentRequest request) {
        // 1) Update Core with payment method
        updateCoreMethod(request.getPspTransactionId());

        // 2) Determine crypto type (default to POL on Polygon for faster, cheaper confirmations)
        String cryptoType = request.getCryptoType() == null || request.getCryptoType().trim().isEmpty()
                ? "POL" : request.getCryptoType().trim().toUpperCase();

        // 3) Route to appropriate crypto handler
        if ("BTC".equals(cryptoType)) {
            return createBitcoinPayment(request);
        } else if ("POL".equals(cryptoType)) {
            return createPolygonPayment(request);
        } else {
            throw new RuntimeException("Unsupported crypto type: " + cryptoType + ". Use BTC or POL.");
        }
    }

    private CryptoPaymentResponse createBitcoinPayment(CryptoPaymentRequest request) {
        // 1) Fetch BTC rates
        Rates rates = fetchRates("bitcoin");

        // 2) Convert fiat to BTC (fallback to USD rate)
        double btcAmount = convertToCrypto(request.getAmount(), request.getCurrency(), rates);

        // 3) Generate testnet address and private key (demo only)
        NetworkParameters params = TestNet3Params.get();
        ECKey key = new ECKey();
        // Generate P2PKH legacy address for testnet (bitcoinj v0.16.3)
        String address = LegacyAddress.fromKey(params, key).toBase58();
        String wif = key.getPrivateKeyAsWiF(params);

        // 4) Build QR data
        String qrData = "bitcoin:" + address + "?amount=" + formatCrypto(btcAmount);

        // 5) Save transaction to MongoDB
        CryptoTransaction transaction = new CryptoTransaction();
        transaction.setPspTransactionId(request.getPspTransactionId());
        transaction.setMerchantOrderId(request.getMerchantOrderId());
        transaction.setFiatAmount(request.getAmount());
        transaction.setFiatCurrency(request.getCurrency());
        transaction.setBtcAddress(address);
        transaction.setBtcAmount(btcAmount);
        transaction.setNetwork("testnet");
        transaction.setStatus("PENDING");
        transaction.setConfirmations(0);
        transaction.setCreatedAt(LocalDateTime.now());
        repository.save(transaction);

        // 6) Persist status as PENDING (core)
        notifyCoreStatus(request.getMerchantOrderId(), "PENDING", null, "CRYPTO_PENDING");

        return new CryptoPaymentResponse(
                address,
                wif,
                btcAmount,
                request.getAmount(),
                request.getCurrency(),
                rates.usd,
                rates.eur,
                "testnet",
                "BTC",
                qrData
        );
    }

    private CryptoPaymentResponse createPolygonPayment(CryptoPaymentRequest request) {
        try {
            // 1) Fetch POL rates
            Rates rates = fetchRates("matic-network");

            // 2) Convert fiat to POL
            double polAmount = convertToCrypto(request.getAmount(), request.getCurrency(), rates);

            // 3) Generate Polygon address (EVM-compatible, same format as Ethereum)
            Credentials credentials = Credentials.create(Keys.createEcKeyPair());
            String address = credentials.getAddress();
            String privateKey = credentials.getEcKeyPair().getPrivateKey().toString(16);

            // 4) Build QR data (EIP-681 format, Polygon PoS chainId 137)
            String qrData = "ethereum:" + address + "@137?value=" + formatCrypto(polAmount * 1e18); // Wei

            // 5) Save transaction to MongoDB
            CryptoTransaction transaction = new CryptoTransaction();
            transaction.setPspTransactionId(request.getPspTransactionId());
            transaction.setMerchantOrderId(request.getMerchantOrderId());
            transaction.setFiatAmount(request.getAmount());
            transaction.setFiatCurrency(request.getCurrency());
            transaction.setBtcAddress(address); // Reuse field for the Polygon address
            transaction.setBtcAmount(polAmount);
            transaction.setNetwork("polygon");
            transaction.setStatus("PENDING");
            transaction.setConfirmations(0);
            transaction.setCreatedAt(LocalDateTime.now());
            repository.save(transaction);

            // 6) Persist status as PENDING (core)
            notifyCoreStatus(request.getMerchantOrderId(), "PENDING", null, "CRYPTO_PENDING");

            return new CryptoPaymentResponse(
                    address,
                    "0x" + privateKey,
                    polAmount,
                    request.getAmount(),
                    request.getCurrency(),
                    rates.usd,
                    rates.eur,
                    "polygon",
                    "POL",
                    qrData
            );
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate Polygon address: " + e.getMessage());
        }
    }

    private Rates fetchRates(String crypto) {
        try {
            String json = restTemplate.getForObject(rateUrl, String.class);
            JsonNode root = mapper.readTree(json).path(crypto);
            double usd = root.path("usd").asDouble();
            double eur = root.path("eur").asDouble();
            return new Rates(usd, eur);
        } catch (Exception e) {
            throw new RuntimeException("Failed to fetch " + crypto + " rates: " + e.getMessage());
        }
    }

    private double convertToCrypto(double amount, String currency, Rates rates) {
        if (amount <= 0) {
            throw new RuntimeException("Amount must be positive");
        }
        String code = currency == null ? "USD" : currency.trim().toUpperCase();
        double rate;
        
        // Handle RSD conversion (approx 117 RSD = 1 EUR)
        if ("RSD".equals(code)) {
            double amountInEur = amount / 117.0;
            rate = rates.eur;
            return roundCrypto(amountInEur / rate);
        }

        switch (code) {
            case "EUR":
                rate = rates.eur;
                break;
            case "USD":
                rate = rates.usd;
                break;
            default:
                rate = rates.usd; // fallback
        }
        if (rate <= 0) {
            throw new RuntimeException("Invalid crypto rate");
        }
        return roundCrypto(amount / rate);
    }

    private double roundCrypto(double value) {
        return BigDecimal.valueOf(value).setScale(8, RoundingMode.HALF_UP).doubleValue();
    }

    private String formatCrypto(double value) {
        return String.format("%.8f", value);
    }

    private void updateCoreMethod(Long pspTransactionId) {
        try {
            Map<String, String> req = new HashMap<>();
            req.put("method", "CRYPTO");
            restTemplate.put(coreUpdateMethodUrl + pspTransactionId, req);
        } catch (Exception e) {
            // log only
            System.err.println("⚠️ CORE update method failed: " + e.getMessage());
        }
    }

    private void notifyCoreStatus(String merchantOrderId, String status, String paymentId, String reason) {
        try {
            Map<String, Object> statusUpdate = new HashMap<>();
            statusUpdate.put("status", status);
            statusUpdate.put("reason", reason != null ? reason : "CRYPTO_" + status);
            statusUpdate.put("globalTransactionId", paymentId);
            restTemplate.put(coreUpdateStatusUrl + merchantOrderId, statusUpdate);
        } catch (Exception e) {
            System.err.println("⚠️ CORE status notify failed: " + e.getMessage());
        }
    }

    private record Rates(double usd, double eur) {}
}
