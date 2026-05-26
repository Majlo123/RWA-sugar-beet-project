package com.psp.core.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for Merchant API authentication request
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MerchantAuthRequest {
    
    private String merchantId;
    private String merchantPassword;
}
