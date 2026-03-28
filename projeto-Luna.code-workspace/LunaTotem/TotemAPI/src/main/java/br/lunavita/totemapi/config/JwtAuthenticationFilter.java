package br.lunavita.totemapi.config;

import java.io.IOException;
import java.util.List;

import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import br.lunavita.totemapi.security.UserContext;
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

            if (jwtUtil.isValid(token)) {
                String userId = jwtUtil.getUserId(token);
                String tenantId = jwtUtil.getTenantId(token);
                String role = jwtUtil.getRole(token);
                List<String> modules = jwtUtil.getModules(token);


                // Create UserContext with all claims
                UserContext userContext = new UserContext(userId, tenantId, role, modules);

                // Set up Spring Security authentication
                List<GrantedAuthority> authorities = List.of(
                        new SimpleGrantedAuthority("ROLE_" + role));

                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(userContext, null,
                        authorities);

                SecurityContextHolder.getContext().setAuthentication(auth);

                System.out.println("[JWT FILTER] Authenticated: " + userContext);
            } else {
                System.err.println("[JWT FILTER] Invalid or expired token");
            }
        }

        filterChain.doFilter(request, response);
    }
}
