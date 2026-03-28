package br.lunavita.totemapi.dto;

public class AsaasWebhookEvent {
    private String event;
    private Payment payment;

    public static class Payment {
        private String id;
        private String status;
        private String externalReference;
        private String confirmedDate;

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public String getExternalReference() {
            return externalReference;
        }

        public void setExternalReference(String externalReference) {
            this.externalReference = externalReference;
        }

        public String getConfirmedDate() {
            return confirmedDate;
        }

        public void setConfirmedDate(String confirmedDate) {
            this.confirmedDate = confirmedDate;
        }
    }

    public String getEvent() {
        return event;
    }

    public void setEvent(String event) {
        this.event = event;
    }

    public Payment getPayment() {
        return payment;
    }

    public void setPayment(Payment payment) {
        this.payment = payment;
    }
}
