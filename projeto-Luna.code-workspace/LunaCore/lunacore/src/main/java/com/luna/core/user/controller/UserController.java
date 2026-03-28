package com.luna.core.user.controller;

import com.luna.core.common.enums.UserRole;
import com.luna.core.common.enums.UserStatus;
import com.luna.core.tenant.entity.Tenant;
import com.luna.core.user.dto.UserRequest;
import com.luna.core.user.dto.UserResponse;
import com.luna.core.user.entity.User;
import com.luna.core.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER','ADMIN','FINANCE')")
    public List<UserResponse> list(Authentication authentication) {
        User currentUser = requireCurrentUser(authentication);
        Tenant tenant = currentUser.getTenant();
        return userRepository.findByTenant(tenant).stream()
                .map(this::toResponse)
                .toList();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER','ADMIN','FINANCE')")
    public ResponseEntity<UserResponse> create(@RequestBody UserRequest request, Authentication authentication) {
        User currentUser = requireCurrentUser(authentication);
        Tenant tenant = currentUser.getTenant();

        String email = normalizeEmail(request.email());
        String cpf = normalizeCpf(request.cpf());
        String role = normalizeRole(request.role());
        String password = normalizePassword(request.password());

        if (email == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "E-mail invalido");
        }
        if (cpf == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CPF invalido");
        }
        if (password == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Senha obrigatoria");
        }

        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "E-mail ja cadastrado");
        }
        if (userRepository.existsByTenantAndCpf(tenant, cpf)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "CPF ja cadastrado");
        }

        UserRole mappedRole = toUserRole(role);
        if (mappedRole == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Perfil invalido");
        }

        User user = User.builder()
                .tenant(tenant)
                .email(email)
                .name(deriveName(email))
                .cpf(cpf)
                .passwordHash(passwordEncoder.encode(password))
                .role(mappedRole)
                .status(UserStatus.ACTIVE)
                .build();

        User saved = userRepository.save(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(saved));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN','FINANCE')")
    public ResponseEntity<UserResponse> update(@PathVariable String id,
            @RequestBody UserRequest request,
            Authentication authentication) {
        User currentUser = requireCurrentUser(authentication);
        Tenant tenant = currentUser.getTenant();

        User existing = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario nao encontrado"));

        if (!existing.getTenant().getId().equals(tenant.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario nao encontrado");
        }

        String email = normalizeEmail(request.email());
        if (email == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "E-mail invalido");
        }
        if (!email.equalsIgnoreCase(existing.getEmail()) && userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "E-mail ja cadastrado");
        }

        String cpf = normalizeCpf(request.cpf());
        if (cpf == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CPF invalido");
        }
        if (!cpf.equals(existing.getCpf()) && userRepository.existsByTenantAndCpf(tenant, cpf)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "CPF ja cadastrado");
        }

        UserRole mappedRole = toUserRole(normalizeRole(request.role()));
        if (mappedRole == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Perfil invalido");
        }

        existing.setEmail(email);
        existing.setCpf(cpf);
        existing.setRole(mappedRole);

        String password = normalizePassword(request.password());
        if (password != null) {
            existing.setPasswordHash(passwordEncoder.encode(password));
        }

        User saved = userRepository.save(existing);
        return ResponseEntity.ok(toResponse(saved));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN','FINANCE')")
    public ResponseEntity<Void> delete(@PathVariable String id, Authentication authentication) {
        User currentUser = requireCurrentUser(authentication);
        Tenant tenant = currentUser.getTenant();

        if (currentUser.getId().equals(id)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nao e possivel excluir o proprio usuario");
        }

        User existing = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario nao encontrado"));
        if (!existing.getTenant().getId().equals(tenant.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario nao encontrado");
        }

        userRepository.delete(existing);
        return ResponseEntity.noContent().build();
    }

    private User requireCurrentUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Nao autenticado");
        }
        String userId = authentication.getName();
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario nao encontrado");
        }
        return user;
    }

    private static String normalizeEmail(String value) {
        if (value == null) return null;
        String trimmed = value.trim().toLowerCase();
        return trimmed.contains("@") ? trimmed : null;
    }

    private static String normalizeCpf(String value) {
        if (value == null) return null;
        String digits = value.replaceAll("\\D", "");
        if (digits.length() != 11) return null;
        return digits;
    }

    private static String normalizeRole(String value) {
        if (value == null) return null;
        String trimmed = value.trim().toUpperCase();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static String normalizePassword(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static UserRole toUserRole(String role) {
        if (role == null) return null;
        switch (role) {
            case "ADMINISTRACAO":
            case "ADMIN":
            case "OWNER":
            case "FINANCE":
            case "FINANCEIRO":
                return UserRole.ADMIN;
            case "RECEPCAO":
            case "RECEPTION":
                return UserRole.RECEPTION;
            case "MEDICO":
            case "DOCTOR":
                return UserRole.DOCTOR;
            default:
                return null;
        }
    }

    private UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getCpf() != null ? user.getCpf() : "",
                toUiRole(user.getRole()),
                user.getCreatedAt() != null ? user.getCreatedAt().toString() : null,
                user.getUpdatedAt() != null ? user.getUpdatedAt().toString() : null
        );
    }

    private static String toUiRole(UserRole role) {
        if (role == null) return null;
        return switch (role) {
            case OWNER, ADMIN, FINANCE -> "ADMINISTRACAO";
            case RECEPTION -> "RECEPCAO";
            case DOCTOR -> "MEDICO";
        };
    }

    private static String deriveName(String email) {
        if (email == null || email.isBlank()) {
            return "Usuario";
        }
        String local = email.split("@", 2)[0];
        String normalized = local.replace('.', ' ').replace('_', ' ').trim();
        return normalized.isBlank() ? "Usuario" : normalized;
    }
}
