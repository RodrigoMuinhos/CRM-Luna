package br.lunavita.totemapi.model;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "appointments")
public class Appointment {

    @Id
    private String id;

    @Column(name = "tenant_id", nullable = false)
    private String tenantId;

    @Column(nullable = false)
    private String patient;

    @Column(name = "patient_id", nullable = false)
    private String patientId;

    @Column(name = "doctor_id")
    private String doctorId;

    @Column
    private String doctor;

    @Column
    private String specialty;

    @Column(nullable = false)
    private String type;

    @Column(name = "patient_email")
    private String patientEmail;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false)
    private String time;

    @Column(nullable = false)
    private String status;

    @Column(nullable = false)
    private boolean paid;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private String cpf;

    @Column(name = "photo_url")
    private String photoUrl;

    public Appointment() {
    }

    public Appointment(String id, String tenantId, String patient, String patientId, String doctor, String specialty,
            LocalDate date, String time, String status, boolean paid, BigDecimal amount, String cpf, String type,
            String patientEmail) {
        this.id = id;
        this.tenantId = tenantId;
        this.patient = patient;
        this.patientId = patientId;
        this.doctor = doctor;
        this.specialty = specialty;
        this.date = date;
        this.time = time;
        this.status = status;
        this.paid = paid;
        this.amount = amount;
        this.cpf = cpf;
        this.type = type;
        this.patientEmail = patientEmail;
    }

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

    public String getPatient() {
        return patient;
    }

    public void setPatient(String patient) {
        this.patient = patient;
    }

    public String getPatientId() {
        return patientId;
    }

    public void setPatientId(String patientId) {
        this.patientId = patientId;
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

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public boolean isPaid() {
        return paid;
    }

    public void setPaid(boolean paid) {
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

    public String getPhotoUrl() {
        return photoUrl;
    }

    public void setPhotoUrl(String photoUrl) {
        this.photoUrl = photoUrl;
    }

    public String getPatientEmail() {
        return patientEmail;
    }

    public void setPatientEmail(String patientEmail) {
        this.patientEmail = patientEmail;
    }

    public String getDoctorId() {
        return doctorId;
    }

    public void setDoctorId(String doctorId) {
        this.doctorId = doctorId;
    }
}
