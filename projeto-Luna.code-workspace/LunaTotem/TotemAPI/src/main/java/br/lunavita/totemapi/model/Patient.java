package br.lunavita.totemapi.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "patients")
public class Patient {

    @Id
    private String id;

    @Column(name = "tenant_id", nullable = false)
    private String tenantId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String cpf;

    @Column(nullable = false)
    private String phone;

    private String email;

    @Column(name = "birth_date")
    private String birthDate;

    @Column(name = "ghl_contact_id", unique = true)
    private String ghlContactId;

    private String address;

    @Column(name = "health_plan")
    private String healthPlan;

    @Column(columnDefinition = "TEXT")
    private String notes;

    public Patient() {
    }

    public Patient(String id, String tenantId, String name, String cpf, String phone, String email, String birthDate,
            String address, String healthPlan, String notes) {
        this.id = id;
        this.tenantId = tenantId;
        this.name = name;
        this.cpf = cpf;
        this.phone = phone;
        this.email = email;
        this.birthDate = birthDate;
        this.address = address;
        this.healthPlan = healthPlan;
        this.notes = notes;
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

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCpf() {
        return cpf;
    }

    public void setCpf(String cpf) {
        this.cpf = cpf;
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

    public String getGhlContactId() {
        return ghlContactId;
    }

    public void setGhlContactId(String ghlContactId) {
        this.ghlContactId = ghlContactId;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getHealthPlan() {
        return healthPlan;
    }

    public void setHealthPlan(String healthPlan) {
        this.healthPlan = healthPlan;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
