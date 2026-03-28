package br.lunavita.totemapi.dto;

import java.math.BigDecimal;

public class AsaasPixRequest {
    private String customer;
    private String billingType = "PIX";
    private BigDecimal value;
    private String description;
    private String externalReference;

    public AsaasPixRequest() {
    }

    public AsaasPixRequest(String customer, BigDecimal value, String description, String externalReference) {
        this.customer = customer;
        this.value = value;
        this.description = description;
        this.externalReference = externalReference;
    }

    public String getCustomer() {
        return customer;
    }

    public void setCustomer(String customer) {
        this.customer = customer;
    }

    public String getBillingType() {
        return billingType;
    }

    public void setBillingType(String billingType) {
        this.billingType = billingType;
    }

    public BigDecimal getValue() {
        return value;
    }

    public void setValue(BigDecimal value) {
        this.value = value;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getExternalReference() {
        return externalReference;
    }

    public void setExternalReference(String externalReference) {
        this.externalReference = externalReference;
    }
}
