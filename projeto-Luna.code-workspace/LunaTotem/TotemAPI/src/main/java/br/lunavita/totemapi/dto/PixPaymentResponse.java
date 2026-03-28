package br.lunavita.totemapi.dto;

public class PixPaymentResponse {
    private String paymentId;
    private String qrCodeImage;
    private String qrCodeText;
    private String appointmentId;
    private String status;

    public PixPaymentResponse() {
    }

    public PixPaymentResponse(String paymentId, String qrCodeImage, String qrCodeText, String appointmentId,
            String status) {
        this.paymentId = paymentId;
        this.qrCodeImage = qrCodeImage;
        this.qrCodeText = qrCodeText;
        this.appointmentId = appointmentId;
        this.status = status;
    }

    public String getPaymentId() {
        return paymentId;
    }

    public void setPaymentId(String paymentId) {
        this.paymentId = paymentId;
    }

    public String getQrCodeImage() {
        return qrCodeImage;
    }

    public void setQrCodeImage(String qrCodeImage) {
        this.qrCodeImage = qrCodeImage;
    }

    public String getQrCodeText() {
        return qrCodeText;
    }

    public void setQrCodeText(String qrCodeText) {
        this.qrCodeText = qrCodeText;
    }

    public String getAppointmentId() {
        return appointmentId;
    }

    public void setAppointmentId(String appointmentId) {
        this.appointmentId = appointmentId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
