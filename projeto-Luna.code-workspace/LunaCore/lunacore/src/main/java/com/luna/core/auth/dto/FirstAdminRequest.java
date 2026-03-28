package com.luna.core.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record FirstAdminRequest(
        @NotBlank String tenantId,
        @NotBlank String name,
        @Email @NotBlank String email,
        @Size(min = 8, message = "Senha deve ter pelo menos 8 caracteres")
        String password
) {}
