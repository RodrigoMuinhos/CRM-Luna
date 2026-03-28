package br.lunavita.totemapi.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.Map;

/**
 * DTO para receber dados do webhook do CRM
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class CrmWebhookPayload {
    private Map<String, String> headers;
    private Map<String, Object> params;
    private Map<String, Object> query;
    private CrmContactBody body;
    private String webhookUrl;
    private String executionMode;

    public Map<String, String> getHeaders() {
        return headers;
    }

    public void setHeaders(Map<String, String> headers) {
        this.headers = headers;
    }

    public Map<String, Object> getParams() {
        return params;
    }

    public void setParams(Map<String, Object> params) {
        this.params = params;
    }

    public Map<String, Object> getQuery() {
        return query;
    }

    public void setQuery(Map<String, Object> query) {
        this.query = query;
    }

    public CrmContactBody getBody() {
        return body;
    }

    public void setBody(CrmContactBody body) {
        this.body = body;
    }

    public String getWebhookUrl() {
        return webhookUrl;
    }

    public void setWebhookUrl(String webhookUrl) {
        this.webhookUrl = webhookUrl;
    }

    public String getExecutionMode() {
        return executionMode;
    }

    public void setExecutionMode(String executionMode) {
        this.executionMode = executionMode;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CrmContactBody {
        @JsonProperty("Link Kommo")
        private String linkKommo;

        @JsonProperty("Bairro")
        private String bairro;

        @JsonProperty("E-mail")
        private String emailSecundario;

        @JsonProperty("Convênio")
        private String convenio;

        @JsonProperty("Nome Completo")
        private String nomeCompleto;

        @JsonProperty("Observação")
        private String observacao;

        @JsonProperty("Valor")
        private Double valor;

        @JsonProperty("Interesse")
        private String interesse;

        @JsonProperty("Link pagamento")
        private String linkPagamento;

        @JsonProperty("Paciente")
        private List<String> paciente;

        @JsonProperty("Última mensagem")
        private String ultimaMensagem;

        @JsonProperty("CEP (só números)")
        private String cep;

        @JsonProperty("Número")
        private String numero;

        @JsonProperty("Logradouro")
        private String logradouro;

        @JsonProperty("Pago?")
        private String pago;

        @JsonProperty("Data de nascimento")
        private String dataNascimento;

        @JsonProperty("Pré-natal")
        private String preNatal;

        @JsonProperty("Pendência")
        private List<String> pendencia;

        @JsonProperty("Complemento")
        private String complemento;

        @JsonProperty("CPF")
        private String cpf;

        @JsonProperty("contact_id")
        private String contactId;

        @JsonProperty("first_name")
        private String firstName;

        @JsonProperty("last_name")
        private String lastName;

        @JsonProperty("full_name")
        private String fullName;

        @JsonProperty("email")
        private String email;

        @JsonProperty("phone")
        private String phone;

        @JsonProperty("tags")
        private String tags;

        @JsonProperty("country")
        private String country;

        @JsonProperty("timezone")
        private String timezone;

        @JsonProperty("date_created")
        private String dateCreated;

        @JsonProperty("full_address")
        private String fullAddress;

        @JsonProperty("contact_type")
        private String contactType;

        @JsonProperty("location")
        private CrmLocation location;

        @JsonProperty("user")
        private CrmUser user;

        @JsonProperty("workflow")
        private CrmWorkflow workflow;

        @JsonProperty("triggerData")
        private Map<String, Object> triggerData;

        @JsonProperty("customData")
        private Map<String, Object> customData;

        // Getters and Setters
        public String getLinkKommo() {
            return linkKommo;
        }

        public void setLinkKommo(String linkKommo) {
            this.linkKommo = linkKommo;
        }

        public String getBairro() {
            return bairro;
        }

        public void setBairro(String bairro) {
            this.bairro = bairro;
        }

        public String getEmailSecundario() {
            return emailSecundario;
        }

        public void setEmailSecundario(String emailSecundario) {
            this.emailSecundario = emailSecundario;
        }

        public String getConvenio() {
            return convenio;
        }

        public void setConvenio(String convenio) {
            this.convenio = convenio;
        }

        public String getNomeCompleto() {
            return nomeCompleto;
        }

        public void setNomeCompleto(String nomeCompleto) {
            this.nomeCompleto = nomeCompleto;
        }

        public String getObservacao() {
            return observacao;
        }

        public void setObservacao(String observacao) {
            this.observacao = observacao;
        }

        public Double getValor() {
            return valor;
        }

        public void setValor(Double valor) {
            this.valor = valor;
        }

        public String getInteresse() {
            return interesse;
        }

        public void setInteresse(String interesse) {
            this.interesse = interesse;
        }

        public String getLinkPagamento() {
            return linkPagamento;
        }

        public void setLinkPagamento(String linkPagamento) {
            this.linkPagamento = linkPagamento;
        }

        public List<String> getPaciente() {
            return paciente;
        }

        public void setPaciente(List<String> paciente) {
            this.paciente = paciente;
        }

        public String getUltimaMensagem() {
            return ultimaMensagem;
        }

        public void setUltimaMensagem(String ultimaMensagem) {
            this.ultimaMensagem = ultimaMensagem;
        }

        public String getCep() {
            return cep;
        }

        public void setCep(String cep) {
            this.cep = cep;
        }

        public String getNumero() {
            return numero;
        }

        public void setNumero(String numero) {
            this.numero = numero;
        }

        public String getLogradouro() {
            return logradouro;
        }

        public void setLogradouro(String logradouro) {
            this.logradouro = logradouro;
        }

        public String getPago() {
            return pago;
        }

        public void setPago(String pago) {
            this.pago = pago;
        }

        public String getDataNascimento() {
            return dataNascimento;
        }

        public void setDataNascimento(String dataNascimento) {
            this.dataNascimento = dataNascimento;
        }

        public String getPreNatal() {
            return preNatal;
        }

        public void setPreNatal(String preNatal) {
            this.preNatal = preNatal;
        }

        public List<String> getPendencia() {
            return pendencia;
        }

        public void setPendencia(List<String> pendencia) {
            this.pendencia = pendencia;
        }

        public String getComplemento() {
            return complemento;
        }

        public void setComplemento(String complemento) {
            this.complemento = complemento;
        }

        public String getCpf() {
            return cpf;
        }

        public void setCpf(String cpf) {
            this.cpf = cpf;
        }

        public String getContactId() {
            return contactId;
        }

        public void setContactId(String contactId) {
            this.contactId = contactId;
        }

        public String getFirstName() {
            return firstName;
        }

        public void setFirstName(String firstName) {
            this.firstName = firstName;
        }

        public String getLastName() {
            return lastName;
        }

        public void setLastName(String lastName) {
            this.lastName = lastName;
        }

        public String getFullName() {
            return fullName;
        }

        public void setFullName(String fullName) {
            this.fullName = fullName;
        }

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getPhone() {
            return phone;
        }

        public void setPhone(String phone) {
            this.phone = phone;
        }

        public String getTags() {
            return tags;
        }

        public void setTags(String tags) {
            this.tags = tags;
        }

        public String getCountry() {
            return country;
        }

        public void setCountry(String country) {
            this.country = country;
        }

        public String getTimezone() {
            return timezone;
        }

        public void setTimezone(String timezone) {
            this.timezone = timezone;
        }

        public String getDateCreated() {
            return dateCreated;
        }

        public void setDateCreated(String dateCreated) {
            this.dateCreated = dateCreated;
        }

        public String getFullAddress() {
            return fullAddress;
        }

        public void setFullAddress(String fullAddress) {
            this.fullAddress = fullAddress;
        }

        public String getContactType() {
            return contactType;
        }

        public void setContactType(String contactType) {
            this.contactType = contactType;
        }

        public CrmLocation getLocation() {
            return location;
        }

        public void setLocation(CrmLocation location) {
            this.location = location;
        }

        public CrmUser getUser() {
            return user;
        }

        public void setUser(CrmUser user) {
            this.user = user;
        }

        public CrmWorkflow getWorkflow() {
            return workflow;
        }

        public void setWorkflow(CrmWorkflow workflow) {
            this.workflow = workflow;
        }

        public Map<String, Object> getTriggerData() {
            return triggerData;
        }

        public void setTriggerData(Map<String, Object> triggerData) {
            this.triggerData = triggerData;
        }

        public Map<String, Object> getCustomData() {
            return customData;
        }

        public void setCustomData(Map<String, Object> customData) {
            this.customData = customData;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CrmLocation {
        private String name;
        private String address;
        private String city;
        private String state;
        private String country;
        private String postalCode;
        private String fullAddress;
        private String id;

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getAddress() {
            return address;
        }

        public void setAddress(String address) {
            this.address = address;
        }

        public String getCity() {
            return city;
        }

        public void setCity(String city) {
            this.city = city;
        }

        public String getState() {
            return state;
        }

        public void setState(String state) {
            this.state = state;
        }

        public String getCountry() {
            return country;
        }

        public void setCountry(String country) {
            this.country = country;
        }

        public String getPostalCode() {
            return postalCode;
        }

        public void setPostalCode(String postalCode) {
            this.postalCode = postalCode;
        }

        public String getFullAddress() {
            return fullAddress;
        }

        public void setFullAddress(String fullAddress) {
            this.fullAddress = fullAddress;
        }

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CrmUser {
        private String firstName;
        private String lastName;
        private String email;

        public String getFirstName() {
            return firstName;
        }

        public void setFirstName(String firstName) {
            this.firstName = firstName;
        }

        public String getLastName() {
            return lastName;
        }

        public void setLastName(String lastName) {
            this.lastName = lastName;
        }

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CrmWorkflow {
        private String id;
        private String name;

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
    }
}
