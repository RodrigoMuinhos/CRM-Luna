package br.lunavita.totemapi.service;

import br.lunavita.totemapi.model.Appointment;
import br.lunavita.totemapi.repository.AppointmentRepository;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.DateTimeException;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Component
public class AppointmentStatusScheduler {

    private static final Logger logger = LoggerFactory.getLogger(AppointmentStatusScheduler.class);
    private static final Duration GRACE_PERIOD = Duration.ofMinutes(90);
    private static final Set<String> WAITING_STATUSES = Set.of(
            "AGUARDANDO_CHEGADA",
            "AGUARDANDO",
            "AGENDADO",
            "SCHEDULED");

    private final AppointmentRepository appointmentRepository;

    public AppointmentStatusScheduler(AppointmentRepository appointmentRepository) {
        this.appointmentRepository = appointmentRepository;
    }

    @Scheduled(fixedDelayString = "${totem.appointments.status-check-ms:60000}")
    @Transactional
    public void autoCancelOverdueAppointments() {
        List<Appointment> appointments = appointmentRepository.findAll();
        LocalDateTime now = LocalDateTime.now();
        int updated = 0;

        for (Appointment appointment : appointments) {
            if (shouldCancel(appointment, now)) {
                appointment.setStatus("CANCELADA");
                appointmentRepository.save(appointment);
                updated++;
            }
        }

        if (updated > 0) {
            logger.info("Auto-cancelled {} appointment(s) due to 90 minute check-in timeout.", updated);
        }
    }

    private boolean shouldCancel(Appointment appointment, LocalDateTime now) {
        if (appointment == null) {
            return false;
        }
        LocalDate date = appointment.getDate();
        LocalTime time = parseTime(appointment.getTime());
        if (date == null || time == null) {
            return false;
        }
        if (!isWaitingStatus(appointment.getStatus())) {
            return false;
        }
        LocalDateTime scheduledDateTime = LocalDateTime.of(date, time);
        return scheduledDateTime.plus(GRACE_PERIOD).isBefore(now);
    }

    private boolean isWaitingStatus(String status) {
        if (status == null || status.isBlank()) {
            return true;
        }
        String normalized = status.trim().toUpperCase(Locale.ROOT);
        return WAITING_STATUSES.contains(normalized);
    }

    private LocalTime parseTime(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String[] parts = raw.trim().split(":");
        if (parts.length < 2) {
            return null;
        }
        try {
            int hour = Integer.parseInt(parts[0]);
            int minute = Integer.parseInt(parts[1]);
            int second = parts.length > 2 ? Integer.parseInt(parts[2]) : 0;
            return LocalTime.of(hour, minute, second);
        } catch (NumberFormatException | DateTimeException ex) {
            logger.debug("Failed to parse appointment time '{}': {}", raw, ex.getMessage());
            return null;
        }
    }
}
