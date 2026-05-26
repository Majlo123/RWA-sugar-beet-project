package com.psp.core.security;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * PCI DSS 3.5 - AES-256-GCM enkripcija za osetljive podatke
 * Koristi se za enkripciju API ključeva, tokena i drugih osetljivih podataka
 */
public class AesEncryption {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 128;
    
    // Ključ se čita iz environment varijable ili koristi default za dev
    private static final String DEFAULT_KEY = "PCI_DSS_AES256_KEY_CHANGE_IN_PROD";
    
    private final SecretKeySpec secretKey;
    private final SecureRandom secureRandom;

    public AesEncryption() {
        this(getEncryptionKey());
    }

    public AesEncryption(String key) {
        // Osiguraj da ključ ima 32 bajta za AES-256
        byte[] keyBytes = padKey(key);
        this.secretKey = new SecretKeySpec(keyBytes, "AES");
        this.secureRandom = new SecureRandom();
    }

    private static String getEncryptionKey() {
        String envKey = System.getenv("PCI_ENCRYPTION_KEY");
        return envKey != null && !envKey.isEmpty() ? envKey : DEFAULT_KEY;
    }

    private byte[] padKey(String key) {
        byte[] keyBytes = new byte[32];
        byte[] originalBytes = key.getBytes(StandardCharsets.UTF_8);
        System.arraycopy(originalBytes, 0, keyBytes, 0, Math.min(originalBytes.length, 32));
        return keyBytes;
    }

    /**
     * Enkriptuje plaintext koristeći AES-256-GCM
     * @param plaintext Tekst za enkripciju
     * @return Base64 enkodiran string (IV + ciphertext + auth tag)
     */
    public String encrypt(String plaintext) {
        if (plaintext == null || plaintext.isEmpty()) {
            return null;
        }
        
        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, parameterSpec);

            byte[] cipherText = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

            // Kombinuj IV i ciphertext
            byte[] encrypted = new byte[iv.length + cipherText.length];
            System.arraycopy(iv, 0, encrypted, 0, iv.length);
            System.arraycopy(cipherText, 0, encrypted, iv.length, cipherText.length);

            return Base64.getEncoder().encodeToString(encrypted);
        } catch (Exception e) {
            throw new RuntimeException("Encryption failed", e);
        }
    }

    /**
     * Dekriptuje ciphertext enkriptovan sa encrypt() metodom
     * @param encryptedText Base64 enkodiran enkriptovani string
     * @return Dekriptovan plaintext
     */
    public String decrypt(String encryptedText) {
        if (encryptedText == null || encryptedText.isEmpty()) {
            return null;
        }
        
        try {
            byte[] decoded = Base64.getDecoder().decode(encryptedText);

            // Ekstrakuj IV
            byte[] iv = new byte[GCM_IV_LENGTH];
            System.arraycopy(decoded, 0, iv, 0, iv.length);

            // Ekstrakuj ciphertext
            byte[] cipherText = new byte[decoded.length - iv.length];
            System.arraycopy(decoded, iv.length, cipherText, 0, cipherText.length);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, parameterSpec);

            return new String(cipher.doFinal(cipherText), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new RuntimeException("Decryption failed", e);
        }
    }
}
