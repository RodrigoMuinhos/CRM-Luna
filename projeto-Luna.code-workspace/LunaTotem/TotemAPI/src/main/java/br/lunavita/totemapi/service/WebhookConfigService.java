package br.lunavita.totemapi.service;

import java.util.Optional;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import br.lunavita.totemapi.dto.CheckInWebhookPayload;
import br.lunavita.totemapi.dto.WebhookConfigDto;
import br.lunavita.totemapi.model.WebhookConfig;
import br.lunavita.totemapi.repository.WebhookConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class WebhookConfigService {

    private final WebhookConfigRepository webhookConfigRepository;
    private final RestTemplate restTemplate;

    /**
     * Busca configuração de webhook por tenant
     */
    public Optional<WebhookConfigDto> getConfig(String tenantId) {
        return webhookConfigRepository.findByTenantId(tenantId)
                .map(this::toDto);
    }

    /**
     * Salva ou atualiza configuração de webhook
     */
    public WebhookConfigDto saveConfig(WebhookConfigDto dto, String updatedBy) {
        WebhookConfig config = webhookConfigRepository.findByTenantId(dto.getTenantId())
                .orElse(new WebhookConfig());

        config.setWebhookUrl(dto.getWebhookUrl());
        config.setAuthToken(dto.getAuthToken());
        config.setAuthHeaderName(dto.getAuthHeaderName());
        config.setEnabled(dto.getEnabled());
        config.setTenantId(dto.getTenantId());
        config.setTimeoutSeconds(dto.getTimeoutSeconds() != null ? dto.getTimeoutSeconds() : 10);
        config.setUpdatedBy(updatedBy);

        WebhookConfig saved = webhookConfigRepository.save(config);
        log.info("Webhook config saved for tenant: {} by user: {}", dto.getTenantId(), updatedBy);
        
        return toDto(saved);
    }

    /**
     * Dispara webhook de check-in para sistema externo
     */
    public boolean sendCheckInWebhook(CheckInWebhookPayload payload, String tenantId) {
        Optional<WebhookConfig> configOpt = webhookConfigRepository.findByTenantIdAndEnabledTrue(tenantId);
        
        if (configOpt.isEmpty()) {
            log.info("Webhook não configurado ou desabilitado para tenant: {}", tenantId);
            return true; // Não é erro, apenas não está configurado
        }

        WebhookConfig config = configOpt.get();
        
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            // Adiciona token de autenticação se configurado
            if (config.getAuthToken() != null && !config.getAuthToken().isEmpty()) {
                String headerName = config.getAuthHeaderName() != null && !config.getAuthHeaderName().isEmpty()
                        ? config.getAuthHeaderName()
                        : "Authorization";
                
                String headerValue = headerName.equalsIgnoreCase("Authorization")
                        ? "Bearer " + config.getAuthToken()
                        : config.getAuthToken();
                
                headers.add(headerName, headerValue);
            }

            HttpEntity<CheckInWebhookPayload> request = new HttpEntity<>(payload, headers);

            log.info("Enviando webhook check-in para: {}", config.getWebhookUrl());
            log.debug("Payload: {}", payload);

            ResponseEntity<String> response = restTemplate.postForEntity(
                    config.getWebhookUrl(),
                    request,
                    String.class
            );

            boolean success = response.getStatusCode().is2xxSuccessful();
            
            if (success) {
                log.info("Webhook enviado com sucesso. Status: {}", response.getStatusCode());
            } else {
                log.warn("Webhook retornou status não-sucesso: {}", response.getStatusCode());
            }
            
            return success;

        } catch (Exception e) {
            log.error("Erro ao enviar webhook para {}: {}", config.getWebhookUrl(), e.getMessage(), e);
            return false;
        }
    }

    /**
     * Testa configuração de webhook
     */
    public boolean testWebhook(String tenantId) {
        CheckInWebhookPayload testPayload = new CheckInWebhookPayload();
        testPayload.setNomePaciente("Teste Sistema");
        testPayload.setCpfPaciente("00000000000");
        testPayload.setNomeMedico("Dr. Teste");
        testPayload.setEspecialidade("Teste");
        testPayload.setHorarioAgendado("2026-01-20 10:00");
        testPayload.setHorarioConclusaoCheckin("2026-01-20 09:55");
        testPayload.setDataAgendamento("2026-01-20");
        testPayload.setHoraAgendamento("10:00");
        testPayload.setStatus("TESTE");
        testPayload.setTenantId(tenantId);

        return sendCheckInWebhook(testPayload, tenantId);
    }

    private WebhookConfigDto toDto(WebhookConfig entity) {
        WebhookConfigDto dto = new WebhookConfigDto();
        dto.setId(entity.getId());
        dto.setWebhookUrl(entity.getWebhookUrl());
        dto.setAuthToken(entity.getAuthToken());
        dto.setAuthHeaderName(entity.getAuthHeaderName());
        dto.setEnabled(entity.getEnabled());
        dto.setTenantId(entity.getTenantId());
        dto.setTimeoutSeconds(entity.getTimeoutSeconds());
        return dto;
    }
}
