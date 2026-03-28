package br.lunavita.totemapi.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO para configuração de webhook de saída
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WebhookConfigDto {
    private Long id;
    private String webhookUrl;
    private String authToken;
    private String authHeaderName;
    private Boolean enabled;
    private String tenantId;
    private Integer timeoutSeconds;
}
