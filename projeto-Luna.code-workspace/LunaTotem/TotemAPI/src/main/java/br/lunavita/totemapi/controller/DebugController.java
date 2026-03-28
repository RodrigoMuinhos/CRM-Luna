package br.lunavita.totemapi.controller;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/debug")
@CrossOrigin(origins = "*")
public class DebugController {

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    /**
     * Gera hash bcrypt para uma senha
     * Exemplo: GET /api/debug/hash-password?password=admin123
     */
    @GetMapping("/hash-password")
    public Map<String, Object> hashPassword(@RequestParam String password) {
        String hash = encoder.encode(password);
        return Map.of(
                "password", password,
                "hash", hash,
                "note", "Use este hash no SQL INSERT");
    }

    /**
     * Gera script SQL completo com hashes
     */
    @GetMapping("/generate-sql")
    public String generateUsersSql() {
        BCryptPasswordEncoder enc = new BCryptPasswordEncoder();

        String[][] users = {
                { "adm@lunavita.com", "admin123", "ADMINISTRACAO" },
                { "recepcao@lunavita.com", "recepcao123", "RECEPCAO" },
                { "medico@lunavita.com", "medico123", "MEDICO" }
        };

        StringBuilder sql = new StringBuilder();
        sql.append("-- Script para inserir usuários de teste no Neon\n\n");

        for (String[] user : users) {
            String email = user[0];
            String password = user[1];
            String role = user[2];
            String hash = enc.encode(password);

            sql.append(
                    "INSERT INTO users (email, password, role, cpf, created_at, updated_at, refresh_token, refresh_token_expiry)\n");
            sql.append("VALUES (\n");
            sql.append("  '").append(email).append("',\n");
            sql.append("  '").append(hash).append("',\n");
            sql.append("  '").append(role).append("',\n");
            sql.append("  NULL,\n");
            sql.append("  NOW(),\n");
            sql.append("  NOW(),\n");
            sql.append("  NULL,\n");
            sql.append("  NULL\n");
            sql.append(");\n\n");
        }

        sql.append("-- Verificar usuários criados\n");
        sql.append("SELECT id, email, role, created_at FROM users ORDER BY id DESC;");

        return sql.toString();
    }

    /**
     * Verifica o token JWT atual e retorna informações de autenticação
     * Exemplo: GET /api/debug/me
     */
    @GetMapping("/me")
    public Map<String, Object> getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        Map<String, Object> result = new HashMap<>();
        result.put("isAuthenticated", auth != null && auth.isAuthenticated());

        if (auth != null && auth.isAuthenticated()) {
            result.put("principal", auth.getPrincipal());
            result.put("authorities", auth.getAuthorities());
            result.put("credentials", auth.getCredentials());
            result.put("name", auth.getName());
        } else {
            result.put("message", "Nenhum usuário autenticado");
        }

        return result;
    }
}
