package br.lunavita.totemapi.controller;

import br.lunavita.totemapi.model.AppointmentEvent;
import br.lunavita.totemapi.repository.AppointmentEventRepository;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/appointment-events")
public class AppointmentEventController {
    private final AppointmentEventRepository eventRepository;

    public AppointmentEventController(AppointmentEventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    @GetMapping
    public ResponseEntity<List<AppointmentEvent>> getEvents(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String type) {
        if (date != null) {
            return ResponseEntity.ok(eventRepository.findByDate(date));
        }
        if (type != null) {
            return ResponseEntity.ok(eventRepository.findByType(type));
        }
        return ResponseEntity.ok(eventRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AppointmentEvent> getEventById(@PathVariable String id) {
        return eventRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/appointment/{appointmentId}")
    public ResponseEntity<List<AppointmentEvent>> getEventsByAppointment(@PathVariable String appointmentId) {
        return ResponseEntity.ok(eventRepository.findByAppointmentId(appointmentId));
    }
}
