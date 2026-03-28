package br.lunavita.totemapi.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public class GhlAppointmentWebhookDto {

    // ===== DADOS DO PACIENTE (obrigatórios) =====
    
    @JsonProperty("cpf")
    @JsonAlias({"patient_cpf", "cpf_paciente"})
    private String cpf;

    @JsonProperty("full_name")
    @JsonAlias({"fullName", "name", "patient_name"})
    private String fullName;

    @JsonAlias({"phone_number", "mobile", "phoneNumber", "patient_phone"})
    private String phone;

    private String email;

    @JsonProperty("birth_date")
    @JsonAlias({"birthDate", "date_of_birth"})
    private String birthDate;

    // ===== DADOS DA CONSULTA (obrigatórios) =====

    @JsonProperty("appointment_date")
    @JsonAlias({"date", "appointmentDate"})
    private String appointmentDate;

    @JsonProperty("appointment_time")
    @JsonAlias({"time", "appointmentTime"})
    private String appointmentTime;

    @JsonProperty("appointment_type")
    @JsonAlias({"type", "appointmentType"})
    private String appointmentType;

    // ===== DADOS FINANCEIROS =====

    @JsonAlias({"value", "price"})
    private Double amount;

    @JsonProperty("is_paid")
    @JsonAlias({"paid", "isPaid"})
    private Boolean paid;

    // ===== DADOS DO MÉDICO (opcional) =====

    @JsonProperty("doctor_id")
    @JsonAlias({"doctorId"})
    private String doctorId;

    @JsonProperty("doctor_name")
    @JsonAlias({"doctorName"})
    private String doctorName;

    private String specialty;

    // ===== STATUS E METADATA =====

    @JsonProperty("appointment_status")
    @JsonAlias({"status", "appointmentStatus"})
    private String status;

    @JsonProperty("contact_id")
    @JsonAlias({"contactId", "ghl_contact_id"})
    private String contactId;

    @JsonProperty("tenant_id")
    @JsonAlias({"tenantId"})
    private String tenantId;

    private String notes;

    // ===== GETTERS E SETTERS =====

    public String getCpf() {
        return cpf;
    }

    public void setCpf(String cpf) {
        this.cpf = cpf;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getBirthDate() {
        return birthDate;
    }

    public void setBirthDate(String birthDate) {
        this.birthDate = birthDate;
    }

    public String getAppointmentDate() {
        return appointmentDate;
    }

    public void setAppointmentDate(String appointmentDate) {
        this.appointmentDate = appointmentDate;
    }

    public String getAppointmentTime() {
        return appointmentTime;
    }

    public void setAppointmentTime(String appointmentTime) {
        this.appointmentTime = appointmentTime;
    }

    public String getAppointmentType() {
        return appointmentType;
    }

    public void setAppointmentType(String appointmentType) {
        this.appointmentType = appointmentType;
    }

    public Double getAmount() {
        return amount;
    }

    public void setAmount(Double amount) {
        this.amount = amount;
    }

    public Boolean getPaid() {
        return paid;
    }

    public void setPaid(Boolean paid) {
        this.paid = paid;
    }

    public String getDoctorId() {
        return doctorId;
    }

    public void setDoctorId(String doctorId) {
        this.doctorId = doctorId;
    }

    public String getDoctorName() {
        return doctorName;
    }

    public void setDoctorName(String doctorName) {
        this.doctorName = doctorName;
    }

    public String getSpecialty() {
        return specialty;
    }

    public void setSpecialty(String specialty) {
        this.specialty = specialty;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getContactId() {
        return contactId;
    }

    public void setContactId(String contactId) {
        this.contactId = contactId;
    }

    public String getTenantId() {
        return tenantId;
    }

    public void setTenantId(String tenantId) {
        this.tenantId = tenantId;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
