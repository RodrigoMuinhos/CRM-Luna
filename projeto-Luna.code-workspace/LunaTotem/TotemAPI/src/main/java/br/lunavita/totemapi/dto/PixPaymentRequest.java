package br.lunavita.totemapi.dto;

public class PixPaymentRequest {
    private String appointmentId;

    public PixPaymentRequest() {
    }

    public PixPaymentRequest(String appointmentId) {
        this.appointmentId = appointmentId;
    }

    public String getAppointmentId() {
        return appointmentId;
    }

    public void setAppointmentId(String appointmentId) {
        this.appointmentId = appointmentId;
    }
}
