package com.bank.security;

import java.util.regex.Pattern;

/**
 * PCI DSS 3.4 - Maskiranje PAN brojeva (kopija iz core-service)
 */
public class PanMasker {

    private static final Pattern PAN_PATTERN = Pattern.compile("\\b(\\d{13,19})\\b");

    public static String mask(String pan) {
        if (pan == null || pan.isEmpty()) {
            return pan;
        }

        String cleanPan = pan.replaceAll("[\\s-]", "");

        if (cleanPan.length() < 13) {
            return "****";
        }

        String first6 = cleanPan.substring(0, 6);
        String last4 = cleanPan.substring(cleanPan.length() - 4);
        int middleLength = cleanPan.length() - 10;

        return first6 + "*".repeat(middleLength) + last4;
    }

    public static String maskAllInText(String text) {
        if (text == null || text.isEmpty()) {
            return text;
        }

        java.util.regex.Matcher matcher = PAN_PATTERN.matcher(text);
        StringBuilder result = new StringBuilder();

        while (matcher.find()) {
            String pan = matcher.group(1);
            String masked = mask(pan);
            matcher.appendReplacement(result, masked);
        }
        matcher.appendTail(result);

        return result.toString();
    }

    public static String getCardType(String pan) {
        if (pan == null) return "UNKNOWN";
        
        String cleanPan = pan.replaceAll("[\\s-]", "");
        
        if (cleanPan.startsWith("4")) {
            return "VISA";
        } else if (cleanPan.startsWith("5") || cleanPan.startsWith("2")) {
            return "MASTERCARD";
        } else if (cleanPan.startsWith("9")) {
            return "DINA";
        }
        
        return "UNKNOWN";
    }
}
