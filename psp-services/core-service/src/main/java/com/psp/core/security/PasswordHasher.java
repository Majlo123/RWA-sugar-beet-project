package com.psp.core.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * PCI DSS 8.2.1 - Secure password hashing using SHA-256 with a salt.
 * Used for hashing merchant API keys.
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
     * Hash a password with a random salt.
     * @param password Password to hash
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
     * Verify a password against a hashed value.
     * @param password Password to check
     * @param storedHash Stored hash in salt:hash format
     * @return true if the passwords match
     */
    public boolean verify(String password, String storedHash) {
        if (password == null || storedHash == null) {
            return false;
        }

        // Check whether it is in the legacy format (plaintext).
        if (!storedHash.contains(SEPARATOR)) {
            // Legacy support - plaintext comparison.
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
            // If decoding fails, try plaintext comparison (legacy).
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
     * Return true if the string is already hashed.
     */
    public boolean isHashed(String value) {
        if (value == null) return false;
        return value.contains(SEPARATOR) && value.split(SEPARATOR).length == 2;
    }
}
