package br.lunavita.totemapi.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "appointment_events")
public class AppointmentEvent {
    @Id
    private String id;

    @Column(name = "appointment_id", nullable = false)
    private String appointmentId;

    @Column(nullable = false)
    private String type; // CREATED, CHECKIN_STARTED, PHOTO_ATTACHED, PAYMENT_CAPTURED, CANCELLED

    @Column(nullable = true)
    private String origin; // TOTEM, APP, ADMIN

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "date", nullable = false)
    private LocalDate date; // para agregações por dia

    @Column(name = "details", columnDefinition = "TEXT")
    private String details; // JSON ou texto simples

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getAppointmentId() {
        return appointmentId;
    }

    public void setAppointmentId(String appointmentId) {
        this.appointmentId = appointmentId;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getOrigin() {
        return origin;
    }

    public void setOrigin(String origin) {
        this.origin = origin;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }
}
