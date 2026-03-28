package com.luna.core.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "LunaCore API",
                version = "v1",
                description = "Sistema Core de gestão de licenças e tenants para Luna"
        )
)
public class OpenApiConfig {
}
