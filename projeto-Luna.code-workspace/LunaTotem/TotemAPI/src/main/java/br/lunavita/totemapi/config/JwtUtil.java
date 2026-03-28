package br.lunavita.totemapi.config;

import java.util.Date;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

/**
 * JWT Utility for LunaTotem API.
 * This class ONLY validates tokens issued by LunaCore - it does NOT generate
 * tokens.
 * The secret must match the one used by LunaCore for signature verification.
 */
@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    /**
     * Extract claims from JWT token.
     * 
     * @param token JWT token string
     * @return Claims object or null if invalid
     */
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

    /**
     * Check if token is valid (signature + expiration).
     * 
     * @param token JWT token string
     * @return true if valid, false otherwise
     */
    public boolean isValid(String token) {
        Claims claims = getClaims(token);
        if (claims == null)
            return false;
        Date exp = claims.getExpiration();
        return exp != null && exp.after(new Date());
    }

    /**
     * Extract userId (subject) from token.
     * 
     * @param token JWT token string
     * @return userId or null
     */
    public String getUserId(String token) {
        Claims claims = getClaims(token);
        return claims != null ? claims.getSubject() : null;
    }

    /**
     * Extract tenantId from token.
     * 
     * @param token JWT token string
     * @return tenantId or null
     */
    public String getTenantId(String token) {
        Claims claims = getClaims(token);
        return claims != null ? (String) claims.get("tenantId") : null;
    }

    /**
     * Extract modules list from token.
     * 
     * @param token JWT token string
     * @return list of modules (empty if none)
     */
    @SuppressWarnings("unchecked")
    public List<String> getModules(String token) {
        Claims claims = getClaims(token);
        if (claims == null)
            return List.of();
        Object modulesObj = claims.get("modules");
        if (modulesObj instanceof List<?> list) {
            return list.stream().map(Object::toString).toList();
        }
        return List.of();
    }

    /**
     * Extract role from token.
     * 
     * @param token JWT token string
     * @return role or null
     */
    public String getRole(String token) {
        Claims claims = getClaims(token);
        return claims != null ? (String) claims.get("role") : null;
    }
}
