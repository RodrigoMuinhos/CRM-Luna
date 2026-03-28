package br.lunavita.totemapi.controller;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.lunavita.totemapi.dto.GhlPatientWebhookDto;
import br.lunavita.totemapi.dto.GhlWebhookResult;
import br.lunavita.totemapi.service.GhlWebhookPatientService;

@RestController
@RequestMapping("/api/webhooks/ghl")
@CrossOrigin(origins = "*")
public class GhlWebhookPatientController {

    private static final Logger logger = LoggerFactory.getLogger(GhlWebhookPatientController.class);

    private final GhlWebhookPatientService ghlWebhookPatientService;

    @Value("${WEBHOOK_GHL_TOKEN:}")
    private String webhookToken;

    public GhlWebhookPatientController(GhlWebhookPatientService ghlWebhookPatientService) {
        this.ghlWebhookPatientService = ghlWebhookPatientService;
    }

    @PostMapping("/patients")
    public ResponseEntity<?> handleGhlPatientWebhook(
            @RequestHeader(value = "x-webhook-token", required = false) String token,
            @RequestBody GhlPatientWebhookDto payload) {

        logger.info("[GHL] Webhook recebido - contactId: {}, eventType: {}", 
                payload.getContactId(), payload.getEventType());

        if (webhookToken == null || webhookToken.isBlank() || token == null || !webhookToken.equals(token)) {
            logger.warn("[GHL] Token inválido ou ausente para webhook");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "success", false,
                    "message", "Invalid webhook token"));
        }

        // Validação: rejeitar templates não substituídos
        if (containsUnprocessedTemplate(payload.getFullName()) || 
            containsUnprocessedTemplate(payload.getEmail()) ||
            containsUnprocessedTemplate(payload.getPhone())) {
            logger.warn("[GHL] Template não processado detectado - name: {}, email: {}, phone: {}", 
                    payload.getFullName(), payload.getEmail(), payload.getPhone());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "success", false,
                    "message", "Dados contêm variáveis de template não substituídas. Verifique a configuração do webhook no GoHighLevel."));
        }

        try {
            GhlWebhookResult result = ghlWebhookPatientService.upsertPatient(payload);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "deduplicated", result.isDeduplicated(),
                    "patientId", result.getPatientId()));
        } catch (IllegalArgumentException e) {
            logger.warn("[GHL] Payload inválido: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "success", false,
                    "message", e.getMessage()));
        } catch (Exception e) {
            logger.error("[GHL] Erro ao processar webhook: {}", e.getMessage());
            logger.debug("[GHL] Stacktrace", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "message", "Erro ao processar webhook"));
        }
    }

    /**
     * Verifica se uma string contém template variables não substituídas (ex: {{contact.name}})
     */
    private boolean containsUnprocessedTemplate(String value) {
        if (value == null || value.isBlank()) {
            return false;
        }
        // Detecta padrões como {{...}} ou {contact.xxx}
        return value.contains("{{") && value.contains("}}");
    }
}
