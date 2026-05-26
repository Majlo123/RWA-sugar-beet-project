package com.psp.core.security;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * PCI DSS 3.4 - Maskiranje Primary Account Number (PAN)
 * Prikazuje samo prvih 6 i poslednjih 4 cifre, ostalo maskira sa *
 */
public class PanMasker {

    private static final Pattern PAN_PATTERN = Pattern.compile("\\b(\\d{13,19})\\b");
    private static final Pattern MASKED_PATTERN = Pattern.compile("\\d{6}\\*+\\d{4}");

    /**
     * Maskira PAN prema PCI DSS standardu
     * Primer: 4111111111111111 -> 411111******1111
     */
    public static String mask(String pan) {
        if (pan == null || pan.isEmpty()) {
            return pan;
        }

        // Ukloni razmake i crtice
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
     * Maskira sve PAN brojeve u tekstu
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
     * Proverava da li je string već maskiran
     */
    public static boolean isMasked(String value) {
        if (value == null) return false;
        return MASKED_PATTERN.matcher(value).matches();
    }

    /**
     * Validira format PAN-a (Luhn check)
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
     * Ekstrakuje BIN (prvih 6 cifara) za identifikaciju banke
     */
    public static String extractBin(String pan) {
        if (pan == null || pan.length() < 6) {
            return null;
        }
        return pan.replaceAll("[\\s-]", "").substring(0, 6);
    }

    /**
     * Vraća tip kartice na osnovu BIN-a
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
