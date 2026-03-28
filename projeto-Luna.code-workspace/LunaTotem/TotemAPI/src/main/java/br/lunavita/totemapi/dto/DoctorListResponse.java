package br.lunavita.totemapi.dto;

/**
 * DTO de resposta simplificada para listagem de médicos
 */
public class DoctorListResponse {

    private String id;
    private String name;
    private String specialty;
    private String crm;
    private String phone;

    public DoctorListResponse() {
    }

    public DoctorListResponse(String id, String name, String specialty, String crm, String phone) {
        this.id = id;
        this.name = name;
        this.specialty = specialty;
        this.crm = crm;
        this.phone = phone;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSpecialty() {
        return specialty;
    }

    public void setSpecialty(String specialty) {
        this.specialty = specialty;
    }

    public String getCrm() {
        return crm;
    }

    public void setCrm(String crm) {
        this.crm = crm;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }
}
