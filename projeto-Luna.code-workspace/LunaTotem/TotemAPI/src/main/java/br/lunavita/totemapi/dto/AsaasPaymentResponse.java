package br.lunavita.totemapi.dto;

import java.math.BigDecimal;

public class AsaasPaymentResponse {
    private String id;
    private String customer;
    private BigDecimal value;
    private BigDecimal netValue;
    private String status;
    private String billingType;
    private String description;
    private String externalReference;
    private String invoiceUrl;
    private String pixQrCodeId;

    public AsaasPaymentResponse() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getCustomer() {
        return customer;
    }

    public void setCustomer(String customer) {
        this.customer = customer;
    }

    public BigDecimal getValue() {
        return value;
    }

    public void setValue(BigDecimal value) {
        this.value = value;
    }

    public BigDecimal getNetValue() {
        return netValue;
    }

    public void setNetValue(BigDecimal netValue) {
        this.netValue = netValue;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getBillingType() {
        return billingType;
    }

    public void setBillingType(String billingType) {
        this.billingType = billingType;
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

    public String getInvoiceUrl() {
        return invoiceUrl;
    }

    public void setInvoiceUrl(String invoiceUrl) {
        this.invoiceUrl = invoiceUrl;
    }

    public String getPixQrCodeId() {
        return pixQrCodeId;
    }

    public void setPixQrCodeId(String pixQrCodeId) {
        this.pixQrCodeId = pixQrCodeId;
    }
}
