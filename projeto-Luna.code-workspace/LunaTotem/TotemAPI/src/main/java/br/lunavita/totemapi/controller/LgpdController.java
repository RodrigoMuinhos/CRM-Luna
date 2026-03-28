package br.lunavita.totemapi.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.lunavita.totemapi.model.DataAccessLog;
import br.lunavita.totemapi.model.DataConsent;
import br.lunavita.totemapi.repository.DataAccessLogRepository;
import br.lunavita.totemapi.repository.DataConsentRepository;
import br.lunavita.totemapi.service.DataConsentService;
import jakarta.servlet.http.HttpServletRequest;

/**
 * Controller para gerenciamento de conformidade LGPD
 */
@RestController
@RequestMapping("/api/lgpd")
public class LgpdController {

    private final DataConsentService dataConsentService;
    private final DataConsentRepository dataConsentRepository;
    private final DataAccessLogRepository dataAccessLogRepository;

    public LgpdController(DataConsentService dataConsentService,
            DataConsentRepository dataConsentRepository,
            DataAccessLogRepository dataAccessLogRepository) {
        this.dataConsentService = dataConsentService;
        this.dataConsentRepository = dataConsentRepository;
        this.dataAccessLogRepository = dataAccessLogRepository;
    }

    /**
     * Registra consentimento do paciente
     */
    @PostMapping("/consent")
    public ResponseEntity<DataConsent> grantConsent(@RequestBody Map<String, Object> payload,
            HttpServletRequest request) {
        String patientId = (String) payload.get("patientId");
        String consentType = (String) payload.get("consentType");
        String consentText = (String) payload.get("consentText");
        Integer validityDays = (Integer) payload.getOrDefault("validityDays", 365);

        String ipAddress = request.getRemoteAddr();
        String userAgent = request.getHeader("User-Agent");

        DataConsent consent = dataConsentService.grantConsent(
                patientId, consentType, consentText, ipAddress, userAgent, validityDays);

        return ResponseEntity.ok(consent);
    }

    /**
     * Revoga consentimento
     */
    @PostMapping("/consent/{id}/revoke")
    public ResponseEntity<Map<String, String>> revokeConsent(@PathVariable Long id) {
        dataConsentService.revokeConsent(id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Consentimento revogado com sucesso");
        return ResponseEntity.ok(response);
    }

    /**
     * Lista consentimentos do paciente
     */
    @GetMapping("/consent/patient/{patientId}")
    public ResponseEntity<List<DataConsent>> getPatientConsents(@PathVariable String patientId) {
        List<DataConsent> consents = dataConsentService.getPatientConsents(patientId);
        return ResponseEntity.ok(consents);
    }

    /**
     * Verifica consentimento ativo
     */
    @GetMapping("/consent/check")
    public ResponseEntity<Map<String, Boolean>> checkConsent(
            @RequestParam String patientId,
            @RequestParam String consentType) {
        boolean hasConsent = dataConsentService.hasActiveConsent(patientId, consentType);
        Map<String, Boolean> response = new HashMap<>();
        response.put("hasActiveConsent", hasConsent);
        return ResponseEntity.ok(response);
    }

    /**
     * Lista logs de acesso do paciente (direito de portabilidade - LGPD Art. 18, V)
     */
    @GetMapping("/access-logs/patient/{patientId}")
    public ResponseEntity<Page<DataAccessLog>> getPatientAccessLogs(
            @PathVariable String patientId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<DataAccessLog> logs = dataAccessLogRepository.findByPatientId(
                patientId, PageRequest.of(page, size));
        return ResponseEntity.ok(logs);
    }

    /**
     * Relatório de acessos para administração (LGPD Art. 37)
     */
    @PreAuthorize("hasAnyAuthority('ADMINISTRACAO', 'ROLE_OWNER', 'ROLE_ADMIN', 'ROLE_FINANCE')")
    @GetMapping("/access-logs")
    public ResponseEntity<Page<DataAccessLog>> getAllAccessLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Page<DataAccessLog> logs = dataAccessLogRepository.findAll(PageRequest.of(page, size));
        return ResponseEntity.ok(logs);
    }

    /**
     * Retorna política de privacidade
     */
    @GetMapping("/privacy-policy")
    public ResponseEntity<Map<String, String>> getPrivacyPolicy() {
        Map<String, String> policy = new HashMap<>();
        policy.put("version", "1.0.0");
        policy.put("lastUpdated", "2025-12-06");
        policy.put("content", getPrivacyPolicyText());
        return ResponseEntity.ok(policy);
    }

    private String getPrivacyPolicyText() {
        return """
                POLÍTICA DE PRIVACIDADE E PROTEÇÃO DE DADOS

                1. COLETA DE DADOS
                Coletamos apenas dados necessários para prestação de serviços médicos e administrativos.

                2. FINALIDADE
                Os dados são utilizados exclusivamente para:
                - Agendamento e realização de consultas médicas
                - Processamento de pagamentos
                - Comunicação sobre consultas e serviços

                3. BASES LEGAIS (LGPD Art. 7)
                - Execução de contrato (prestação de serviços médicos)
                - Consentimento do titular
                - Cumprimento de obrigação legal

                4. SEUS DIREITOS (LGPD Art. 18)
                Você tem direito a:
                - Confirmação de tratamento de dados
                - Acesso aos seus dados
                - Correção de dados incompletos ou desatualizados
                - Anonimização, bloqueio ou eliminação de dados
                - Portabilidade dos dados
                - Revogação do consentimento

                5. SEGURANÇA
                - Criptografia de dados em trânsito (HTTPS/TLS)
                - Senhas com hash BCrypt
                - Controle de acesso baseado em funções
                - Logs de auditoria de todos os acessos

                6. RETENÇÃO DE DADOS
                Os dados são mantidos pelo período necessário para prestação dos serviços
                e cumprimento de obrigações legais (mínimo 20 anos para prontuários médicos - CFM).

                7. COMPARTILHAMENTO
                Dados não são compartilhados com terceiros, exceto:
                - Processadores de pagamento (com consentimento)
                - Autoridades legais (quando exigido por lei)

                8. CONTATO DO ENCARREGADO (DPO)
                Para exercer seus direitos, entre em contato: dpo@lunavita.com
                """;
    }
}
