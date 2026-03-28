package br.lunavita.totemapi.service;

import br.lunavita.totemapi.model.*;
import br.lunavita.totemapi.repository.*;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class SeedService {
    private final AppointmentEventRepository eventRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final AppointmentRepository appointmentRepository;

    private static final String[] FIRST_NAMES = { "João", "Maria", "Pedro", "Ana", "Carlos", "Julia", "Lucas",
            "Beatriz", "Rafael", "Fernanda" };
    private static final String[] LAST_NAMES = { "Silva", "Santos", "Oliveira", "Souza", "Costa", "Pereira",
            "Rodrigues", "Almeida", "Nascimento", "Lima" };
    private static final String[] SPECIALTIES = { "Cardiologia", "Dermatologia", "Pediatria", "Ortopedia",
            "Ginecologia" };
    private static final String[] APPOINTMENT_TYPES = { "Consulta", "Retorno", "Exame" };

    public SeedService(AppointmentEventRepository eventRepository,
            PatientRepository patientRepository,
            DoctorRepository doctorRepository,
            AppointmentRepository appointmentRepository) {
        this.eventRepository = eventRepository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.appointmentRepository = appointmentRepository;
    }

    private List<Patient> seedPatients;
    private List<Doctor> seedDoctors;

    private String randomName() {
        return FIRST_NAMES[(int) (Math.random() * FIRST_NAMES.length)] + " " +
                LAST_NAMES[(int) (Math.random() * LAST_NAMES.length)];
    }

    private String generateCPF() {
        return String.format("%03d.%03d.%03d-%02d",
                (int) (Math.random() * 999), (int) (Math.random() * 999),
                (int) (Math.random() * 999), (int) (Math.random() * 99));
    }

    private String generatePhone() {
        return String.format("(11) 9%04d-%04d", (int) (Math.random() * 9999), (int) (Math.random() * 9999));
    }

    public void seedPatientsAndDoctors(String tenantId) {
        if (tenantId == null || tenantId.isBlank()) {
            throw new IllegalArgumentException("tenantId is required for seeding");
        }
        if (patientRepository.countByTenantId(tenantId) > 0)
            return;

        seedPatients = new ArrayList<>();
        for (int i = 0; i < 50; i++) {
            Patient p = new Patient();
            p.setId(UUID.randomUUID().toString());
            p.setTenantId(tenantId);
            p.setName(randomName());
            p.setCpf(generateCPF());
            p.setPhone(generatePhone());
            p.setEmail(p.getName().toLowerCase().replace(" ", ".") + "@email.com");
            patientRepository.save(p);
            seedPatients.add(p);
        }

        seedDoctors = new ArrayList<>();
        for (String spec : SPECIALTIES) {
            Doctor d = new Doctor();
            d.setId(UUID.randomUUID().toString());
            d.setTenantId(tenantId);
            d.setName("Dr. " + randomName());
            d.setCrm("CRM/" + (10000 + (int) (Math.random() * 90000)));
            d.setSpecialty(spec);
            d.setPhone(generatePhone());
            d.setEmail(d.getName().toLowerCase().replace(" ", ".").replace("dr.", "") + "@clinic.com");
            doctorRepository.save(d);
            seedDoctors.add(d);
        }
    }

    public void seedPaymentsForDate(LocalDate date, int count, String tenantId) {
        if (seedPatients == null || seedPatients.isEmpty()) {
            seedPatientsAndDoctors(tenantId);
        }

        for (int i = 0; i < count; i++) {
            Patient patient = seedPatients.get((int) (Math.random() * seedPatients.size()));
            Doctor doctor = seedDoctors.get((int) (Math.random() * seedDoctors.size()));

            Appointment appt = new Appointment();
            String apptId = UUID.randomUUID().toString();
            appt.setId(apptId);
            appt.setTenantId(tenantId);
            appt.setPatientId(patient.getId());
            appt.setPatient(patient.getName());
            appt.setCpf(patient.getCpf());
            appt.setPatientEmail(patient.getEmail());
            appt.setDoctor(doctor.getName());
            appt.setSpecialty(doctor.getSpecialty());
            appt.setType(APPOINTMENT_TYPES[(int) (Math.random() * APPOINTMENT_TYPES.length)]);
            appt.setDate(date);
            appt.setTime(String.format("%02d:%02d", 8 + (int) (Math.random() * 10), (int) (Math.random() * 2) * 30));
            // Distribuição realista de status para consultas futuras
            double rand = Math.random();
            if (rand < 0.6) {
                appt.setStatus(AppointmentStatus.AGUARDANDO_CHEGADA.name());
            } else if (rand < 0.85) {
                appt.setStatus(AppointmentStatus.CONFIRMADA.name());
            } else {
                appt.setStatus(AppointmentStatus.CANCELADA.name());
            }
            BigDecimal amount = BigDecimal.valueOf(80 + (int) (Math.random() * 120));
            appt.setAmount(amount);
            appt.setPaid(Math.random() < 0.7);
            appointmentRepository.save(appt);

            // Não geramos mais pagamentos locais; apenas consultas e eventos básicos

            AppointmentEvent created = new AppointmentEvent();
            created.setId(UUID.randomUUID().toString());
            created.setAppointmentId(apptId);
            created.setType("CREATED");
            created.setOrigin("APP");
            created.setCreatedAt(LocalDateTime.of(date.minusDays(1), java.time.LocalTime.of(20, 0)));
            created.setDate(date.minusDays(1));
            eventRepository.save(created);
        }
    }
}
