package br.lunavita.totemapi.controller;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.lunavita.totemapi.model.User;
import br.lunavita.totemapi.service.AuthService;

@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasAnyRole('ADMINISTRACAO', 'OWNER', 'ADMIN', 'FINANCE')")
public class UserManagementController {

    private final AuthService authService;

    public UserManagementController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping
    public List<UserResponse> getUsers() {
        return authService.listUsers()
                .stream()
                .map(UserResponse::from)
                .collect(Collectors.toList());
    }

    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody UserRequest request) {
        try {
            validateRequest(request, true);
            User.UserRole role = parseRole(request.role());
            User user = authService.register(request.email(), request.cpf(), request.password(), role);
            return ResponseEntity.ok(UserResponse.from(user));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody UserRequest request) {
        try {
            validateRequest(request, false);
            User.UserRole role = parseRole(request.role());
            User user = authService.updateUser(id, request.email(), request.cpf(), role, request.password());
            return ResponseEntity.ok(UserResponse.from(user));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        try {
            authService.deleteUser(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private void validateRequest(UserRequest request, boolean passwordRequired) {
        if (request.email() == null || request.email().isBlank()) {
            throw new RuntimeException("Informe o email.");
        }
        if (passwordRequired && (request.password() == null || request.password().isBlank())) {
            throw new RuntimeException("Defina uma senha temporária.");
        }
    }

    private User.UserRole parseRole(String role) {
        if (role == null || role.isBlank()) {
            return User.UserRole.RECEPCAO;
        }
        return User.UserRole.valueOf(role.toUpperCase());
    }

    public record UserRequest(String email, String cpf, String password, String role) {
    }

    public record UserResponse(Long id, String email, String cpf, String role, LocalDateTime createdAt,
            LocalDateTime updatedAt) {
        public static UserResponse from(User user) {
            return new UserResponse(
                    user.getId(),
                    user.getEmail(),
                    user.getCpf(),
                    user.getRole().toString(),
                    user.getCreatedAt(),
                    user.getUpdatedAt());
        }
    }
}
