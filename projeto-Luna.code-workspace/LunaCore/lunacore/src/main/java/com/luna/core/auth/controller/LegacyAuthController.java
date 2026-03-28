package com.luna.core.auth.controller;

import com.luna.core.auth.dto.FirstAdminRequest;
import com.luna.core.auth.dto.LoginRequest;
import com.luna.core.auth.dto.LoginResponse;
import com.luna.core.auth.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Legacy Auth Controller - mantém compatibilidade com clients que ainda chamam /auth/**
 * Delegates to AuthService (the canonical API remains under /api/auth).
 * Deprecated: prefer /api/auth/**
 */
@RestController
// temporarily map to /auth-legacy to avoid duplicate mapping with existing /auth controller
@RequestMapping("/auth-legacy")
@RequiredArgsConstructor
@Deprecated
public class LegacyAuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody @Valid LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/first-admin")
    public ResponseEntity<Void> createFirstAdmin(@RequestBody @Valid FirstAdminRequest request) {
        authService.createFirstAdmin(request);
        return ResponseEntity.ok().build();
    }
}
