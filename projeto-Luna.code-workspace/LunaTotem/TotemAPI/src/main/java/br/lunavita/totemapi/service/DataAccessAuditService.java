package br.lunavita.totemapi.service;

import br.lunavita.totemapi.model.DataAccessLog;
import br.lunavita.totemapi.repository.DataAccessLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Serviço para registrar auditoria de acesso a dados pessoais
 * Conformidade com LGPD Art. 37 - Relatório de Impacto
 */
@Service
public class DataAccessAuditService {

    private static final Logger logger = LoggerFactory.getLogger(DataAccessAuditService.class);

    private final DataAccessLogRepository dataAccessLogRepository;

    public DataAccessAuditService(DataAccessLogRepository dataAccessLogRepository) {
        this.dataAccessLogRepository = dataAccessLogRepository;
    }

    /**
     * Registra acesso a dados pessoais
     */
    @Transactional
    public void logAccess(String patientId, String userEmail, String userRole,
            String actionType, String resourceType, String resourceId,
            String ipAddress, String userAgent, String dataFields) {
        try {
            DataAccessLog log = new DataAccessLog();
            log.setPatientId(patientId);
            log.setUserEmail(userEmail);
            log.setUserRole(userRole);
            log.setActionType(actionType);
            log.setResourceType(resourceType);
            log.setResourceId(resourceId);
            log.setIpAddress(ipAddress);
            log.setUserAgent(userAgent);
            log.setDataFieldsAccessed(dataFields);
            log.setAccessedAt(LocalDateTime.now());

            dataAccessLogRepository.save(log);
            logger.info("[LGPD-AUDIT] {} by {} on {} (ID: {})", actionType, userEmail, resourceType, resourceId);
        } catch (Exception e) {
            logger.error("[LGPD-AUDIT] Failed to log access: {}", e.getMessage(), e);
        }
    }

    /**
     * Registra leitura de dados do paciente
     */
    public void logPatientRead(String patientId, String userEmail, String userRole, String ipAddress,
            String userAgent) {
        logAccess(patientId, userEmail, userRole, "READ", "PATIENT", patientId, ipAddress, userAgent,
                "[\"name\",\"cpf\",\"email\",\"phone\",\"address\",\"birthDate\"]");
    }

    /**
     * Registra atualização de dados do paciente
     */
    public void logPatientUpdate(String patientId, String userEmail, String userRole, String ipAddress,
            String userAgent, String fieldsUpdated) {
        logAccess(patientId, userEmail, userRole, "UPDATE", "PATIENT", patientId, ipAddress, userAgent, fieldsUpdated);
    }

    /**
     * Registra exclusão de dados do paciente
     */
    public void logPatientDelete(String patientId, String userEmail, String userRole, String ipAddress,
            String userAgent) {
        logAccess(patientId, userEmail, userRole, "DELETE", "PATIENT", patientId, ipAddress, userAgent,
                "[\"all_patient_data\"]");
    }

    /**
     * Registra exportação de dados do paciente
     */
    public void logPatientExport(String patientId, String userEmail, String userRole, String ipAddress,
            String userAgent) {
        logAccess(patientId, userEmail, userRole, "EXPORT", "PATIENT", patientId, ipAddress, userAgent,
                "[\"all_patient_data\"]");
    }

    /**
     * Registra acesso a consulta médica
     */
    public void logAppointmentRead(String appointmentId, String patientId, String userEmail, String userRole,
            String ipAddress, String userAgent) {
        logAccess(patientId, userEmail, userRole, "READ", "APPOINTMENT", appointmentId, ipAddress, userAgent,
                "[\"patient\",\"doctor\",\"date\",\"time\",\"status\"]");
    }

}
