package br.lunavita.totemapi.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public class GhlPatientWebhookDto {

    @JsonProperty("contact_id")
    @JsonAlias({"contactId", "contactid"})
    private String contactId;

    @JsonProperty("full_name")
    @JsonAlias({"fullName", "name"})
    private String fullName;

    @JsonAlias({"phone_number", "mobile", "phoneNumber"})
    private String phone;

    @JsonAlias({"cpf_cnpj", "document"})
    private String cpf;

    private String email;

    @JsonProperty("birth_date")
    @JsonAlias({"birthDate", "date_of_birth"})
    private String birthDate;

    private String notes;

    @JsonProperty("tenant_id")
    @JsonAlias({"tenantId"})
    private String tenantId;

    @JsonProperty("event_type")
    @JsonAlias({"event", "eventType"})
    private String eventType;

    public String getContactId() {
        return contactId;
    }

    public void setContactId(String contactId) {
        this.contactId = contactId;
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

    public String getCpf() {
        return cpf;
    }

    public void setCpf(String cpf) {
        this.cpf = cpf;
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

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public String getTenantId() {
        return tenantId;
    }

    public void setTenantId(String tenantId) {
        this.tenantId = tenantId;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }
}
