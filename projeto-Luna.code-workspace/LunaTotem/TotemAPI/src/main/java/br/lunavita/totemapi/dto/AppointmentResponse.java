package br.lunavita.totemapi.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonFormat;

/**
 * DTO de resposta para consulta criada
 */
public class AppointmentResponse {

    private String id;
    private String tenantId;
    private String patientId;
    private String patient;
    private String patientEmail;
    
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate date;
    
    private String time;
    private String type;
    private String status;
    private Boolean paid;
    private BigDecimal amount;
    private String cpf;
    
    private String doctorId;
    private String doctor;
    private String specialty;

    public AppointmentResponse() {
    }

    public AppointmentResponse(String id, String tenantId, String patientId, String patient, 
                               String patientEmail, LocalDate date, String time, String type, 
                               String status, Boolean paid, BigDecimal amount, String cpf,
                               String doctorId, String doctor, String specialty) {
        this.id = id;
        this.tenantId = tenantId;
        this.patientId = patientId;
        this.patient = patient;
        this.patientEmail = patientEmail;
        this.date = date;
        this.time = time;
        this.type = type;
        this.status = status;
        this.paid = paid;
        this.amount = amount;
        this.cpf = cpf;
        this.doctorId = doctorId;
        this.doctor = doctor;
        this.specialty = specialty;
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTenantId() {
        return tenantId;
    }

    public void setTenantId(String tenantId) {
        this.tenantId = tenantId;
    }

    public String getPatientId() {
        return patientId;
    }

    public void setPatientId(String patientId) {
        this.patientId = patientId;
    }

    public String getPatient() {
        return patient;
    }

    public void setPatient(String patient) {
        this.patient = patient;
    }

    public String getPatientEmail() {
        return patientEmail;
    }

    public void setPatientEmail(String patientEmail) {
        this.patientEmail = patientEmail;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public String getTime() {
        return time;
    }

    public void setTime(String time) {
        this.time = time;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Boolean getPaid() {
        return paid;
    }

    public void setPaid(Boolean paid) {
        this.paid = paid;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getCpf() {
        return cpf;
    }

    public void setCpf(String cpf) {
        this.cpf = cpf;
    }

    public String getDoctorId() {
        return doctorId;
    }

    public void setDoctorId(String doctorId) {
        this.doctorId = doctorId;
    }

    public String getDoctor() {
        return doctor;
    }

    public void setDoctor(String doctor) {
        this.doctor = doctor;
    }

    public String getSpecialty() {
        return specialty;
    }

    public void setSpecialty(String specialty) {
        this.specialty = specialty;
    }
}
