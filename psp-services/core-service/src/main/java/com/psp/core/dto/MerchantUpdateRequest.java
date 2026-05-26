package com.psp.core.dto;

import lombok.Data;
import java.util.List;

@Data
public class MerchantUpdateRequest {
    private List<String> paymentMethods;
    private String successUrl;
    private String failedUrl;
    private String errorUrl;
}
