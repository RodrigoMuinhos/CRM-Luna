package br.lunavita.totemapi.dto;

public class PixPaymentStatusResponse {
    private String status;
    private String appointmentStatus;
    private String appointmentId;
    private String paymentId;

    public PixPaymentStatusResponse() {}

    public PixPaymentStatusResponse(String status, String appointmentStatus, String appointmentId, String paymentId) {
        this.status = status;
        this.appointmentStatus = appointmentStatus;
        this.appointmentId = appointmentId;
        this.paymentId = paymentId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getAppointmentStatus() {
        return appointmentStatus;
    }

    public void setAppointmentStatus(String appointmentStatus) {
        this.appointmentStatus = appointmentStatus;
    }

    public String getAppointmentId() {
        return appointmentId;
    }

    public void setAppointmentId(String appointmentId) {
        this.appointmentId = appointmentId;
    }

    public String getPaymentId() {
        return paymentId;
    }

    public void setPaymentId(String paymentId) {
        this.paymentId = paymentId;
    }
}
