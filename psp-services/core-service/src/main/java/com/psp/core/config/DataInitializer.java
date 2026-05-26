package com.psp.core.config;

import com.psp.core.model.Merchant;
import com.psp.core.model.User;
import com.psp.core.model.User.Role;
import com.psp.core.repository.MerchantRepository;
import com.psp.core.repository.UserRepository;
import com.psp.core.security.PasswordHasher;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Arrays;

/**
 * Data initializer for core service
 * Creates default Super Admin account and default merchant on startup
 * PCI DSS 8.1 - Default admin account creation
 */
@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private MerchantRepository merchantRepository;

    @Autowired
    private UserRepository userRepository;

    @Value("${admin.default.username:superadmin}")
    private String defaultAdminUsername;

    @Value("${admin.default.email:admin@psp.local}")
    private String defaultAdminEmail;

    @Value("${admin.default.password:Admin@123456}")
    private String defaultAdminPassword;

    // Default merchant settings
    @Value("${merchant.default.id:AGENCY_001}")
    private String defaultMerchantId;

    @Value("${merchant.default.password:MerchantPass123!}")
    private String defaultMerchantPassword;

    @Value("${merchant.default.name:Agencija za iznajmljivanje vozila}")
    private String defaultMerchantName;

    private final PasswordHasher passwordHasher = new PasswordHasher();

    @Override
    public void run(String... args) throws Exception {
        initializeSuperAdmin();
        initializeDefaultMerchant();
        
        System.out.println("--------------------------------------------");
        System.out.println("✅ PSP Core Service Started");
        System.out.println("📝 Register merchants at: POST /merchants/register");
        System.out.println("🔐 Auth endpoints at: POST /auth/login, /auth/register");
        System.out.println("👤 Default Super Admin: " + defaultAdminUsername);
        System.out.println("🏪 Default Merchant: " + defaultMerchantId);
        System.out.println("--------------------------------------------");
    }

    /**
     * Initialize default Super Admin account if not exists
     */
    private void initializeSuperAdmin() {
        if (!userRepository.existsByUsername(defaultAdminUsername)) {
            User superAdmin = new User();
            superAdmin.setUsername(defaultAdminUsername);
            superAdmin.setEmail(defaultAdminEmail);
            superAdmin.setPassword(passwordHasher.hash(defaultAdminPassword));
            superAdmin.setRole(Role.SUPER_ADMIN);
            superAdmin.setFirstName("Super");
            superAdmin.setLastName("Admin");
            superAdmin.setIsActive(true);
            superAdmin.setFailedLoginAttempts(0);
            
            userRepository.save(superAdmin);
            System.out.println("✅ Default Super Admin account created");
            System.out.println("   Username: " + defaultAdminUsername);
            System.out.println("   Email: " + defaultAdminEmail);
            System.out.println("   ⚠️ CHANGE PASSWORD IN PRODUCTION!");
        } else {
            System.out.println("✅ Super Admin account already exists");
        }
    }

    /**
     * Initialize default merchant (Car Rental Agency - Agencija za iznajmljivanje vozila)
     * This is the web shop that connects to PSP according to the specification
     */
    private void initializeDefaultMerchant() {
        if (!merchantRepository.existsById(defaultMerchantId)) {
            Merchant merchant = new Merchant();
            merchant.setMerchantId(defaultMerchantId);
            merchant.setMerchantPassword(passwordHasher.hash(defaultMerchantPassword));
            merchant.setName(defaultMerchantName);
            // Subscribe to all 4 payment methods by default
            merchant.setPaymentMethods(Arrays.asList("CARD", "QR", "PAYPAL", "CRYPTO"));
            merchant.setSuccessUrl("https://localhost/success");
            merchant.setFailedUrl("https://localhost/failed");
            merchant.setErrorUrl("https://localhost/error");
            merchant.setCreatedAt(Instant.now());
            merchant.setUpdatedAt(Instant.now());
            merchant.setIsActive(true);
            merchant.setFailedAuthAttempts(0);
            
            merchantRepository.save(merchant);
            System.out.println("✅ Default Merchant created (Agencija za iznajmljivanje vozila)");
            System.out.println("   Merchant ID: " + defaultMerchantId);
            System.out.println("   Merchant Password: " + defaultMerchantPassword);
            System.out.println("   Payment Methods: CARD, QR, PAYPAL, CRYPTO");
            System.out.println("   ⚠️ CHANGE PASSWORD IN PRODUCTION!");
        } else {
            System.out.println("✅ Default Merchant already exists: " + defaultMerchantId);
        }
    }
}