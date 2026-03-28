package com.luna.core.security;

import com.luna.core.tenant.entity.Tenant;
import com.luna.core.user.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private Long expirationMs;

    public String generateToken(User user, Tenant tenant, List<String> modules) {
        Instant now = Instant.now();
        Date issuedAt = Date.from(now);
        Date exp = Date.from(now.plusMillis(expirationMs));

        Map<String, Object> claims = new HashMap<>();
        claims.put("tenantId", tenant.getId());
        claims.put("role", user.getRole().name());
        claims.put("modules", modules);

        return Jwts.builder()
                .subject(user.getId())
                .claims(claims)
                .issuedAt(issuedAt)
                .expiration(exp)
                .signWith(Keys.hmacShaKeyFor(secret.getBytes()))
                .compact();
    }

    public Claims getClaims(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(Keys.hmacShaKeyFor(secret.getBytes()))
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (JwtException e) {
            return null;
        }
    }

    public boolean isValid(String token) {
        Claims claims = getClaims(token);
        if (claims == null) return false;
        Date exp = claims.getExpiration();
        return exp != null && exp.after(new Date());
    }

    public String getUserId(String token) {
        Claims claims = getClaims(token);
        return claims != null ? claims.getSubject() : null;
    }

    public String getTenantId(String token) {
        Claims claims = getClaims(token);
        return claims != null ? (String) claims.get("tenantId") : null;
    }

    public String getRole(String token) {
        Claims claims = getClaims(token);
        return claims != null ? (String) claims.get("role") : null;
    }

    public List<String> getModules(String token) {
        Claims claims = getClaims(token);
        if (claims == null) return List.of();
        Object modulesObj = claims.get("modules");
        if (modulesObj instanceof List<?> list) {
            return list.stream().map(Object::toString).toList();
        }
        return List.of();
    }
}
