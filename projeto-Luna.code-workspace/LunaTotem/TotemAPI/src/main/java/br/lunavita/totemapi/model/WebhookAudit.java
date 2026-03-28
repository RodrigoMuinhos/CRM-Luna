package br.lunavita.totemapi.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "webhook_audit")
public class WebhookAudit {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "event_type", length = 80)
    private String eventType;

    @Column(name = "payment_id", length = 80)
    private String paymentId;

    @Column(name = "appointment_id", length = 80)
    private String appointmentId;

    @Column(name = "status", length = 40)
    private String status;

    @Column(name = "success")
    private boolean success;

    @Column(name = "message", length = 1000)
    private String message;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public WebhookAudit() {
    }

    public WebhookAudit(String eventType, String paymentId, String appointmentId, String status, boolean success,
            String message) {
        this.eventType = eventType;
        this.paymentId = paymentId;
        this.appointmentId = appointmentId;
        this.status = status;
        this.success = success;
        this.message = message;
    }

    public String getId() {
        return id;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public String getPaymentId() {
        return paymentId;
    }

    public void setPaymentId(String paymentId) {
        this.paymentId = paymentId;
    }

    public String getAppointmentId() {
        return appointmentId;
    }

    public void setAppointmentId(String appointmentId) {
        this.appointmentId = appointmentId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
