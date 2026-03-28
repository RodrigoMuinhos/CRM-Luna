package br.lunavita.totemapi.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.Map;

/**
 * Webhook controller para receber notificações do Resend
 * Eventos: email.sent, email.delivered, email.failed, etc.
 */
@RestController
@RequestMapping("/api/webhooks")
public class WebhookController {

    private static final Logger logger = LoggerFactory.getLogger(WebhookController.class);

    @Value("${resend.webhook.secret:}")
    private String webhookSecret;

    @PostMapping("/resend")
    public ResponseEntity<?> handleResendWebhook(
            @RequestHeader(value = "svix-id", required = false) String svixId,
            @RequestHeader(value = "svix-timestamp", required = false) String svixTimestamp,
            @RequestHeader(value = "svix-signature", required = false) String svixSignature,
            @RequestBody Map<String, Object> payload) {

        logger.info("[WEBHOOK] 📬 Resend webhook recebido");

        // Verificar assinatura se secret configurado
        if (webhookSecret != null && !webhookSecret.isEmpty()) {
            // Aqui você pode implementar verificação de assinatura HMAC
            // Por enquanto, apenas logamos
            logger.debug("[WEBHOOK] Secret configurado, headers: svix-id={}", svixId);
        }

        // Extrair informações do payload
        String type = (String) payload.get("type");
        Map<String, Object> data = (Map<String, Object>) payload.get("data");

        if (type == null) {
            logger.warn("[WEBHOOK] ⚠️ Payload sem tipo de evento");
            return ResponseEntity.badRequest().body(Map.of("error", "Missing event type"));
        }

        // Processar diferentes tipos de eventos
        switch (type) {
            case "email.sent":
                handleEmailSent(data);
                break;
            case "email.delivered":
                handleEmailDelivered(data);
                break;
            case "email.delivery_delayed":
                handleEmailDelayed(data);
                break;
            case "email.complained":
                handleEmailComplained(data);
                break;
            case "email.bounced":
                handleEmailBounced(data);
                break;
            case "email.failed":
                handleEmailFailed(data);
                break;
            case "email.opened":
                handleEmailOpened(data);
                break;
            case "email.clicked":
                handleEmailClicked(data);
                break;
            default:
                logger.info("[WEBHOOK] 📧 Evento não tratado: {}", type);
        }

        return ResponseEntity.ok(Map.of("received", true));
    }

    private void handleEmailSent(Map<String, Object> data) {
        String emailId = (String) data.get("email_id");
        String to = extractTo(data);
        logger.info("[WEBHOOK] ✉️ Email ENVIADO - ID: {} | Para: {}", emailId, to);
    }

    private void handleEmailDelivered(Map<String, Object> data) {
        String emailId = (String) data.get("email_id");
        String to = extractTo(data);
        logger.info("[WEBHOOK] ✅ Email ENTREGUE - ID: {} | Para: {}", emailId, to);
    }

    private void handleEmailDelayed(Map<String, Object> data) {
        String emailId = (String) data.get("email_id");
        String to = extractTo(data);
        logger.warn("[WEBHOOK] ⏳ Email ATRASADO - ID: {} | Para: {}", emailId, to);
    }

    private void handleEmailComplained(Map<String, Object> data) {
        String emailId = (String) data.get("email_id");
        String to = extractTo(data);
        logger.warn("[WEBHOOK] 😤 Email marcado como SPAM - ID: {} | Para: {}", emailId, to);
    }

    private void handleEmailBounced(Map<String, Object> data) {
        String emailId = (String) data.get("email_id");
        String to = extractTo(data);
        logger.error("[WEBHOOK] 🔴 Email BOUNCED (rejeitado) - ID: {} | Para: {}", emailId, to);
    }

    private void handleEmailFailed(Map<String, Object> data) {
        String emailId = (String) data.get("email_id");
        String to = extractTo(data);
        logger.error("[WEBHOOK] ❌ Email FALHOU - ID: {} | Para: {}", emailId, to);
    }

    private void handleEmailOpened(Map<String, Object> data) {
        String emailId = (String) data.get("email_id");
        String to = extractTo(data);
        logger.info("[WEBHOOK] 👀 Email ABERTO - ID: {} | Para: {}", emailId, to);
    }

    private void handleEmailClicked(Map<String, Object> data) {
        String emailId = (String) data.get("email_id");
        String to = extractTo(data);
        logger.info("[WEBHOOK] 🖱️ Link CLICADO no email - ID: {} | Para: {}", emailId, to);
    }

    @SuppressWarnings("unchecked")
    private String extractTo(Map<String, Object> data) {
        Object to = data.get("to");
        if (to instanceof java.util.List) {
            java.util.List<String> toList = (java.util.List<String>) to;
            return toList.isEmpty() ? "desconhecido" : toList.get(0);
        }
        return to != null ? to.toString() : "desconhecido";
    }

    /**
     * Endpoint de teste para verificar se webhook está funcionando
     */
    @GetMapping("/resend/health")
    public ResponseEntity<?> webhookHealth() {
        return ResponseEntity.ok(Map.of(
                "status", "ok",
                "service", "resend-webhook",
                "timestamp", java.time.Instant.now().toString()));
    }
}
