package com.psp.core.service;

import com.psp.core.dto.MerchantMethodsResponse;
import com.psp.core.dto.MerchantUpdateRequest;
import com.psp.core.model.AuditLog.AuditActionType;
import com.psp.core.model.AuditLog.AuditOutcome;
import com.psp.core.model.Merchant;
import com.psp.core.repository.MerchantRepository;
import com.psp.core.security.PasswordHasher;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * PCI DSS 8 - Servis za upravljanje merchantima sa sigurnim rukovanjem kredencijalima
 */
@Service
@Transactional
public class MerchantService {

    @Autowired
    private MerchantRepository merchantRepository;

    @Autowired
    private AuditService auditService;

    private final PasswordHasher passwordHasher = new PasswordHasher();

    /**
     * Registruje novog merchanta sa heširanom lozinkom
     */
    public Merchant registerMerchant(Merchant merchant) {
        // Generiši ID ako nije dat
        if (merchant.getMerchantId() == null || merchant.getMerchantId().isEmpty()) {
            merchant.setMerchantId(UUID.randomUUID().toString());
        }

        // Generiši i heširaj lozinku
        String rawPassword;
        if (merchant.getMerchantPassword() == null || merchant.getMerchantPassword().isEmpty()) {
            rawPassword = UUID.randomUUID().toString().replace("-", "");
        } else {
            rawPassword = merchant.getMerchantPassword();
        }

        // PCI DSS 8.2.1 - Heširaj lozinku pre čuvanja
        String hashedPassword = passwordHasher.hash(rawPassword);
        merchant.setMerchantPassword(hashedPassword);

        List<String> methods = ensureAtLeastOne(merchant.getPaymentMethods());
        merchant.setPaymentMethods(methods);
        hydrateUrlsIfMissing(merchant);

        Merchant saved = merchantRepository.save(merchant);

        // Audit log
        auditService.log(AuditActionType.MERCHANT_REGISTERED, "SYSTEM",
            saved.getMerchantId(), "MERCHANT", AuditOutcome.SUCCESS,
            "Payment methods: " + methods);

        // VAŽNO: Vrati original password u response-u samo jednom
        // Kreiraj kopiju za response sa originalnom lozinkom
        Merchant response = new Merchant();
        response.setMerchantId(saved.getMerchantId());
        response.setMerchantPassword(rawPassword); // Vrati plaintext samo u response
        response.setName(saved.getName());
        response.setPaymentMethods(saved.getPaymentMethods());
        response.setSuccessUrl(saved.getSuccessUrl());
        response.setFailedUrl(saved.getFailedUrl());
        response.setErrorUrl(saved.getErrorUrl());
        response.setCreatedAt(saved.getCreatedAt());
        response.setIsActive(saved.getIsActive());

        return response;
    }

    /**
     * Ažurira pretplatu merchanta
     */
    public Merchant updateMerchantSubscription(String merchantId, MerchantUpdateRequest request) {
        Merchant merchant = merchantRepository.findById(merchantId)
                .orElseThrow(() -> new RuntimeException("Merchant not found"));

        String oldMethods = merchant.getPaymentMethods().toString();
        merchant.setPaymentMethods(ensureAtLeastOne(request.getPaymentMethods()));
        merchant.setSuccessUrl(request.getSuccessUrl());
        merchant.setFailedUrl(request.getFailedUrl());
        merchant.setErrorUrl(request.getErrorUrl());

        Merchant saved = merchantRepository.save(merchant);

        // Audit log
        auditService.log(AuditActionType.MERCHANT_SUBSCRIPTION_CHANGED, merchantId,
            merchantId, "MERCHANT", AuditOutcome.SUCCESS,
            String.format("Methods: %s -> %s", oldMethods, saved.getPaymentMethods()));

        // Ne vraćaj lozinku u response
        saved.setMerchantPassword("[PROTECTED]");
        return saved;
    }

    /**
     * Vraća merchanta (bez lozinke)
     */
    @Transactional(readOnly = true)
    public Merchant getMerchant(String merchantId) {
        Merchant merchant = merchantRepository.findById(merchantId)
                .orElseThrow(() -> new RuntimeException("Merchant not found"));

        // Audit log
        auditService.log(AuditActionType.MERCHANT_VIEWED, "SYSTEM",
            merchantId, "MERCHANT", AuditOutcome.SUCCESS, null);

        // Ne vraćaj lozinku
        merchant.setMerchantPassword("[PROTECTED]");
        return merchant;
    }

    /**
     * Vraća metode plaćanja za merchanta
     */
    @Transactional(readOnly = true)
    public MerchantMethodsResponse getMerchantMethods(String merchantId) {
        Merchant merchant = merchantRepository.findById(merchantId)
                .orElseThrow(() -> new RuntimeException("Merchant not found"));
        
        return new MerchantMethodsResponse(
                merchant.getMerchantId(),
                merchant.getPaymentMethods(),
                merchant.getSuccessUrl(),
                merchant.getFailedUrl(),
                merchant.getErrorUrl()
        );
    }

    /**
     * PCI DSS 8.2 - Autentifikacija merchanta sa heširanjem
     */
    public Optional<Merchant> authenticateMerchant(String merchantId, String password) {
        Optional<Merchant> merchantOpt = merchantRepository.findById(merchantId);
        
        if (merchantOpt.isEmpty()) {
            auditService.log(AuditActionType.LOGIN_FAILURE, merchantId,
                merchantId, "MERCHANT", AuditOutcome.FAILURE, "Merchant not found");
            return Optional.empty();
        }

        Merchant merchant = merchantOpt.get();

        // Proveri da li je nalog zaključan
        if (merchant.isCurrentlyLocked()) {
            auditService.log(AuditActionType.LOGIN_FAILURE, merchantId,
                merchantId, "MERCHANT", AuditOutcome.ACCESS_DENIED, "Account locked");
            return Optional.empty();
        }

        // Proveri da li je nalog aktivan
        if (merchant.getIsActive() != null && !merchant.getIsActive()) {
            auditService.log(AuditActionType.LOGIN_FAILURE, merchantId,
                merchantId, "MERCHANT", AuditOutcome.ACCESS_DENIED, "Account inactive");
            return Optional.empty();
        }

        // Verifikuj lozinku
        boolean isValid = passwordHasher.verify(password, merchant.getMerchantPassword());

        if (!isValid) {
            merchant.incrementFailedAttempts();
            merchantRepository.save(merchant);
            
            auditService.log(AuditActionType.LOGIN_FAILURE, merchantId,
                merchantId, "MERCHANT", AuditOutcome.FAILURE, 
                "Invalid password. Attempts: " + merchant.getFailedAuthAttempts());
            
            return Optional.empty();
        }

        // Uspešna autentifikacija
        merchant.resetFailedAttempts();
        merchantRepository.save(merchant);

        auditService.log(AuditActionType.LOGIN_SUCCESS, merchantId,
            merchantId, "MERCHANT", AuditOutcome.SUCCESS, null);

        return Optional.of(merchant);
    }

    /**
     * Menja lozinku merchanta
     */
    public boolean changePassword(String merchantId, String oldPassword, String newPassword) {
        Optional<Merchant> authResult = authenticateMerchant(merchantId, oldPassword);
        
        if (authResult.isEmpty()) {
            return false;
        }

        Merchant merchant = merchantRepository.findById(merchantId).orElseThrow();
        merchant.setMerchantPassword(passwordHasher.hash(newPassword));
        merchantRepository.save(merchant);

        auditService.log(AuditActionType.MERCHANT_UPDATED, merchantId,
            merchantId, "MERCHANT", AuditOutcome.SUCCESS, "Password changed");

        return true;
    }

    private List<String> ensureAtLeastOne(List<String> paymentMethods) {
        if (paymentMethods == null || paymentMethods.isEmpty()) {
            throw new RuntimeException("At least one payment method must be enabled");
        }
        return paymentMethods;
    }

    private void hydrateUrlsIfMissing(Merchant merchant) {
        String baseUrl = System.getenv().getOrDefault("PSP_FRONTEND_URL", "https://localhost");
        if (merchant.getSuccessUrl() == null || merchant.getSuccessUrl().isBlank()) {
            merchant.setSuccessUrl(baseUrl + "/success");
        }
        if (merchant.getFailedUrl() == null || merchant.getFailedUrl().isBlank()) {
            merchant.setFailedUrl(baseUrl + "/failed");
        }
        if (merchant.getErrorUrl() == null || merchant.getErrorUrl().isBlank()) {
            merchant.setErrorUrl(baseUrl + "/error");
        }
    }
}
