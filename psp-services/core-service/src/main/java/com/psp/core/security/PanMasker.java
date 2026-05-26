package com.psp.core.security;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * PCI DSS 3.4 - Masking of the Primary Account Number (PAN).
 * Shows only the first 6 and last 4 digits; the rest is masked with '*'.
 */
public class PanMasker {

    private static final Pattern PAN_PATTERN = Pattern.compile("\\b(\\d{13,19})\\b");
    private static final Pattern MASKED_PATTERN = Pattern.compile("\\d{6}\\*+\\d{4}");

    /**
     * Mask a PAN according to the PCI DSS standard.
     * Example: 4111111111111111 -> 411111******1111
     */
    public static String mask(String pan) {
        if (pan == null || pan.isEmpty()) {
            return pan;
        }

        // Strip spaces and dashes.
        String cleanPan = pan.replaceAll("[\\s-]", "");

        if (cleanPan.length() < 13) {
            return "****";
        }

        String first6 = cleanPan.substring(0, 6);
        String last4 = cleanPan.substring(cleanPan.length() - 4);
        int middleLength = cleanPan.length() - 10;

        return first6 + "*".repeat(middleLength) + last4;
    }

    /**
     * Mask every PAN-looking number found in the text.
     */
    public static String maskAllInText(String text) {
        if (text == null || text.isEmpty()) {
            return text;
        }

        Matcher matcher = PAN_PATTERN.matcher(text);
        StringBuilder result = new StringBuilder();

        while (matcher.find()) {
            String pan = matcher.group(1);
            String masked = mask(pan);
            matcher.appendReplacement(result, masked);
        }
        matcher.appendTail(result);

        return result.toString();
    }

    /**
     * Return true if the string is already masked.
     */
    public static boolean isMasked(String value) {
        if (value == null) return false;
        return MASKED_PATTERN.matcher(value).matches();
    }

    /**
     * Validate PAN format (Luhn check).
     */
    public static boolean isValidPan(String pan) {
        if (pan == null || pan.isEmpty()) {
            return false;
        }

        String cleanPan = pan.replaceAll("[\\s-]", "");
        
        if (!cleanPan.matches("\\d{13,19}")) {
            return false;
        }

        return luhnCheck(cleanPan);
    }

    private static boolean luhnCheck(String pan) {
        int sum = 0;
        boolean alternate = false;

        for (int i = pan.length() - 1; i >= 0; i--) {
            int digit = Character.getNumericValue(pan.charAt(i));

            if (alternate) {
                digit *= 2;
                if (digit > 9) {
                    digit = (digit % 10) + 1;
                }
            }

            sum += digit;
            alternate = !alternate;
        }

        return (sum % 10 == 0);
    }

    /**
     * Extract the BIN (first 6 digits) for bank identification.
     */
    public static String extractBin(String pan) {
        if (pan == null || pan.length() < 6) {
            return null;
        }
        return pan.replaceAll("[\\s-]", "").substring(0, 6);
    }

    /**
     * Return the card type based on the BIN.
     */
    public static String getCardType(String pan) {
        if (pan == null) return "UNKNOWN";
        
        String cleanPan = pan.replaceAll("[\\s-]", "");
        
        if (cleanPan.startsWith("4")) {
            return "VISA";
        } else if (cleanPan.startsWith("5") || cleanPan.startsWith("2")) {
            return "MASTERCARD";
        } else if (cleanPan.startsWith("9")) {
            return "DINA";
        } else if (cleanPan.startsWith("34") || cleanPan.startsWith("37")) {
            return "AMEX";
        }
        
        return "UNKNOWN";
    }
}
