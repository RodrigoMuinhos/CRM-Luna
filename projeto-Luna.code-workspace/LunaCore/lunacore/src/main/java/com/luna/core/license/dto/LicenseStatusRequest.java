package com.luna.core.license.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LicenseStatusRequest {
    @NotBlank(message = "Product key is required")
    private String productKey;

    @NotBlank(message = "Device ID is required")
    private String deviceId;
}
