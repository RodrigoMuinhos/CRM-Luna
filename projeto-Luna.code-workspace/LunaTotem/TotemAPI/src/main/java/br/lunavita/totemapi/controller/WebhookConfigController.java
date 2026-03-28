package br.lunavita.totemapi.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.lunavita.totemapi.dto.CheckInWebhookPayload;
import br.lunavita.totemapi.dto.WebhookConfigDto;
import br.lunavita.totemapi.service.WebhookConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Controller para gerenciar webhooks de saída (notificação de check-in)
 */
@RestController
@RequestMapping("/api/webhook-config")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class WebhookConfigController {

    private final WebhookConfigService webhookConfigService;

    /**
     * Busca configuração atual do webhook
     */
    @GetMapping
    public ResponseEntity<WebhookConfigDto> getConfig(
            @RequestParam(defaultValue = "default") String tenantId
    ) {
        return webhookConfigService.getConfig(tenantId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Salva/atualiza configuração do webhook
     */
    @PostMapping
    public ResponseEntity<WebhookConfigDto> saveConfig(
            @RequestBody WebhookConfigDto dto,
            @RequestHeader(value = "X-User-Email", required = false, defaultValue = "system") String userEmail
    ) {
        if (dto.getTenantId() == null || dto.getTenantId().isEmpty()) {
            dto.setTenantId("default");
        }
        
        WebhookConfigDto saved = webhookConfigService.saveConfig(dto, userEmail);
        return ResponseEntity.ok(saved);
    }

    /**
     * Testa configuração do webhook
     */
    @PostMapping("/test")
    public ResponseEntity<Map<String, Object>> testWebhook(
            @RequestParam(defaultValue = "default") String tenantId
    ) {
        log.info("Testando webhook para tenant: {}", tenantId);
        boolean success = webhookConfigService.testWebhook(tenantId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", success);
        response.put("message", success 
                ? "Webhook enviado com sucesso!" 
                : "Falha ao enviar webhook. Verifique a URL e tente novamente.");
        
        return ResponseEntity.ok(response);
    }

    /**
     * Endpoint para enviar notificação de check-in
     * Chamado pelo TotemUI após check-in completo
     */
    @PostMapping("/send-checkin")
    public ResponseEntity<Map<String, Object>> sendCheckIn(
            @RequestBody CheckInWebhookPayload payload
    ) {
        log.info("Recebendo solicitação de envio de webhook check-in para: {}", payload.getNomePaciente());
        
        String tenantId = payload.getTenantId() != null ? payload.getTenantId() : "default";
        boolean success = webhookConfigService.sendCheckInWebhook(payload, tenantId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", success);
        response.put("message", success 
                ? "Notificação enviada com sucesso" 
                : "Falha ao enviar notificação (check-in registrado normalmente)");
        
        return ResponseEntity.ok(response);
    }
}
