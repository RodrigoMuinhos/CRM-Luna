package com.luna.core.auth.controller;

import com.luna.core.auth.dto.LoginRequest;
import com.luna.core.auth.dto.LoginResponse;
import com.luna.core.auth.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * API Auth Controller - Expõe endpoints de autenticação sob /api/auth
 * (compatibilidade com frontend)
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class ApiAuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody @Valid LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }
}
