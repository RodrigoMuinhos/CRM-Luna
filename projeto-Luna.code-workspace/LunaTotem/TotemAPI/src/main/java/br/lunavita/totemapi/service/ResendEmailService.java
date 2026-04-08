package br.lunavita.totemapi.service;

import br.lunavita.totemapi.model.Appointment;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Email service using Resend API (HTTP-based, no SMTP needed)
 * This works on platforms that block SMTP like Railway
 */
@Service
public class ResendEmailService {

    private static final Logger logger = LoggerFactory.getLogger(ResendEmailService.class);
    private static final String RESEND_API_URL = "https://api.resend.com/emails";

    @Value("${resend.api.key:}")
    private String resendApiKey;

    @Value("${resend.from.email:onboarding@resend.dev}")
    private String fromEmail;

    @Value("${clinic.name:Clínica LunaVita}")
    private String clinicName;

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public ResendEmailService() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        this.objectMapper = new ObjectMapper();
    }

    @jakarta.annotation.PostConstruct
    public void init() {
        // Fallback: tentar ler diretamente da variável de ambiente se @Value não
        // funcionou
        if ((resendApiKey == null || resendApiKey.isBlank()) && System.getenv("RESEND_API_KEY") != null) {
            resendApiKey = System.getenv("RESEND_API_KEY");
            logger.debug("[RESEND] API Key carregada via System.getenv()");
        }
        if ((fromEmail == null || fromEmail.isBlank() || fromEmail.equals("onboarding@resend.dev"))
                && System.getenv("RESEND_FROM_EMAIL") != null) {
            fromEmail = System.getenv("RESEND_FROM_EMAIL");
        }

        if (isConfigured()) {
            logger.info("[RESEND] Serviço de email Resend ativo");
        } else {
            logger.warn("[RESEND] ⚠️ API Key NÃO configurada - emails não serão enviados via Resend");
        }
    }

    public boolean isConfigured() {
        return resendApiKey != null && !resendApiKey.isBlank();
    }

    @Async
    public void sendAppointmentConfirmationToPatient(String toEmail, Appointment appointment) {
        if (!isConfigured()) {
            logger.warn("[RESEND] API key não configurada, email não enviado para: {}", toEmail);
            return;
        }

        logger.info("[RESEND] Enviando confirmação para paciente: {}", toEmail);

        String subject = "✅ Confirmação de Consulta - " + clinicName;
        String html = buildPatientEmailHtml(appointment);

        sendEmail(toEmail, subject, html, "patient confirmation");
    }

    @Async
    public void sendAppointmentNotificationToDoctor(String toEmail, Appointment appointment) {
        if (!isConfigured()) {
            logger.warn("[RESEND] API key não configurada, email não enviado para: {}", toEmail);
            return;
        }

        logger.info("[RESEND] Enviando notificação para médico: {}", toEmail);

        String subject = "📋 Nova Consulta Agendada - " + clinicName;
        String html = buildDoctorEmailHtml(appointment);

        sendEmail(toEmail, subject, html, "doctor notification");
    }

    private void sendEmail(String toEmail, String subject, String htmlContent, String context) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("from", clinicName + " <" + fromEmail + ">");
            payload.put("to", List.of(toEmail));
            payload.put("subject", subject);
            payload.put("html", htmlContent);

            String jsonPayload = objectMapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(RESEND_API_URL))
                    .header("Authorization", "Bearer " + resendApiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .timeout(Duration.ofSeconds(30))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                logger.info("[RESEND] ✅ Email enviado com sucesso para {} ({})", toEmail, context);
            } else {
                logger.error("[RESEND] ❌ Erro ao enviar email para {} - Status: {} - Response: {}",
                        toEmail, response.statusCode(), response.body());
            }
        } catch (Exception e) {
            logger.error("[RESEND] ❌ Exceção ao enviar email para {} - {}", toEmail, e.getMessage(), e);
        }
    }

    private String buildPatientEmailHtml(Appointment appointment) {
        String patientName = appointment.getPatient() != null ? appointment.getPatient() : "Paciente";
        String doctorName = appointment.getDoctor() != null ? appointment.getDoctor() : "";
        String specialty = appointment.getSpecialty() != null ? appointment.getSpecialty() : "";
        String date = appointment.getDate() != null ? appointment.getDate().toString() : "";
        String time = appointment.getTime() != null ? appointment.getTime().toString() : "";
        String type = appointment.getType() != null ? appointment.getType() : "";

        return """
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                        <!-- Header -->
                        <div style="background: linear-gradient(135deg, #D3A67F 0%%, #C89769 100%%); padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">%s</h1>
                            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Confirmação de Consulta</p>
                        </div>

                        <!-- Content -->
                        <div style="padding: 40px 30px;">
                            <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">
                                Olá, <strong>%s</strong>! 👋
                            </p>
                            <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 0 0 30px 0;">
                                Sua consulta foi confirmada com sucesso. Confira os detalhes abaixo:
                            </p>

                            <!-- Appointment Card -->
                            <div style="background-color: #FEF3E7; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
                                <table style="width: 100%%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #666; font-size: 14px;">📅 Data:</td>
                                        <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 600; text-align: right;">%s</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #666; font-size: 14px;">🕐 Horário:</td>
                                        <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 600; text-align: right;">%s</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #666; font-size: 14px;">👨‍⚕️ Profissional:</td>
                                        <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 600; text-align: right;">%s</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #666; font-size: 14px;">🏥 Especialidade:</td>
                                        <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 600; text-align: right;">%s</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #666; font-size: 14px;">📋 Tipo:</td>
                                        <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 600; text-align: right;">%s</td>
                                    </tr>
                                </table>
                            </div>

                            <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0;">
                                Por favor, chegue com <strong>15 minutos de antecedência</strong> e traga um documento com foto.
                            </p>
                        </div>

                        <!-- Footer -->
                        <div style="background-color: #f8f8f8; padding: 20px 30px; text-align: center; border-top: 1px solid #eee;">
                            <p style="color: #999; font-size: 12px; margin: 0;">
                                Este é um email automático. Em caso de dúvidas, entre em contato conosco.
                            </p>
                            <p style="color: #D3A67F; font-size: 13px; margin: 10px 0 0 0; font-weight: 600;">
                                %s
                            </p>
                        </div>
                    </div>
                </body>
                </html>
                """
                .formatted(clinicName, patientName, date, time, doctorName, specialty, type, clinicName);
    }

    private String buildDoctorEmailHtml(Appointment appointment) {
        String patientName = appointment.getPatient() != null ? appointment.getPatient() : "Paciente";
        String date = appointment.getDate() != null ? appointment.getDate().toString() : "";
        String time = appointment.getTime() != null ? appointment.getTime().toString() : "";
        String type = appointment.getType() != null ? appointment.getType() : "";
        String cpf = appointment.getCpf() != null ? appointment.getCpf() : "";

        return """
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                </head>
                <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                        <div style="background: linear-gradient(135deg, #4A5568 0%%, #2D3748 100%%); padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">📋 Nova Consulta Agendada</h1>
                        </div>

                        <div style="padding: 30px;">
                            <div style="background-color: #EDF2F7; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                                <table style="width: 100%%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #666;">Paciente:</td>
                                        <td style="padding: 8px 0; color: #333; font-weight: 600; text-align: right;">%s</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #666;">CPF:</td>
                                        <td style="padding: 8px 0; color: #333; text-align: right;">%s</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #666;">Data:</td>
                                        <td style="padding: 8px 0; color: #333; font-weight: 600; text-align: right;">%s às %s</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #666;">Tipo:</td>
                                        <td style="padding: 8px 0; color: #333; text-align: right;">%s</td>
                                    </tr>
                                </table>
                            </div>
                        </div>

                        <div style="background-color: #f8f8f8; padding: 15px; text-align: center;">
                            <p style="color: #999; font-size: 12px; margin: 0;">%s - Sistema de Gestão</p>
                        </div>
                    </div>
                </body>
                </html>
                """
                .formatted(patientName, cpf, date, time, type, clinicName);
    }
}
