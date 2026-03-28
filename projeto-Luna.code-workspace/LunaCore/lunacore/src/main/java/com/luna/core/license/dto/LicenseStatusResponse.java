package com.luna.core.license.dto;

import com.luna.core.common.enums.LicenseStatus;

import java.util.List;

public record LicenseStatusResponse(
        LicenseStatus status,
        boolean activated,
        String tenantId,
        List<String> modules
) {}
