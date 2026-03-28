package br.lunavita.totemapi.controller;

import br.lunavita.totemapi.dto.CrmWebhookPayload;
import br.lunavita.totemapi.service.CrmIntegrationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controller para receber webhooks do CRM externo do cliente
 * Processa dados de contatos/leads e cria pacientes e consultas automaticamente
 */
@RestController
@RequestMapping("/api/webhooks/crm")
@CrossOrigin(origins = "*")
public class CrmWebhookController {

    private static final Logger logger = LoggerFactory.getLogger(CrmWebhookController.class);

    @Autowired
    private CrmIntegrationService crmIntegrationService;

    /**
     * Endpoint para receber dados do CRM
     * POST /api/webhooks/crm/contact
     */
    @PostMapping("/contact")
    public ResponseEntity<?> handleCrmWebhook(@RequestBody CrmWebhookPayload payload) {
        try {
            CrmWebhookPayload.CrmContactBody contact = payload.getBody();

            // Validar dados obrigatórios
            if (contact == null) {
                logger.warn("[CRM WEBHOOK] ⚠️ Body vazio");
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Body do webhook está vazio"));
            }

            String cpf = contact.getCpf();
            if (cpf == null || cpf.trim().isEmpty()) {
                logger.warn("[CRM WEBHOOK] ⚠️ CPF não informado");
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "CPF é obrigatório"));
            }

            String cleanCpf = cpf.replaceAll("[^0-9]", "");
            if (!isValidCpf(cleanCpf)) {
                logger.warn("[CRM WEBHOOK] ⚠️ CPF inválido: {}", maskCpf(cleanCpf));
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "CPF inválido"));
            }

            logger.info("[CRM WEBHOOK] 📥 Recebido webhook do CRM");
            logger.info("[CRM WEBHOOK] Contact ID: {}", contact.getContactId());
            logger.info("[CRM WEBHOOK] Nome: {}",
                    contact.getNomeCompleto() != null ? contact.getNomeCompleto() : contact.getFullName());
            logger.info("[CRM WEBHOOK] CPF: {}", maskCpf(cleanCpf));

            // Processar o webhook
            String patientId = crmIntegrationService.processWebhook(payload);

            logger.info("[CRM WEBHOOK] ✅ Paciente {} processado com sucesso - ID: {}", maskCpf(cleanCpf), patientId);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Webhook processado com sucesso",
                    "patientId", patientId));

        } catch (Exception e) {
            logger.error("[CRM WEBHOOK] ❌ Erro ao processar webhook: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Erro ao processar webhook: " + e.getMessage()));
        }
    }

    /**
     * Valida CPF usando o algoritmo de validação oficial
     */
    private boolean isValidCpf(String cpf) {
        // Remove formatação
        String clean = cpf.replaceAll("[^0-9]", "");

        // Verifica tamanho
        if (clean.length() != 11) {
            return false;
        }

        // Rejeita sequências repetidas (111.111.111-11, etc)
        if (clean.matches("(\\d)\\1{10}")) {
            return false;
        }

        // Calcula dígito verificador 1
        int sum = 0;
        for (int i = 0; i < 9; i++) {
            sum += Character.getNumericValue(clean.charAt(i)) * (10 - i);
        }
        int digit1 = 11 - (sum % 11);
        digit1 = digit1 >= 10 ? 0 : digit1;

        if (digit1 != Character.getNumericValue(clean.charAt(9))) {
            return false;
        }

        // Calcula dígito verificador 2
        sum = 0;
        for (int i = 0; i < 10; i++) {
            sum += Character.getNumericValue(clean.charAt(i)) * (11 - i);
        }
        int digit2 = 11 - (sum % 11);
        digit2 = digit2 >= 10 ? 0 : digit2;

        return digit2 == Character.getNumericValue(clean.charAt(10));
    }

    /**
     * Mascara CPF para logs (XXX.XXX.XXX-XX)
     */
    private String maskCpf(String cpf) {
        if (cpf == null || cpf.length() != 11) {
            return cpf;
        }
        return cpf.substring(0, 3) + "." + cpf.substring(3, 6) + "." + cpf.substring(6, 9) + "-" + cpf.substring(9, 11);
    }

    /**
     * Endpoint de teste para verificar se o webhook está funcionando
     * GET /api/webhooks/crm/test
     */
    @GetMapping("/test")
    public ResponseEntity<?> testWebhook() {
        return ResponseEntity.ok(Map.of(
                "status", "online",
                "message", "CRM Webhook endpoint está funcionando",
                "endpoint", "/api/webhooks/crm/contact"));
    }
}
