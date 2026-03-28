package br.lunavita.totemapi.service;

import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.lunavita.totemapi.dto.GhlPatientNormalized;
import br.lunavita.totemapi.dto.GhlPatientWebhookDto;
import br.lunavita.totemapi.dto.GhlWebhookResult;
import br.lunavita.totemapi.model.Patient;
import br.lunavita.totemapi.model.WebhookAudit;
import br.lunavita.totemapi.repository.PatientRepository;
import br.lunavita.totemapi.repository.WebhookAuditRepository;
import br.lunavita.totemapi.util.EncryptionUtil;

@Service
public class GhlWebhookPatientService {

    private static final Logger logger = LoggerFactory.getLogger(GhlWebhookPatientService.class);

    private final PatientRepository patientRepository;
    private final WebhookAuditRepository webhookAuditRepository;
    private final GhlPatientNormalizer normalizer;

    public GhlWebhookPatientService(PatientRepository patientRepository,
                                    WebhookAuditRepository webhookAuditRepository,
                                    GhlPatientNormalizer normalizer) {
        this.patientRepository = patientRepository;
        this.webhookAuditRepository = webhookAuditRepository;
        this.normalizer = normalizer;
    }

    @Transactional
    public GhlWebhookResult upsertPatient(GhlPatientWebhookDto payload) {
        GhlPatientNormalized normalized = normalizer.normalize(payload);
        validateRequired(normalized);

        String dedupeKey = buildDedupeKey(normalized);
        if (webhookAuditRepository.existsByEventTypeAndMessage(normalized.getEventType(), dedupeKey)) {
            logger.info("[GHL] Evento já processado: {}", dedupeKey);
            return new GhlWebhookResult(resolveExistingPatientId(normalized), true);
        }

        Patient patient = findExistingPatient(normalized);
        boolean created = false;
        if (patient == null) {
            patient = new Patient();
            patient.setId(UUID.randomUUID().toString());
            created = true;
        }

        apply(normalized, patient);
        ensurePatientCompleteness(patient);

        Patient saved = patientRepository.save(patient);
        auditSuccess(normalized, dedupeKey);

        logger.info("[GHL] Paciente {} {} (tenant: {})",
                saved.getId(),
                created ? "criado" : "atualizado",
                saved.getTenantId());
        logger.debug("[GHL] Dados aplicados - cpf: {}, email: {}, phone: {}",
                EncryptionUtil.maskCpf(saved.getCpf()),
                EncryptionUtil.maskEmail(saved.getEmail()),
                EncryptionUtil.maskPhone(saved.getPhone()));

        return new GhlWebhookResult(saved.getId(), false);
    }

    private Patient findExistingPatient(GhlPatientNormalized normalized) {
        // Primeiro tenta por GHL contact id (com e sem tenant)
        if (normalized.getTenantId() != null && normalized.getGhlContactId() != null) {
            Optional<Patient> byTenantAndGhl = patientRepository.findByTenantIdAndGhlContactId(
                    normalized.getTenantId(), normalized.getGhlContactId());
            if (byTenantAndGhl.isPresent()) {
                return byTenantAndGhl.get();
            }
        }
        if (normalized.getGhlContactId() != null) {
            Optional<Patient> byGhl = patientRepository.findByGhlContactId(normalized.getGhlContactId());
            if (byGhl.isPresent()) {
                return byGhl.get();
            }
        }

        // Depois tenta por CPF (com e sem tenant)
        if (normalized.getTenantId() != null && normalized.getCpf() != null) {
            Optional<Patient> byTenantAndCpf = patientRepository.findByTenantIdAndCpf(
                    normalized.getTenantId(), normalized.getCpf());
            if (byTenantAndCpf.isPresent()) {
                return byTenantAndCpf.get();
            }
        }
        if (normalized.getCpf() != null) {
            Optional<Patient> byCpf = patientRepository.findByCpf(normalized.getCpf());
            if (byCpf.isPresent()) {
                return byCpf.get();
            }
        }

        return null;
    }

    private String resolveExistingPatientId(GhlPatientNormalized normalized) {
        Patient existing = findExistingPatient(normalized);
        return existing != null ? existing.getId() : null;
    }

    private void apply(GhlPatientNormalized normalized, Patient patient) {
        if (normalized.getTenantId() != null) {
            patient.setTenantId(normalized.getTenantId());
        }
        if (normalized.getName() != null) {
            patient.setName(normalized.getName());
        }
        if (normalized.getCpf() != null) {
            if (patient.getCpf() == null || patient.getCpf().equals(normalized.getCpf())) {
                patient.setCpf(normalized.getCpf());
            } else {
                logger.warn("[GHL] CPF recebido difere do armazenado. Mantendo CPF atual para paciente {}", patient.getId());
            }
        }
        if (normalized.getPhone() != null) {
            patient.setPhone(normalized.getPhone());
        }
        if (normalized.getEmail() != null) {
            patient.setEmail(normalized.getEmail());
        }
        if (normalized.getBirthDate() != null) {
            patient.setBirthDate(normalized.getBirthDate());
        }
        if (normalized.getNotes() != null) {
            patient.setNotes(normalized.getNotes());
        }
        if (normalized.getGhlContactId() != null) {
            patient.setGhlContactId(normalized.getGhlContactId());
        }
    }

    private void ensurePatientCompleteness(Patient patient) {
        // Se tenantId não fornecido, usa um tenant padrão para webhooks GHL
        if (isBlank(patient.getTenantId())) {
            patient.setTenantId("totem");
            logger.debug("[GHL] tenantId não fornecido, usando 'totem'");
        }
        if (isBlank(patient.getName())) {
            throw new IllegalArgumentException("Nome do paciente é obrigatório");
        }
        if (isBlank(patient.getCpf())) {
            throw new IllegalArgumentException("CPF é obrigatório");
        }
        if (isBlank(patient.getPhone())) {
            throw new IllegalArgumentException("Telefone é obrigatório");
        }
        if (isBlank(patient.getGhlContactId())) {
            throw new IllegalArgumentException("contact_id é obrigatório para idempotência");
        }
    }

    private void auditSuccess(GhlPatientNormalized normalized, String dedupeKey) {
        WebhookAudit audit = new WebhookAudit();
        audit.setEventType(normalized.getEventType());
        audit.setStatus("PROCESSED");
        audit.setSuccess(true);
        audit.setMessage(dedupeKey);
        webhookAuditRepository.save(audit);
    }

    private void validateRequired(GhlPatientNormalized normalized) {
        if (isBlank(normalized.getGhlContactId())) {
            throw new IllegalArgumentException("contact_id é obrigatório");
        }
        if (isBlank(normalized.getEventType())) {
            throw new IllegalArgumentException("event_type é obrigatório");
        }
    }

    private String buildDedupeKey(GhlPatientNormalized normalized) {
        return normalized.getGhlContactId() + ":" + normalized.getEventType();
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
