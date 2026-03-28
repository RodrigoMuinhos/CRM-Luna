package br.lunavita.totemapi.service;

import br.lunavita.totemapi.model.DataConsent;
import br.lunavita.totemapi.repository.DataConsentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Serviço para gerenciar consentimentos LGPD
 * Conformidade com LGPD Art. 7 e Art. 8
 */
@Service
public class DataConsentService {

    private static final Logger logger = LoggerFactory.getLogger(DataConsentService.class);

    private final DataConsentRepository dataConsentRepository;

    public DataConsentService(DataConsentRepository dataConsentRepository) {
        this.dataConsentRepository = dataConsentRepository;
    }

    /**
     * Registra consentimento do paciente
     */
    @Transactional
    public DataConsent grantConsent(String patientId, String consentType, String consentText,
            String ipAddress, String userAgent, Integer validityDays) {
        DataConsent consent = new DataConsent();
        consent.setPatientId(patientId);
        consent.setConsentType(consentType);
        consent.setConsentText(consentText);
        consent.setGranted(true);
        consent.setIpAddress(ipAddress);
        consent.setUserAgent(userAgent);
        consent.setGrantedAt(LocalDateTime.now());

        if (validityDays != null && validityDays > 0) {
            consent.setExpiresAt(LocalDateTime.now().plusDays(validityDays));
        }

        DataConsent saved = dataConsentRepository.save(consent);
        logger.info("[LGPD-CONSENT] Consent granted: patient={}, type={}", patientId, consentType);
        return saved;
    }

    /**
     * Revoga consentimento do paciente
     */
    @Transactional
    public void revokeConsent(Long consentId) {
        dataConsentRepository.findById(consentId).ifPresent(consent -> {
            consent.setGranted(false);
            consent.setRevokedAt(LocalDateTime.now());
            dataConsentRepository.save(consent);
            logger.info("[LGPD-CONSENT] Consent revoked: id={}, patient={}, type={}",
                    consentId, consent.getPatientId(), consent.getConsentType());
        });
    }

    /**
     * Verifica se paciente tem consentimento ativo
     */
    public boolean hasActiveConsent(String patientId, String consentType) {
        return dataConsentRepository
                .findActiveConsent(patientId, consentType, LocalDateTime.now())
                .isPresent();
    }

    /**
     * Lista todos os consentimentos do paciente
     */
    public List<DataConsent> getPatientConsents(String patientId) {
        return dataConsentRepository.findByPatientId(patientId);
    }

    /**
     * Obtém consentimento ativo do paciente
     */
    public DataConsent getActiveConsent(String patientId, String consentType) {
        return dataConsentRepository
                .findActiveConsent(patientId, consentType, LocalDateTime.now())
                .orElse(null);
    }

    // Tipos de consentimento padrão
    public static final String CONSENT_MEDICAL_CARE = "MEDICAL_CARE";
    public static final String CONSENT_DATA_SHARING = "DATA_SHARING";
    public static final String CONSENT_MARKETING = "MARKETING";
    public static final String CONSENT_RESEARCH = "RESEARCH";
}
