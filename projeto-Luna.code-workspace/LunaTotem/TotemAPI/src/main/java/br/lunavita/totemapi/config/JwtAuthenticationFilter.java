package br.lunavita.totemapi.config;

import java.io.IOException;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import br.lunavita.totemapi.security.UserContext;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * JWT Authentication Filter for LunaTotem API.
 * Validates tokens issued by LunaCore.
 * Places UserContext in Spring SecurityContext for use in controllers.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private final JwtUtil jwtUtil;

    public JwtAuthenticationFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        String header = request.getHeader(HttpHeaders.AUTHORIZATION);

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            Claims claims = jwtUtil.getClaims(token);

            if (jwtUtil.isValid(claims)) {
                String userId = claims.getSubject();
                String tenantId = claims.get("tenantId", String.class);
                String role = claims.get("role", String.class);
                List<String> modules = jwtUtil.getModules(claims);

                if (role == null || role.isBlank()) {
                    filterChain.doFilter(request, response);
                    return;
                }

                // Create UserContext with all claims
                UserContext userContext = new UserContext(userId, tenantId, role, modules);

                // Set up Spring Security authentication
                List<GrantedAuthority> authorities = List.of(
                        new SimpleGrantedAuthority("ROLE_" + role));

                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(userContext, null,
                        authorities);

                SecurityContextHolder.getContext().setAuthentication(auth);
            } else {
                logger.debug("Ignoring invalid or expired bearer token for {}", request.getRequestURI());
            }
        }

        filterChain.doFilter(request, response);
    }
}
