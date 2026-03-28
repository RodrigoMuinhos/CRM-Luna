package br.lunavita.totemapi.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;

@Configuration
public class CorsConfig {

    // Default ALLOWED_ORIGINS includes the Vercel front-end and localhost for local
    // dev
    @Value("${ALLOWED_ORIGINS:https://lunavitatotem.vercel.app,http://localhost:3000}")
    private String allowedOrigins; // comma-separated list of origins

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true);

        // read allowed origins from ALLOWED_ORIGINS environment variable (comma
        // separated)
        // Example:
        // ALLOWED_ORIGINS=https://lunavitatotem.vercel.app,http://localhost:3000
        String[] origins = allowedOrigins.split(",");
        for (String origin : origins) {
            String o = origin.trim().replaceAll("/$", ""); // remove apenas barra final
            if (!o.isEmpty()) {
                config.addAllowedOrigin(o); // explicit origins only
            }
        }
        // Explicit headers to satisfy preflight with Authorization
        config.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"));
        config.setExposedHeaders(Arrays.asList("Authorization"));
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);

        return new CorsFilter(source);
    }
}
