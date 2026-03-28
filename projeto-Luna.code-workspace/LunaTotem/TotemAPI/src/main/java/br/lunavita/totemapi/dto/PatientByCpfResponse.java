package br.lunavita.totemapi.dto;

/**
 * DTO de resposta simplificada para busca de paciente por CPF
 */
public class PatientByCpfResponse {

    private String id;
    private String name;
    private String email;
    private String cpf;
    private String phone;

    public PatientByCpfResponse() {
    }

    public PatientByCpfResponse(String id, String name, String email, String cpf, String phone) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.cpf = cpf;
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

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
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
}
