package com.luna.core.user.dto;

public record UserRequest(String email, String cpf, String role, String password) {
}
