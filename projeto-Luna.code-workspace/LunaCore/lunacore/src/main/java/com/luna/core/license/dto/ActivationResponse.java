package com.luna.core.license.dto;

import java.util.List;

public record ActivationResponse(
        String tenantId,
        String licenseId,
        boolean requireFirstAdmin,
        List<String> modules
) {}
