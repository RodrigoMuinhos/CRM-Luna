package br.lunavita.totemapi.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.databind.ObjectMapper;

import br.lunavita.totemapi.model.Appointment;
import br.lunavita.totemapi.model.AppointmentRequest;
import br.lunavita.totemapi.model.DashboardSummary;
import br.lunavita.totemapi.model.Doctor;
import br.lunavita.totemapi.model.Patient;
import br.lunavita.totemapi.repository.AppointmentRepository;
import br.lunavita.totemapi.repository.DoctorRepository;
import br.lunavita.totemapi.repository.PatientRepository;
import jakarta.transaction.Transactional;

@Service
public class DataStoreService {

    private static final Logger logger = LoggerFactory.getLogger(DataStoreService.class);

    private final AppointmentRepository appointmentRepository;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;
    private final EmailService emailService;
    private final ResendEmailService resendEmailService;
    private final FileStorageService fileStorageService;
    private final ObjectMapper objectMapper;

    public DataStoreService(AppointmentRepository appointmentRepository, DoctorRepository doctorRepository,
            PatientRepository patientRepository, EmailService emailService,
            ResendEmailService resendEmailService, FileStorageService fileStorageService,
            ObjectMapper objectMapper) {
        this.appointmentRepository = appointmentRepository;
        this.doctorRepository = doctorRepository;
        this.patientRepository = patientRepository;
        this.emailService = emailService;
        this.resendEmailService = resendEmailService;
        this.fileStorageService = fileStorageService;
        this.objectMapper = objectMapper;
    }

    public List<Appointment> listAppointments() {
        return appointmentRepository.findAll();
    }

    public List<Appointment> listAppointments(String tenantId) {
        if (tenantId == null || tenantId.isBlank()) {
            return listAppointments();
        }
        return appointmentRepository.findAllByTenantId(tenantId);
    }

    public List<Appointment> listUpcomingAppointments() {
        LocalDate today = LocalDate.now();
        return appointmentRepository.findByDateGreaterThanEqualOrderByDateAscTimeAscPatientAsc(today);
    }

    public List<Appointment> listUpcomingAppointments(String tenantId) {
        LocalDate today = LocalDate.now();
        if (tenantId == null || tenantId.isBlank()) {
            return listUpcomingAppointments();
        }
        return appointmentRepository.findByTenantIdAndDateGreaterThanEqualOrderByDateAscTimeAscPatientAsc(tenantId, today);
    }

    public List<Appointment> searchUpcomingAppointments(String query) {
        LocalDate today = LocalDate.now();
        if (query == null || query.trim().length() < 2) {
            return List.of();
        }
        return appointmentRepository
                .findByDateGreaterThanEqualAndPatientIgnoreCaseContainingOrderByDateAscTimeAscPatientAsc(today,
                        query.trim());
    }

    public List<Appointment> searchUpcomingAppointments(String tenantId, String query) {
        LocalDate today = LocalDate.now();
        if (query == null || query.trim().length() < 2) {
            return List.of();
        }
        if (tenantId == null || tenantId.isBlank()) {
            return searchUpcomingAppointments(query);
        }
        return appointmentRepository
                .findByTenantIdAndDateGreaterThanEqualAndPatientIgnoreCaseContainingOrderByDateAscTimeAscPatientAsc(
                        tenantId, today, query.trim());
    }

    /**
     * Busca agendamentos NÃO pagos (qualquer data) por nome e/ou CPF parcial.
     *
     * Usado pelo fluxo de pagamento do totem (o usuário costuma digitar CPF).
     */
    public List<Appointment> searchUnpaidAppointments(String query) {
        if (query == null || query.trim().length() < 2) {
            System.out.println("[UNPAID SEARCH] Query muito curta: " + query);
            return List.of();
        }
        String q = query.trim();
        String cpfPart = q.replaceAll("\\D", "");
        if (cpfPart.length() < 2) {
            cpfPart = "";
        }
        System.out.println("[UNPAID SEARCH] Buscando com q=" + q + ", cpfPart=" + cpfPart);
        List<Appointment> results = appointmentRepository.searchUnpaidByPatientOrCpf(q, cpfPart);
        System.out.println("[UNPAID SEARCH] Encontrados: " + results.size() + " agendamentos não pagos");
        results.forEach(a -> System.out.println("  - " + a.getPatient() + " | CPF: " + a.getCpf() + " | Paid: " + a.isPaid() + " | Amount: " + a.getAmount()));
        return results;
    }

    /**
     * Variante multi-tenant para busca de agendamentos NÃO pagos (qualquer data).
     */
    public List<Appointment> searchUnpaidAppointments(String tenantId, String query) {
        if (query == null || query.trim().length() < 2) {
            System.out.println("[UNPAID SEARCH MT] Query muito curta: " + query);
            return List.of();
        }
        if (tenantId == null || tenantId.isBlank()) {
            System.out.println("[UNPAID SEARCH MT] Tenant vazio, usando busca global");
            return searchUnpaidAppointments(query);
        }
        String q = query.trim();
        String cpfPart = q.replaceAll("\\D", "");
        if (cpfPart.length() < 2) {
            cpfPart = "";
        }
        System.out.println("[UNPAID SEARCH MT] Buscando com tenantId=" + tenantId + ", q=" + q + ", cpfPart=" + cpfPart);
        List<Appointment> results = appointmentRepository.searchUnpaidByTenantIdAndPatientOrCpf(tenantId, q, cpfPart);
        System.out.println("[UNPAID SEARCH MT] Encontrados: " + results.size() + " agendamentos não pagos");
        results.forEach(a -> System.out.println("  - " + a.getPatient() + " | CPF: " + a.getCpf() + " | Paid: " + a.isPaid() + " | TenantId: " + a.getTenantId()));
        return results;
    }

    public Optional<Appointment> findAppointment(String id) {
        return appointmentRepository.findById(id);
    }

    public Optional<Appointment> findAppointment(String tenantId, String id) {
        if (tenantId == null || tenantId.isBlank()) {
            return findAppointment(id);
        }
        return appointmentRepository.findByTenantIdAndId(tenantId, id);
    }

    public Appointment createAppointment(AppointmentRequest request) {
        Appointment apt = new Appointment();
        apt.setId(UUID.randomUUID().toString());
        apt.setPatient(request.getPatient());
        apt.setPatientId(request.getPatientId());
        apt.setDoctor(request.getDoctor());
        apt.setSpecialty(request.getSpecialty());
        apt.setDate(request.getDate());
        apt.setTime(request.getTime());
        apt.setStatus(request.getStatus() != null && !request.getStatus().isBlank() ? request.getStatus() : "aguardando");
        apt.setPaid(request.getPaid() != null ? request.getPaid() : false);
        apt.setAmount(request.getAmount());
        apt.setCpf(request.getCpf());
        apt.setType(request.getType());
        apt.setPatientEmail(request.getPatientEmail());
        apt.setTenantId(request.getTenantId());
        return appointmentRepository.save(apt);
    }

    public Appointment createAppointment(AppointmentRequest request, String tenantId) {
        if (tenantId != null && !tenantId.isBlank()) {
            request.setTenantId(tenantId);
        }
        return createAppointment(request);
    }

    /**
     * Cria consulta por CPF (busca o paciente automaticamente)
     * 
     * @param cpf CPF do paciente (11 dígitos)
     * @param date Data da consulta
     * @param time Horário da consulta (HH:mm)
     * @param type Tipo de consulta
     * @param amount Valor
     * @param paid Se já está pago
     * @param status Status inicial (default: "aguardando")
     * @param doctorId ID do médico (opcional)
     * @param tenantId Tenant (obrigatório)
     * @return Appointment criado
     * @throws IllegalArgumentException se paciente não encontrado ou doctor inválido
     */
    @Transactional
    public Appointment createAppointmentByCpf(
            String cpf, LocalDate date, String time, String type, 
            BigDecimal amount, Boolean paid, String status, 
            String doctorId, String tenantId) {
        
        // Validar tenant
        if (tenantId == null || tenantId.isBlank()) {
            throw new IllegalArgumentException("Tenant ID é obrigatório");
        }

        // Buscar paciente por CPF
        logger.info("Buscando paciente com CPF: {} (tenant: {})", maskCpf(cpf), tenantId);
        Patient patient = patientRepository.findByTenantIdAndCpf(tenantId, cpf)
                .orElseThrow(() -> new IllegalArgumentException(
                    "Paciente não encontrado para o CPF informado no tenant " + tenantId));
        
        // Criar appointment
        Appointment apt = new Appointment();
        apt.setId(UUID.randomUUID().toString());
        apt.setTenantId(tenantId);
        apt.setPatientId(patient.getId());
        apt.setPatient(patient.getName());
        apt.setPatientEmail(patient.getEmail());
        apt.setCpf(patient.getCpf());
        apt.setDate(date);
        apt.setTime(time);
        apt.setType(type);
        apt.setAmount(amount);
        apt.setPaid(paid != null ? paid : false);
        apt.setStatus(status != null && !status.isBlank() ? status : "aguardando");
        
        // Se doctorId foi informado, buscar na tabela doctors
        if (doctorId != null && !doctorId.isBlank()) {
            logger.info("Buscando médico com ID: {} (tenant: {})", doctorId, tenantId);
            Doctor doctor = doctorRepository.findByTenantIdAndId(tenantId, doctorId)
                    .orElseThrow(() -> new IllegalArgumentException(
                        "Médico não encontrado para o ID informado no tenant " + tenantId));
            
            apt.setDoctorId(doctor.getId());
            apt.setDoctor(doctor.getName());
            apt.setSpecialty(doctor.getSpecialty());
            logger.info("Consulta vinculada ao médico: {} ({})", doctor.getName(), doctor.getSpecialty());
        } else {
            // Consulta sem médico (permitido após migration)
            apt.setDoctorId(null);
            apt.setDoctor(null);
            apt.setSpecialty(null);
            logger.info("Consulta criada sem médico associado");
        }
        
        logger.info("Salvando consulta: paciente={}, data={}, horário={}", 
                patient.getName(), date, time);
        return appointmentRepository.save(apt);
    }

    /**
     * Mascara CPF para logs (mostra apenas últimos 3 dígitos)
     */
    private String maskCpf(String cpf) {
        if (cpf == null || cpf.length() < 4) {
            return "***";
        }
        return "*****" + cpf.substring(cpf.length() - 3);
    }

    @Transactional
    public Optional<Appointment> updateStatus(String id, String status) {
        return appointmentRepository.findById(id)
                .map(apt -> {
                    apt.setStatus(status);
                    return appointmentRepository.save(apt);
                });
    }

    @Transactional
    public Optional<Appointment> updateStatus(String id, String status, String tenantId) {
        if (tenantId == null || tenantId.isBlank()) {
            return updateStatus(id, status);
        }
        return appointmentRepository.findByTenantIdAndId(tenantId, id)
                .map(apt -> {
                    apt.setStatus(status);
                    return appointmentRepository.save(apt);
                });
    }

    @Transactional
    public Optional<Appointment> updatePaid(String id, boolean paid) {
        return appointmentRepository.findById(id)
                .map(apt -> {
                    apt.setPaid(paid);
                    return appointmentRepository.save(apt);
                });
    }

    @Transactional
    public Optional<Appointment> updatePaid(String id, boolean paid, String tenantId) {
        if (tenantId == null || tenantId.isBlank()) {
            return updatePaid(id, paid);
        }
        return appointmentRepository.findByTenantIdAndId(tenantId, id)
                .map(apt -> {
                    apt.setPaid(paid);
                    return appointmentRepository.save(apt);
                });
    }

    public Optional<Appointment> updateAppointment(String id, AppointmentRequest request) {
        return appointmentRepository.findById(id).map(apt -> {
            apt.setPatient(request.getPatient());
            apt.setPatientId(request.getPatientId());
            apt.setDoctor(request.getDoctor());
            apt.setSpecialty(request.getSpecialty());
            apt.setDate(request.getDate());
            apt.setTime(request.getTime());
            apt.setType(request.getType());
            apt.setAmount(request.getAmount());
            apt.setCpf(request.getCpf());
            apt.setPatientEmail(request.getPatientEmail());
            if (request.getStatus() != null && !request.getStatus().isBlank()) {
                apt.setStatus(request.getStatus());
            }
            if (request.getPaid() != null) {
                apt.setPaid(request.getPaid());
            }
            return appointmentRepository.save(apt);
        });
    }

    public Optional<Appointment> updateAppointment(String id, AppointmentRequest request, String tenantId) {
        if (tenantId == null || tenantId.isBlank()) {
            return updateAppointment(id, request);
        }
        return appointmentRepository.findByTenantIdAndId(tenantId, id).map(apt -> {
            apt.setPatient(request.getPatient());
            apt.setPatientId(request.getPatientId());
            apt.setDoctor(request.getDoctor());
            apt.setSpecialty(request.getSpecialty());
            apt.setDate(request.getDate());
            apt.setTime(request.getTime());
            apt.setType(request.getType());
            apt.setAmount(request.getAmount());
            apt.setCpf(request.getCpf());
            apt.setPatientEmail(request.getPatientEmail());
            apt.setTenantId(tenantId);
            if (request.getStatus() != null && !request.getStatus().isBlank()) {
                apt.setStatus(request.getStatus());
            }
            if (request.getPaid() != null) {
                apt.setPaid(request.getPaid());
            }
            return appointmentRepository.save(apt);
        });
    }

    public boolean sendAppointmentNotifications(String id, String patientEmail, String doctorEmail) {
        logger.info("[NOTIFY] Iniciando envio de notificação para consulta id={}, doctorEmail={}", id, doctorEmail);
        return appointmentRepository.findById(id).map(appointment -> {
            logger.info("[NOTIFY] Consulta encontrada: {}", appointment.getId());

            String resolvedDoctorEmail = (doctorEmail != null && !doctorEmail.isBlank())
                    ? doctorEmail
                    : resolveDoctorEmail(appointment.getDoctor());
            if (resolvedDoctorEmail != null && !resolvedDoctorEmail.isBlank()) {
                try {
                    logger.info("[NOTIFY] Enviando email para médico: {}", resolvedDoctorEmail);
                    // Usar Resend se configurado, senão tentar SMTP
                    if (resendEmailService.isConfigured()) {
                        logger.info("[NOTIFY] Usando Resend API para enviar email");
                        resendEmailService.sendAppointmentNotificationToDoctor(resolvedDoctorEmail, appointment);
                    } else {
                        logger.info("[NOTIFY] Usando SMTP para enviar email");
                        emailService.sendAppointmentHtmlToDoctor(resolvedDoctorEmail, appointment);
                    }
                    logger.info("[NOTIFY] Email enviado com sucesso para médico: {}", resolvedDoctorEmail);
                } catch (Exception e) {
                    logger.error("[NOTIFY] Erro ao enviar email para médico: {}", e.getMessage(), e);
                }
            } else {
                logger.warn("[NOTIFY] Email do médico não informado");
            }
            logger.info("[NOTIFY] Processo de notificação concluído para consulta id={}", id);
            return true;
        }).orElseGet(() -> {
            logger.warn("[NOTIFY] Consulta não encontrada: id={}", id);
            return false;
        });
    }

    private String resolveDoctorEmail(String doctorName) {
        if (doctorName == null || doctorName.isBlank()) {
            return null;
        }
        return doctorRepository.findFirstByNameIgnoreCase(doctorName)
                .map(Doctor::getEmail)
                .orElse(null);
    }

    public boolean deleteAppointment(String id) {
        if (!appointmentRepository.existsById(id)) {
            return false;
        }
        appointmentRepository.deleteById(id);
        return true;
    }

    public boolean deleteAppointment(String id, String tenantId) {
        if (tenantId == null || tenantId.isBlank()) {
            return deleteAppointment(id);
        }
        boolean exists = appointmentRepository.findByTenantIdAndId(tenantId, id).isPresent();
        if (!exists) {
            return false;
        }
        appointmentRepository.deleteById(id);
        return true;
    }

    public Optional<Appointment> uploadAppointmentPhoto(String id, MultipartFile file) {
        return appointmentRepository.findById(id).map(apt -> {
            try {
                FileStorageService.PhotoSaveResult savedPhoto = fileStorageService.saveAppointmentPhoto(id, file);
                apt.setPhotoUrl(savedPhoto.url());
                Appointment saved = appointmentRepository.save(apt);
                savePhotoAudit(saved, savedPhoto);
                return saved;
            } catch (Exception e) {
                throw new RuntimeException("Failed to save photo: " + e.getMessage(), e);
            }
        });
    }

    private void savePhotoAudit(Appointment appointment, FileStorageService.PhotoSaveResult photo) {
        try {
            Map<String, Object> audit = new LinkedHashMap<>();
            audit.put("capturedAt", Instant.now().toString());
            audit.put("photoUrl", photo.url());
            audit.put("photoFilename", photo.filename());

            Map<String, Object> appointmentData = new LinkedHashMap<>();
            appointmentData.put("id", appointment.getId());
            appointmentData.put("tenantId", appointment.getTenantId());
            appointmentData.put("date", appointment.getDate());
            appointmentData.put("time", appointment.getTime());
            appointmentData.put("status", appointment.getStatus());
            appointmentData.put("type", appointment.getType());
            appointmentData.put("amount", appointment.getAmount());
            appointmentData.put("doctor", appointment.getDoctor());
            appointmentData.put("specialty", appointment.getSpecialty());
            appointmentData.put("patientId", appointment.getPatientId());
            appointmentData.put("patientName", appointment.getPatient());
            appointmentData.put("patientEmail", appointment.getPatientEmail());
            appointmentData.put("cpf", appointment.getCpf());
            audit.put("appointment", appointmentData);

            Map<String, Object> patientData = new LinkedHashMap<>();
            Optional<Patient> patient = Optional.empty();
            String tenantId = appointment.getTenantId();
            String patientId = appointment.getPatientId();
            String cpf = appointment.getCpf();
            if (patientId != null && !patientId.isBlank()) {
                if (tenantId != null && !tenantId.isBlank()) {
                    patient = patientRepository.findByTenantIdAndId(tenantId, patientId);
                } else {
                    patient = patientRepository.findById(patientId);
                }
            } else if (cpf != null && !cpf.isBlank() && tenantId != null && !tenantId.isBlank()) {
                patient = patientRepository.findByTenantIdAndCpf(tenantId, cpf);
            }

            if (patient.isPresent()) {
                Patient p = patient.get();
                patientData.put("id", p.getId());
                patientData.put("tenantId", p.getTenantId());
                patientData.put("name", p.getName());
                patientData.put("cpf", p.getCpf());
                patientData.put("phone", p.getPhone());
                patientData.put("email", p.getEmail());
                patientData.put("birthDate", p.getBirthDate());
                patientData.put("address", p.getAddress());
                patientData.put("healthPlan", p.getHealthPlan());
            } else {
                patientData.put("id", appointment.getPatientId());
                patientData.put("name", appointment.getPatient());
                patientData.put("cpf", cpf);
                patientData.put("email", appointment.getPatientEmail());
                patientData.put("source", "appointment");
            }
            audit.put("patient", patientData);

            String json = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(audit);
            String auditFilename = "audit-" + photo.timestamp() + ".json";
            fileStorageService.saveAppointmentAudit(appointment.getId(), auditFilename, json);
        } catch (Exception e) {
            throw new RuntimeException("Failed to save audit file: " + e.getMessage(), e);
        }
    }

    public List<Doctor> listDoctors() {
        return doctorRepository.findAll();
    }

    public List<Doctor> listDoctors(String tenantId) {
        if (tenantId == null || tenantId.isBlank()) {
            return listDoctors();
        }
        return doctorRepository.findAllByTenantId(tenantId);
    }

    public Doctor createDoctor(Doctor doctor) {
        if (doctor.getId() == null || doctor.getId().isBlank()) {
            doctor.setId(UUID.randomUUID().toString());
        }
        return doctorRepository.save(doctor);
    }

    public Doctor createDoctor(Doctor doctor, String tenantId) {
        if (tenantId != null && !tenantId.isBlank()) {
            doctor.setTenantId(tenantId);
        }
        return createDoctor(doctor);
    }

    public Optional<Doctor> updateDoctor(String id, Doctor doctor) {
        return doctorRepository.findById(id).map(existing -> {
            doctor.setId(id);
            return doctorRepository.save(doctor);
        });
    }

    public Optional<Doctor> updateDoctor(String id, Doctor doctor, String tenantId) {
        if (tenantId == null || tenantId.isBlank()) {
            return updateDoctor(id, doctor);
        }
        return doctorRepository.findByTenantIdAndId(tenantId, id).map(existing -> {
            doctor.setId(id);
            doctor.setTenantId(tenantId);
            return doctorRepository.save(doctor);
        });
    }

    public boolean deleteDoctor(String id) {
        if (!doctorRepository.existsById(id)) {
            return false;
        }
        doctorRepository.deleteById(id);
        return true;
    }

    public boolean deleteDoctor(String id, String tenantId) {
        if (tenantId == null || tenantId.isBlank()) {
            return deleteDoctor(id);
        }
        boolean exists = doctorRepository.findByTenantIdAndId(tenantId, id).isPresent();
        if (!exists) {
            return false;
        }
        doctorRepository.deleteById(id);
        return true;
    }

    public DashboardSummary getDashboardSummary() {
        return getDashboardSummary(null);
    }

    public DashboardSummary getDashboardSummary(String tenantId) {
        List<Appointment> all = (tenantId != null && !tenantId.isBlank())
                ? appointmentRepository.findAllByTenantId(tenantId)
                : appointmentRepository.findAll();
        LocalDate today = LocalDate.now();

        // Consultas a partir de hoje (incluindo hoje)
        long scheduled = all.stream()
                .filter(a -> a.getDate() != null && !a.getDate().isBefore(today))
                .count();

        // Pacientes ativos últimos 30 dias
        LocalDate windowStart = today.minusDays(30);
        long activePatients = all.stream()
                .filter(a -> a.getPatientId() != null)
                .filter(a -> a.getDate() != null && !a.getDate().isBefore(windowStart))
                .map(Appointment::getPatientId)
                .distinct()
                .count();

        // Recebíveis = soma de valores não pagos
        BigDecimal receivables = all.stream()
                .filter(a -> !a.isPaid())
                .map(Appointment::getAmount)
                .filter(x -> x != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Consultas recentes (mais novas primeiro)
        List<Appointment> recent = all.stream()
                .sorted(Comparator
                        .comparing(Appointment::getDate, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(a -> parseTimeSafe(a.getTime()))
                        .reversed())
                .limit(10)
                .collect(Collectors.toList());

        // Cálculo simples de horários livres: assume 20 slots/dia por médico para dias
        // restantes do mês
        int doctorsCount = (int) ((tenantId != null && !tenantId.isBlank())
            ? doctorRepository.countByTenantId(tenantId)
            : doctorRepository.count());
        int slotsPerDoctorPerDay = 20;
        LocalDate monthEnd = today.withDayOfMonth(today.lengthOfMonth());
        long remainingDays = today.datesUntil(monthEnd.plusDays(1)).count();
        long potentialSlots = doctorsCount * slotsPerDoctorPerDay * remainingDays;
        long occupiedSlots = all.stream()
                .filter(a -> a.getDate() != null && !a.getDate().isBefore(today))
                .count();
        long freeSlots = Math.max(0, potentialSlots - occupiedSlots);

        DashboardSummary s = new DashboardSummary();
        s.setScheduledCount(scheduled);
        s.setActivePatients(activePatients);
        s.setFreeSlots(freeSlots);
        s.setReceivables(receivables);
        s.setRecentAppointments(recent);
        return s;
    }

    private LocalTime parseTimeSafe(String t) {
        try {
            return t == null ? LocalTime.MIDNIGHT : LocalTime.parse(t);
        } catch (Exception e) {
            return LocalTime.MIDNIGHT;
        }
    }
}
