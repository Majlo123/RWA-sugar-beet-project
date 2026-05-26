package com.psp.core.security;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.regex.Pattern;

/**
 * PCI DSS 6.5 - Input validation and sanitization.
 */
public class PciDssValidator {

    private static final Pattern CVV_PATTERN = Pattern.compile("^\\d{3,4}$");
    private static final Pattern EXPIRY_PATTERN = Pattern.compile("^(0[1-9]|1[0-2])/?([0-9]{2})$");
    private static final Pattern CARD_HOLDER_PATTERN = Pattern.compile("^[a-zA-Z\\s\\-'.]{2,50}$");
    private static final Pattern MERCHANT_ID_PATTERN = Pattern.compile("^[a-zA-Z0-9\\-_]{3,50}$");
    private static final Pattern ORDER_ID_PATTERN = Pattern.compile("^[a-zA-Z0-9\\-_]{1,100}$");

    /**
     * Validate the CVV/CVC code.
     */
    public static ValidationResult validateCvv(String cvv) {
        if (cvv == null || cvv.isEmpty()) {
            return ValidationResult.invalid("CVV is required");
        }
        if (!CVV_PATTERN.matcher(cvv).matches()) {
            return ValidationResult.invalid("INVALID_CVV");
        }
        return ValidationResult.valid();
    }

    /**
     * Validate the card expiry date.
     */
    public static ValidationResult validateExpiryDate(String expiry) {
        if (expiry == null || expiry.isEmpty()) {
            return ValidationResult.invalid("Expiry date is required");
        }

        if (!EXPIRY_PATTERN.matcher(expiry).matches()) {
            return ValidationResult.invalid("INVALID_EXPIRY_FORMAT");
        }

        try {
            String cleanExpiry = expiry.replace("/", "");
            int month = Integer.parseInt(cleanExpiry.substring(0, 2));
            int year = 2000 + Integer.parseInt(cleanExpiry.substring(2, 4));

            YearMonth cardExpiry = YearMonth.of(year, month);
            YearMonth now = YearMonth.now();

            if (cardExpiry.isBefore(now)) {
                return ValidationResult.invalid("EXPIRED_CARD");
            }

            return ValidationResult.valid();
        } catch (DateTimeParseException | NumberFormatException e) {
            return ValidationResult.invalid("INVALID_EXPIRY_FORMAT");
        }
    }

    /**
     * Validate PAN using the Luhn algorithm.
     */
    public static ValidationResult validatePan(String pan) {
        if (pan == null || pan.isEmpty()) {
            return ValidationResult.invalid("Card number is required");
        }

        String cleanPan = pan.replaceAll("[\\s-]", "");

        if (!cleanPan.matches("\\d{13,19}")) {
            return ValidationResult.invalid("INVALID_PAN_FORMAT");
        }

        if (!PanMasker.isValidPan(cleanPan)) {
            return ValidationResult.invalid("LUHN_CHECK_FAILED");
        }

        return ValidationResult.valid();
    }

    /**
     * Validate the cardholder's name.
     */
    public static ValidationResult validateCardHolder(String cardHolder) {
        if (cardHolder == null || cardHolder.trim().isEmpty()) {
            return ValidationResult.invalid("Card holder name is required");
        }

        if (!CARD_HOLDER_PATTERN.matcher(cardHolder).matches()) {
            return ValidationResult.invalid("INVALID_CARD_HOLDER");
        }

        return ValidationResult.valid();
    }

    /**
     * Validate the merchant ID.
     */
    public static ValidationResult validateMerchantId(String merchantId) {
        if (merchantId == null || merchantId.isEmpty()) {
            return ValidationResult.invalid("Merchant ID is required");
        }

        if (!MERCHANT_ID_PATTERN.matcher(merchantId).matches()) {
            return ValidationResult.invalid("INVALID_MERCHANT_ID");
        }

        return ValidationResult.valid();
    }

    /**
     * Validate the order ID.
     */
    public static ValidationResult validateOrderId(String orderId) {
        if (orderId == null || orderId.isEmpty()) {
            return ValidationResult.invalid("Order ID is required");
        }

        if (!ORDER_ID_PATTERN.matcher(orderId).matches()) {
            return ValidationResult.invalid("INVALID_ORDER_ID");
        }

        return ValidationResult.valid();
    }

    /**
     * Sanitize a string for safe logging.
     */
    public static String sanitizeForLogging(String input) {
        if (input == null) return null;

        // Mask any PAN numbers.
        String sanitized = PanMasker.maskAllInText(input);

        // Strip potential CVV values (3-4 digits surrounded by spaces).
        sanitized = sanitized.replaceAll("\\b\\d{3,4}\\b", "***");

        return sanitized;
    }

    /**
     * Full validation of card data.
     */
    public static ValidationResult validateCardData(String pan, String expiry, String cvv, String cardHolder) {
        ValidationResult panResult = validatePan(pan);
        if (!panResult.isValid()) return panResult;

        ValidationResult expiryResult = validateExpiryDate(expiry);
        if (!expiryResult.isValid()) return expiryResult;

        ValidationResult cvvResult = validateCvv(cvv);
        if (!cvvResult.isValid()) return cvvResult;

        if (cardHolder != null && !cardHolder.isEmpty()) {
            ValidationResult holderResult = validateCardHolder(cardHolder);
            if (!holderResult.isValid()) return holderResult;
        }

        return ValidationResult.valid();
    }

    /**
     * Validation result.
     */
    public static class ValidationResult {
        private final boolean valid;
        private final String errorCode;

        private ValidationResult(boolean valid, String errorCode) {
            this.valid = valid;
            this.errorCode = errorCode;
        }

        public static ValidationResult valid() {
            return new ValidationResult(true, null);
        }

        public static ValidationResult invalid(String errorCode) {
            return new ValidationResult(false, errorCode);
        }

        public boolean isValid() {
            return valid;
        }

        public String getErrorCode() {
            return errorCode;
        }
    }
}
