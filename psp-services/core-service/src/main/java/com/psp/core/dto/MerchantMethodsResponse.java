package com.psp.core.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.util.List;

@Data
@AllArgsConstructor
public class MerchantMethodsResponse {
    private String merchantId;
    private List<String> paymentMethods;
    private String successUrl;
    private String failedUrl;
    private String errorUrl;
}
