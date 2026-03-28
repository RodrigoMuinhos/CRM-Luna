package com.luna.core.config;

import com.luna.core.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpMethod;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.firewall.HttpFirewall;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import com.luna.core.proxy.config.TotemApiProperties;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public HttpFirewall httpFirewall() {
        // Completely permissive HttpFirewall for dev - allows any request
        return new HttpFirewall() {
            @Override
            public org.springframework.security.web.firewall.FirewalledRequest getFirewalledRequest(jakarta.servlet.http.HttpServletRequest request) {
                // Return the original request without any validation
                return new org.springframework.security.web.firewall.FirewalledRequest(request) {
                    @Override
                    public void reset() {
                        // No-op reset
                    }
                };
            }

            @Override
            public jakarta.servlet.http.HttpServletResponse getFirewalledResponse(jakarta.servlet.http.HttpServletResponse response) {
                return response;
            }
        };
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .securityContext(context -> context.requireExplicitSave(false))
                .cors(Customizer.withDefaults())
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                    .requestMatchers(
                        // canonical endpoints
                        "/api/auth/**",
                        // legacy compatibility - deprecated, will be removed in future
                        "/auth/**",
                        "/license/status",
                        "/license/activate",
                        "/v3/api-docs/**",
                        "/swagger-ui/**",
                        "/swagger-ui.html",
                        "/actuator/**",
                        "/error",
                        "/debug/**"
                    ).permitAll()
                    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                    // Endpoints proxy - requerem autenticação
                    .requestMatchers("/api/patients/**", "/api/doctors/**", "/api/appointments/**").authenticated()
                    .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // Configuração global de CORS para liberar o frontend (localhost:3000)
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        // TotemUI pode rodar via localhost, 127.0.0.1 (Docker/healthcheck), kiosk (Electron) e também via Vercel.
        // Em produção (Vercel -> Railway via proxy), o backend recebe o Origin do Vercel.
        config.setAllowedOriginPatterns(getAllowedOriginPatterns());
        config.setAllowedMethods(java.util.List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(java.util.List.of("Authorization", "Content-Type", "Origin", "Accept", "X-Requested-With"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    /**
     * Lista de origins (patterns) permitidas via CORS.
     *
     * Opcionalmente configurável por env var: LUNA_CORS_ALLOWED_ORIGIN_PATTERNS
     * Exemplo:
     *   https://luna-kiosk.vercel.app,https://*.vercel.app,http://localhost:3000
     */
    private static List<String> getAllowedOriginPatterns() {
        String raw = System.getenv("LUNA_CORS_ALLOWED_ORIGIN_PATTERNS");
        if (raw != null && !raw.isBlank()) {
            List<String> patterns = new ArrayList<>();
            Arrays.stream(raw.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .forEach(patterns::add);
            if (!patterns.isEmpty()) {
                return patterns;
            }
        }

        return List.of(
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:19007",
                "http://127.0.0.1:19007",
                // Vercel (prod e previews). Se você usar domínio custom, adicione via env var.
                "https://*.vercel.app"
        );
    }

    @Bean
    public org.springframework.web.client.RestTemplate restTemplate(RestTemplateBuilder builder, TotemApiProperties totemApiProperties) {
        return builder
                .setConnectTimeout(totemApiProperties.getConnectTimeout())
                .setReadTimeout(totemApiProperties.getReadTimeout())
                .build();
    }
}
