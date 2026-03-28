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

import br.lunavita.totemapi.dto.GhlAppointmentWebhookDto;
import br.lunavita.totemapi.dto.GhlAppointmentWebhookResult;
import br.lunavita.totemapi.service.GhlWebhookAppointmentService;

@RestController
@RequestMapping("/api/webhooks/ghl")
@CrossOrigin(origins = "*")
public class GhlWebhookAppointmentController {

    private static final Logger logger = LoggerFactory.getLogger(GhlWebhookAppointmentController.class);

    private final GhlWebhookAppointmentService ghlWebhookAppointmentService;

    @Value("${WEBHOOK_GHL_TOKEN:}")
    private String webhookToken;

    public GhlWebhookAppointmentController(GhlWebhookAppointmentService ghlWebhookAppointmentService) {
        this.ghlWebhookAppointmentService = ghlWebhookAppointmentService;
    }

    @PostMapping("/appointments")
    public ResponseEntity<?> handleGhlAppointmentWebhook(
            @RequestHeader(value = "x-webhook-token", required = false) String token,
            @RequestBody GhlAppointmentWebhookDto payload) {

        logger.info("[GHL-APPOINTMENT] Webhook recebido - CPF: {}, Data: {}, Hora: {}", 
                maskCpf(payload.getCpf()), payload.getAppointmentDate(), payload.getAppointmentTime());

        // Validar token
        if (webhookToken == null || webhookToken.isBlank() || token == null || !webhookToken.equals(token)) {
            logger.warn("[GHL-APPOINTMENT] Token inválido ou ausente");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "status", "error",
                    "message", "Invalid webhook token"));
        }

        // Validação: rejeitar templates não substituídos
        if (containsUnprocessedTemplate(payload.getFullName()) || 
            containsUnprocessedTemplate(payload.getEmail()) ||
            containsUnprocessedTemplate(payload.getPhone()) ||
            containsUnprocessedTemplate(payload.getAppointmentDate()) ||
            containsUnprocessedTemplate(payload.getAppointmentTime())) {
            
            logger.warn("[GHL-APPOINTMENT] Template não processado detectado");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "status", "error",
                    "message", "Dados contêm variáveis de template não substituídas. Verifique a configuração do webhook no GoHighLevel."));
        }

        try {
            GhlAppointmentWebhookResult result = ghlWebhookAppointmentService.processAppointment(payload);

            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "status", "success",
                    "message", "Appointment created successfully",
                    "patientId", result.getPatientId(),
                    "appointmentId", result.getAppointmentId(),
                    "patientCreated", result.isPatientCreated()));
                    
        } catch (IllegalArgumentException e) {
            logger.warn("[GHL-APPOINTMENT] Payload inválido: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "status", "error",
                    "message", e.getMessage()));
                    
        } catch (Exception e) {
            logger.error("[GHL-APPOINTMENT] Erro ao processar webhook: {}", e.getMessage());
            logger.debug("[GHL-APPOINTMENT] Stacktrace", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "status", "error",
                    "message", "Erro ao processar webhook de consulta"));
        }
    }

    /**
     * Verifica se uma string contém template variables não substituídas (ex: {{contact.name}})
     */
    private boolean containsUnprocessedTemplate(String value) {
        if (value == null || value.isBlank()) {
            return false;
        }
        return value.contains("{{") && value.contains("}}");
    }

    /**
     * Mascara CPF para log (mostra apenas últimos 3 dígitos)
     */
    private String maskCpf(String cpf) {
        if (cpf == null || cpf.length() < 4) {
            return "***";
        }
        return "***" + cpf.substring(cpf.length() - 3);
    }
}
