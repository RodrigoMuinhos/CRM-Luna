package com.luna.core.user.dto;

public record UserResponse(
        String id,
        String email,
        String cpf,
        String role,
        String createdAt,
        String updatedAt
) {
}
