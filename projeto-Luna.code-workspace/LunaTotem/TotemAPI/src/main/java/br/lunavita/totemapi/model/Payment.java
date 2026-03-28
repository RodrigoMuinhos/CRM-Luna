package br.lunavita.totemapi.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "totem_payments")
public class Payment {
    @Id
    private String id;

    @Column(name = "appointment_id", nullable = false)
    private String appointmentId;

    @Column(nullable = false)
    private String method; // PIX / CARTAO / DEBITO

    @Column(nullable = false)
    private String status; // APROVADO / RECUSADO

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(name = "fee", nullable = true)
    private BigDecimal fee; // taxa da maquininha

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "date", nullable = false)
    private LocalDate date; // redundÃ¢ncia para agregaÃ§Ãµes por dia

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

    public String getMethod() {
        return method;
    }

    public void setMethod(String method) {
        this.method = method;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public BigDecimal getFee() {
        return fee;
    }

    public void setFee(BigDecimal fee) {
        this.fee = fee;
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
}

