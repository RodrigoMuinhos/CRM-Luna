package br.lunavita.totemapi.repository;

import br.lunavita.totemapi.model.AppointmentEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface AppointmentEventRepository extends JpaRepository<AppointmentEvent, String> {
    List<AppointmentEvent> findByAppointmentId(String appointmentId);

    List<AppointmentEvent> findByDate(LocalDate date);

    List<AppointmentEvent> findByType(String type);
}
