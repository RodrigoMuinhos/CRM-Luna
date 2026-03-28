package br.lunavita.totemapi.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.lunavita.totemapi.dto.GhlAppointmentWebhookDto;
import br.lunavita.totemapi.dto.GhlAppointmentWebhookResult;
import br.lunavita.totemapi.model.Appointment;
import br.lunavita.totemapi.model.Doctor;
import br.lunavita.totemapi.model.Patient;
import br.lunavita.totemapi.repository.AppointmentRepository;
import br.lunavita.totemapi.repository.DoctorRepository;
import br.lunavita.totemapi.repository.PatientRepository;

@Service
public class GhlWebhookAppointmentService {

    private static final Logger logger = LoggerFactory.getLogger(GhlWebhookAppointmentService.class);

    private final PatientRepository patientRepository;
    private final AppointmentRepository appointmentRepository;
    private final DoctorRepository doctorRepository;

    public GhlWebhookAppointmentService(PatientRepository patientRepository,
                                        AppointmentRepository appointmentRepository,
                                        DoctorRepository doctorRepository) {
        this.patientRepository = patientRepository;
        this.appointmentRepository = appointmentRepository;
        this.doctorRepository = doctorRepository;
    }

    @Transactional
    public GhlAppointmentWebhookResult processAppointment(GhlAppointmentWebhookDto payload) {
        
        // 1. Validar campos obrigatórios
        validatePayload(payload);

        // 2. Normalizar tenant
        String tenantId = normalizeTenantId(payload.getTenantId());

        // 3. Buscar ou criar paciente
        boolean[] patientWasCreated = new boolean[]{false};
        Patient patient = findOrCreatePatient(payload, tenantId, patientWasCreated);

        // 4. Buscar médico se doctorId fornecido
        Doctor doctor = null;
        if (payload.getDoctorId() != null && !payload.getDoctorId().isBlank()) {
            doctor = findDoctor(payload.getDoctorId(), tenantId);
            if (doctor == null) {
                logger.warn("[GHL-APPOINTMENT] Médico ID {} não encontrado, consulta criada sem médico", payload.getDoctorId());
            }
        }

        // 5. Criar consulta
        Appointment appointment = createAppointment(payload, patient, doctor, tenantId);

        // 6. Salvar
        Appointment saved = appointmentRepository.save(appointment);

        logger.info("[GHL-APPOINTMENT] Consulta criada: {} para paciente {} (tenant: {})",
                saved.getId(), patient.getId(), tenantId);

        return new GhlAppointmentWebhookResult(
                patient.getId(),
                saved.getId(),
                patientWasCreated[0],
                "Appointment created successfully");
    }

    private void validatePayload(GhlAppointmentWebhookDto payload) {
        // CPF obrigatório
        if (payload.getCpf() == null || payload.getCpf().isBlank()) {
            throw new IllegalArgumentException("Campo 'cpf' é obrigatório");
        }

        String cpf = payload.getCpf().replaceAll("[^0-9]", "");
        if (cpf.length() != 11) {
            throw new IllegalArgumentException("CPF deve ter 11 dígitos");
        }

        // Nome obrigatório
        if (payload.getFullName() == null || payload.getFullName().isBlank()) {
            throw new IllegalArgumentException("Campo 'full_name' é obrigatório");
        }

        // Telefone obrigatório
        if (payload.getPhone() == null || payload.getPhone().isBlank()) {
            throw new IllegalArgumentException("Campo 'phone' é obrigatório");
        }

        // Data obrigatória
        if (payload.getAppointmentDate() == null || payload.getAppointmentDate().isBlank()) {
            throw new IllegalArgumentException("Campo 'appointment_date' é obrigatório");
        }

        // Hora obrigatória
        if (payload.getAppointmentTime() == null || payload.getAppointmentTime().isBlank()) {
            throw new IllegalArgumentException("Campo 'appointment_time' é obrigatório");
        }

        // Tipo obrigatório
        if (payload.getAppointmentType() == null || payload.getAppointmentType().isBlank()) {
            throw new IllegalArgumentException("Campo 'appointment_type' é obrigatório");
        }

        // Validar formato de data
        try {
            LocalDate.parse(payload.getAppointmentDate(), DateTimeFormatter.ISO_LOCAL_DATE);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Campo 'appointment_date' deve estar no formato YYYY-MM-DD");
        }

        // Validar formato de hora (HH:mm)
        if (!payload.getAppointmentTime().matches("^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")) {
            throw new IllegalArgumentException("Campo 'appointment_time' deve estar no formato HH:mm");
        }
    }

    private String normalizeTenantId(String tenantId) {
        if (tenantId == null || tenantId.isBlank()) {
            return "default";
        }
        return tenantId;
    }

    private Patient findOrCreatePatient(GhlAppointmentWebhookDto payload, String tenantId, boolean[] wasCreatedOut) {
        String cpf = payload.getCpf().replaceAll("[^0-9]", "");

        // Tentar encontrar por tenant + CPF
        Optional<Patient> existingByTenantAndCpf = patientRepository.findByTenantIdAndCpf(tenantId, cpf);
        if (existingByTenantAndCpf.isPresent()) {
            Patient existing = existingByTenantAndCpf.get();
            logger.info("[GHL-APPOINTMENT] Paciente encontrado: {} (CPF: ***{})", 
                    existing.getId(), cpf.substring(cpf.length() - 3));
            
            // Atualizar dados se fornecidos
            updatePatientIfNeeded(existing, payload);
            wasCreatedOut[0] = false;
            return patientRepository.save(existing);
        }

        // Se não encontrou, criar novo
        logger.info("[GHL-APPOINTMENT] Criando novo paciente com CPF: ***{}", cpf.substring(cpf.length() - 3));
        
        Patient newPatient = new Patient();
        newPatient.setId(UUID.randomUUID().toString());
        newPatient.setTenantId(tenantId);
        newPatient.setCpf(cpf);
        newPatient.setName(payload.getFullName());
        newPatient.setPhone(payload.getPhone());
        
        if (payload.getEmail() != null && !payload.getEmail().isBlank()) {
            newPatient.setEmail(payload.getEmail());
        }
        
        if (payload.getBirthDate() != null && !payload.getBirthDate().isBlank()) {
            try {
                // Validar formato da data
                LocalDate.parse(payload.getBirthDate(), DateTimeFormatter.ISO_LOCAL_DATE);
                newPatient.setBirthDate(payload.getBirthDate());
            } catch (DateTimeParseException e) {
                logger.warn("[GHL-APPOINTMENT] Data de nascimento inválida: {}", payload.getBirthDate());
            }
        }

        if (payload.getContactId() != null && !payload.getContactId().isBlank()) {
            newPatient.setGhlContactId(payload.getContactId());
        }

        wasCreatedOut[0] = true;
        return patientRepository.save(newPatient);
    }

    private void updatePatientIfNeeded(Patient patient, GhlAppointmentWebhookDto payload) {
        boolean updated = false;

        // Atualizar nome se fornecido
        if (payload.getFullName() != null && !payload.getFullName().equals(patient.getName())) {
            patient.setName(payload.getFullName());
            updated = true;
        }

        // Atualizar telefone se fornecido
        if (payload.getPhone() != null && !payload.getPhone().equals(patient.getPhone())) {
            patient.setPhone(payload.getPhone());
            updated = true;
        }

        // Atualizar email se fornecido
        if (payload.getEmail() != null && !payload.getEmail().isBlank() && !payload.getEmail().equals(patient.getEmail())) {
            patient.setEmail(payload.getEmail());
            updated = true;
        }

        // Atualizar GHL contact ID se fornecido
        if (payload.getContactId() != null && !payload.getContactId().equals(patient.getGhlContactId())) {
            patient.setGhlContactId(payload.getContactId());
            updated = true;
        }

        if (updated) {
            logger.info("[GHL-APPOINTMENT] Dados do paciente atualizados: {}", patient.getId());
        }
    }

    private Doctor findDoctor(String doctorId, String tenantId) {
        Optional<Doctor> doctor = doctorRepository.findByTenantIdAndId(tenantId, doctorId);
        return doctor.orElse(null);
    }

    private Appointment createAppointment(GhlAppointmentWebhookDto payload, Patient patient, Doctor doctor, String tenantId) {
        Appointment appointment = new Appointment();
        appointment.setId(UUID.randomUUID().toString());
        appointment.setTenantId(tenantId);
        appointment.setPatientId(patient.getId());
        appointment.setPatient(patient.getName());
        appointment.setPatientEmail(patient.getEmail());
        appointment.setCpf(patient.getCpf());

        // Data e hora
        LocalDate date = LocalDate.parse(payload.getAppointmentDate(), DateTimeFormatter.ISO_LOCAL_DATE);
        appointment.setDate(date);
        appointment.setTime(payload.getAppointmentTime());

        // Tipo
        appointment.setType(payload.getAppointmentType());

        // Status (padrão: agendada)
        if (payload.getStatus() != null && !payload.getStatus().isBlank()) {
            appointment.setStatus(payload.getStatus());
        } else {
            appointment.setStatus("agendada");
        }

        // Pagamento
        if (payload.getPaid() != null) {
            appointment.setPaid(payload.getPaid());
        } else {
            appointment.setPaid(false);
        }

        if (payload.getAmount() != null) {
            appointment.setAmount(BigDecimal.valueOf(payload.getAmount()));
        }

        // Médico (opcional)
        if (doctor != null) {
            appointment.setDoctorId(doctor.getId());
            appointment.setDoctor(doctor.getName());
            appointment.setSpecialty(doctor.getSpecialty());
        } else if (payload.getDoctorName() != null && !payload.getDoctorName().isBlank()) {
            // Se não encontrou médico mas veio nome, usar o nome fornecido
            appointment.setDoctor(payload.getDoctorName());
            if (payload.getSpecialty() != null) {
                appointment.setSpecialty(payload.getSpecialty());
            }
        }

        return appointment;
    }
}
