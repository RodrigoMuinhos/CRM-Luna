package br.lunavita.totemapi.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Entidade para auditoria de acesso a dados pessoais (requisito LGPD Art. 37)
 */
@Entity
@Table(name = "data_access_logs", indexes = {
        @Index(name = "idx_patient_id", columnList = "patient_id"),
        @Index(name = "idx_accessed_at", columnList = "accessed_at"),
        @Index(name = "idx_user_email", columnList = "user_email")
})
public class DataAccessLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "user_email", nullable = false)
    private String userEmail;

    @Column(name = "user_role", nullable = false)
    private String userRole;

    @Column(name = "action_type", nullable = false)
    private String actionType; // READ, UPDATE, DELETE, EXPORT

    @Column(name = "resource_type", nullable = false)
    private String resourceType; // PATIENT, APPOINTMENT, EXTERNAL_PAYMENT_INTENT, etc.

    @Column(name = "resource_id")
    private String resourceId;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;

    @Column(name = "accessed_at", nullable = false)
    private LocalDateTime accessedAt;

    @Column(name = "data_fields_accessed", columnDefinition = "TEXT")
    private String dataFieldsAccessed; // JSON array of fields accessed

    @Column(columnDefinition = "TEXT")
    private String justification; // Justificativa para acesso

    @PrePersist
    protected void onCreate() {
        if (accessedAt == null) {
            accessedAt = LocalDateTime.now();
        }
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getPatientId() {
        return patientId;
    }

    public void setPatientId(String patientId) {
        this.patientId = patientId;
    }

    public String getUserEmail() {
        return userEmail;
    }

    public void setUserEmail(String userEmail) {
        this.userEmail = userEmail;
    }

    public String getUserRole() {
        return userRole;
    }

    public void setUserRole(String userRole) {
        this.userRole = userRole;
    }

    public String getActionType() {
        return actionType;
    }

    public void setActionType(String actionType) {
        this.actionType = actionType;
    }

    public String getResourceType() {
        return resourceType;
    }

    public void setResourceType(String resourceType) {
        this.resourceType = resourceType;
    }

    public String getResourceId() {
        return resourceId;
    }

    public void setResourceId(String resourceId) {
        this.resourceId = resourceId;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    public String getUserAgent() {
        return userAgent;
    }

    public void setUserAgent(String userAgent) {
        this.userAgent = userAgent;
    }

    public LocalDateTime getAccessedAt() {
        return accessedAt;
    }

    public void setAccessedAt(LocalDateTime accessedAt) {
        this.accessedAt = accessedAt;
    }

    public String getDataFieldsAccessed() {
        return dataFieldsAccessed;
    }

    public void setDataFieldsAccessed(String dataFieldsAccessed) {
        this.dataFieldsAccessed = dataFieldsAccessed;
    }

    public String getJustification() {
        return justification;
    }

    public void setJustification(String justification) {
        this.justification = justification;
    }
}
