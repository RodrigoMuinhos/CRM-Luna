package com.luna.core.auth.dto;

import java.util.List;

public record LoginResponse(
        String accessToken,
        String tokenType,
        Long expiresIn,
        String userId,
        String tenantId,
        String name,
        String email,
        String role,
        List<String> modules
) {}
