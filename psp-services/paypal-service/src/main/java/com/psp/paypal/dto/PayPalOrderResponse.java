package com.psp.paypal.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response DTO for PayPal Order Creation
 * Maps to PayPal Orders API v2 response structure
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PayPalOrderResponse {
    private String id;
    private String status;
    private List<Link> links;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Link {
        private String href;
        private String rel;
        private String method;
    }
}
