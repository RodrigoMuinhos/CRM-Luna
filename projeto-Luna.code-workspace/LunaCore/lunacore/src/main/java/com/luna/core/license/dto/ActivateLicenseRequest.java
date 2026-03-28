package com.luna.core.license.dto;

import jakarta.validation.constraints.NotBlank;

public record ActivateLicenseRequest(
        @NotBlank String productKey,
        @NotBlank String activationCode,
        @NotBlank String deviceId,
        String deviceName,
        String cnpj,
        String emailResponsavel
) {}
