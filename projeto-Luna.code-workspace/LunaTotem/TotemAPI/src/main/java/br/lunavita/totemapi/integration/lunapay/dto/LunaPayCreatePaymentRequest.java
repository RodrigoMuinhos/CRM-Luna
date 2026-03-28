package br.lunavita.totemapi.integration.lunapay.dto;

import java.math.BigDecimal;

public class LunaPayCreatePaymentRequest {

    private BigDecimal amount;
    private String description;
    private String gateway;
    private String paymentMethod;
    private Integer pixExpirationMinutes;
    private Customer customer;

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getGateway() {
        return gateway;
    }

    public void setGateway(String gateway) {
        this.gateway = gateway;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public Integer getPixExpirationMinutes() {
        return pixExpirationMinutes;
    }

    public void setPixExpirationMinutes(Integer pixExpirationMinutes) {
        this.pixExpirationMinutes = pixExpirationMinutes;
    }

    public Customer getCustomer() {
        return customer;
    }

    public void setCustomer(Customer customer) {
        this.customer = customer;
    }

    public static class Customer {
        private String name;
        private String email;
        private String cpfCnpj;
        private String phone;

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

        public String getCpfCnpj() {
            return cpfCnpj;
        }

        public void setCpfCnpj(String cpfCnpj) {
            this.cpfCnpj = cpfCnpj;
        }

        public String getPhone() {
            return phone;
        }

        public void setPhone(String phone) {
            this.phone = phone;
        }
    }
}
