package com.psp.core.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * PCI DSS 8.2.1 - Sigurno heširanje lozinki korišćenjem SHA-256 sa solju
 * Koristi se za heširanje merchant API ključeva
 */
public class PasswordHasher {

    private static final int SALT_LENGTH = 16;
    private static final String ALGORITHM = "SHA-256";
    private static final String SEPARATOR = ":";
    private final SecureRandom secureRandom;

    public PasswordHasher() {
        this.secureRandom = new SecureRandom();
    }

    /**
     * Hešira lozinku sa nasumičnom solju
     * @param password Lozinka za heširanje
     * @return Format: base64(salt):base64(hash)
     */
    public String hash(String password) {
        if (password == null || password.isEmpty()) {
            throw new IllegalArgumentException("Password cannot be null or empty");
        }

        byte[] salt = new byte[SALT_LENGTH];
        secureRandom.nextBytes(salt);

        byte[] hash = hashWithSalt(password, salt);

        String saltBase64 = Base64.getEncoder().encodeToString(salt);
        String hashBase64 = Base64.getEncoder().encodeToString(hash);

        return saltBase64 + SEPARATOR + hashBase64;
    }

    /**
     * Verifikuje lozinku protiv hešovane vrednosti
     * @param password Lozinka za proveru
     * @param storedHash Sačuvani heš u formatu salt:hash
     * @return true ako se lozinke poklapaju
     */
    public boolean verify(String password, String storedHash) {
        if (password == null || storedHash == null) {
            return false;
        }

        // Proveri da li je u starom formatu (plaintext)
        if (!storedHash.contains(SEPARATOR)) {
            // Legacy podrška - plaintext poređenje
            return password.equals(storedHash);
        }

        try {
            String[] parts = storedHash.split(SEPARATOR);
            if (parts.length != 2) {
                return false;
            }

            byte[] salt = Base64.getDecoder().decode(parts[0]);
            byte[] expectedHash = Base64.getDecoder().decode(parts[1]);
            byte[] actualHash = hashWithSalt(password, salt);

            return MessageDigest.isEqual(expectedHash, actualHash);
        } catch (IllegalArgumentException e) {
            // Ako dekodiranje ne uspe, probaj plaintext poređenje (legacy)
            return password.equals(storedHash);
        }
    }

    private byte[] hashWithSalt(String password, byte[] salt) {
        try {
            MessageDigest digest = MessageDigest.getInstance(ALGORITHM);
            digest.update(salt);
            return digest.digest(password.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Hash algorithm not available", e);
        }
    }

    /**
     * Proverava da li je string već hešovan
     */
    public boolean isHashed(String value) {
        if (value == null) return false;
        return value.contains(SEPARATOR) && value.split(SEPARATOR).length == 2;
    }
}
