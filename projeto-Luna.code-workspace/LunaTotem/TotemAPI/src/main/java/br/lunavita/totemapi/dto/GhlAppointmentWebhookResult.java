package br.lunavita.totemapi.dto;

public class GhlAppointmentWebhookResult {

    private String patientId;
    private String appointmentId;
    private boolean patientCreated; // true se paciente foi criado, false se já existia
    private String message;

    public GhlAppointmentWebhookResult() {
    }

    public GhlAppointmentWebhookResult(String patientId, String appointmentId, boolean patientCreated, String message) {
        this.patientId = patientId;
        this.appointmentId = appointmentId;
        this.patientCreated = patientCreated;
        this.message = message;
    }

    public String getPatientId() {
        return patientId;
    }

    public void setPatientId(String patientId) {
        this.patientId = patientId;
    }

    public String getAppointmentId() {
        return appointmentId;
    }

    public void setAppointmentId(String appointmentId) {
        this.appointmentId = appointmentId;
    }

    public boolean isPatientCreated() {
        return patientCreated;
    }

    public void setPatientCreated(boolean patientCreated) {
        this.patientCreated = patientCreated;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
