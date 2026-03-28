package br.lunavita.totemapi.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "Totem API",
                version = "v1",
                description = "API do Totem LunaVita"
        )
)
public class OpenApiConfig {
}
