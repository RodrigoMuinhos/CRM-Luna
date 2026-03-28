package br.lunavita.totemapi.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "totem_payment_transactions")
public class PaymentTransaction {

    @Id
    private String id;

    @Column(name = "appointment_id", nullable = false)
    private String appointmentId;

    @Column(name = "asaas_payment_id")
    private String asaasPaymentId;

    @Column(name = "asaas_pix_qrcode_id")
    private String asaasPixQrCodeId;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private String status; // PENDING, CONFIRMED, RECEIVED, OVERDUE

    @Column(name = "payment_method", nullable = false)
    private String paymentMethod; // PIX, CREDIT_CARD, etc

    @Column(name = "qr_code_image", columnDefinition = "TEXT")
    private String qrCodeImage;

    @Column(name = "qr_code_payload", columnDefinition = "TEXT")
    private String qrCodePayload;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    public PaymentTransaction() {
        this.createdAt = LocalDateTime.now();
        this.status = "PENDING";
    }

    public PaymentTransaction(String id, String appointmentId, BigDecimal amount, String paymentMethod) {
        this.id = id;
        this.appointmentId = appointmentId;
        this.amount = amount;
        this.paymentMethod = paymentMethod;
        this.createdAt = LocalDateTime.now();
        this.status = "PENDING";
    }

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

    public String getAsaasPaymentId() {
        return asaasPaymentId;
    }

    public void setAsaasPaymentId(String asaasPaymentId) {
        this.asaasPaymentId = asaasPaymentId;
    }

    public String getAsaasPixQrCodeId() {
        return asaasPixQrCodeId;
    }

    public void setAsaasPixQrCodeId(String asaasPixQrCodeId) {
        this.asaasPixQrCodeId = asaasPixQrCodeId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public String getQrCodeImage() {
        return qrCodeImage;
    }

    public void setQrCodeImage(String qrCodeImage) {
        this.qrCodeImage = qrCodeImage;
    }

    public String getQrCodePayload() {
        return qrCodePayload;
    }

    public void setQrCodePayload(String qrCodePayload) {
        this.qrCodePayload = qrCodePayload;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getConfirmedAt() {
        return confirmedAt;
    }

    public void setConfirmedAt(LocalDateTime confirmedAt) {
        this.confirmedAt = confirmedAt;
    }
}

