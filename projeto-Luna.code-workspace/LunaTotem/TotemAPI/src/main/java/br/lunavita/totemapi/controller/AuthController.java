package br.lunavita.totemapi.controller;

/*
 * ⚠️ DEPRECATED - Este controller foi desabilitado no Passo 4
 * 
 * A autenticação agora é feita pelo LunaCore API.
 * O LunaTotem apenas VALIDA tokens JWT emitidos pelo LunaCore.
 * 
 * Endpoints antigos:
 * - POST /api/auth/login    → Agora: POST LunaCore /auth/login
 * - POST /api/auth/register → Agora: POST LunaCore /auth/register
 * 
 * Este arquivo foi mantido apenas para referência histórica.
 * Pode ser removido no futuro.
 * 
 * Ver: JWT_AUTHENTICATION_README.md para detalhes
 */

import br.lunavita.totemapi.model.User;
import br.lunavita.totemapi.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

// ⚠️ DESABILITADO - Autenticação agora é no LunaCore
// @RestController
// @RequestMapping("/api/auth")
// @CrossOrigin(origins = "*", methods = { RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS })
class AuthController_DEPRECATED {

    private final AuthService authService;

    public AuthController_DEPRECATED(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @PreAuthorize("hasAnyRole('ADMINISTRACAO', 'OWNER', 'ADMIN', 'FINANCE')")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        try {
            User.UserRole role = User.UserRole.valueOf(request.role.toUpperCase());
            User user = authService.register(request.email, request.cpf, request.password, role);

            // String token = jwtUtil.generateToken(user.getEmail(), user.getRole().toString());
            String token = "DEPRECATED_USE_LUNACORE";
            return ResponseEntity.ok(Map.of(
                    "id", user.getId(),
                    "email", user.getEmail(),
                    "cpf", user.getCpf(),
                    "role", user.getRole().toString(),
                    "token", token,
                    "refreshToken", user.getRefreshToken()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            System.out.println("[AUTH] Login attempt: " + request.email);
            User user = authService.login(request.email, request.password);
            System.out.println("[AUTH] Login success for: " + request.email);

            // String token = jwtUtil.generateToken(user.getEmail(), user.getRole().toString());
            String token = "DEPRECATED_USE_LUNACORE";

            // Build response map manually to handle null values
            java.util.Map<String, Object> response = new java.util.HashMap<>();
            response.put("id", user.getId());
            response.put("email", user.getEmail());
            response.put("cpf", user.getCpf() != null ? user.getCpf() : "");
            response.put("role", user.getRole().toString());
            response.put("token", token);
            response.put("refreshToken", user.getRefreshToken() != null ? user.getRefreshToken() : "");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("[AUTH] Login failed: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        try {
            authService.requestPasswordReset(request.email, request.frontendUrl);
            return ResponseEntity.ok(Map.of("message", "Email de recuperação enviado com sucesso"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordRequest request) {
        try {
            authService.resetPassword(request.token, request.newPassword);
            return ResponseEntity.ok(Map.of("message", "Senha redefinida com sucesso"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/request-access")
    @PreAuthorize("hasAnyRole('ADMINISTRACAO', 'OWNER', 'ADMIN', 'FINANCE')")
    public ResponseEntity<?> requestAccess(@RequestBody AccessRequest request) {
        return ResponseEntity.status(403).body(Map.of("error", "Self-service access requests desativado"));
    }

    // DTOs
    static class RegisterRequest {
        public String email;
        public String password;
        public String cpf;
        public String role; // "RECEPCAO" ou "ADMINISTRACAO"
    }

    static class LoginRequest {
        public String email;
        public String password;
    }

    static class ForgotPasswordRequest {
        public String email;
        public String frontendUrl;
    }

    static class ResetPasswordRequest {
        public String token;
        public String newPassword;
    }

    static class AccessRequest {
        public String name;
        public String email;
        public String cpf;
        public String role;
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody RefreshRequest request) {
        try {
            User user = authService.validateAndRefresh(request.refreshToken);
            // String token = jwtUtil.generateToken(user.getEmail(), user.getRole().toString());
            String token = "DEPRECATED_USE_LUNACORE";
            return ResponseEntity.ok(Map.of(
                    "token", token,
                    "refreshToken", user.getRefreshToken()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    static class RefreshRequest {
        public String refreshToken;
    }
}
