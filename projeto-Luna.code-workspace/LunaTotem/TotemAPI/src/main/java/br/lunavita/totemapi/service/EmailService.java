package br.lunavita.totemapi.service;

import br.lunavita.totemapi.model.Appointment;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
public class EmailService {

  private static final Logger logger = LoggerFactory.getLogger(EmailService.class);
  private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

  private final JavaMailSender mailSender;

  @Value("${spring.mail.username:}")
  private String fromEmail;

  @Value("${spring.mail.password:}")
  private String mailPassword;

  @Value("${clinic.name:Totem Lunavita}")
  private String clinicName;

  @Value("${clinic.address:Rua das Flores, 123 - Fortaleza - CE}")
  private String clinicAddress;

  @Value("${clinic.phone:(85) 4002-8922}")
  private String clinicPhone;

  @Value("${clinic.map-url:https://maps.google.com}")
  private String clinicMapUrl;

  @Value("${support.email:}")
  private String supportEmail;

  public EmailService(JavaMailSender mailSender) {
    this.mailSender = mailSender;
  }

  public void sendPasswordResetEmail(String toEmail, String resetToken, String frontendUrl) {
    String resetLink = frontendUrl + "/reset-password?token=" + resetToken;

    SimpleMailMessage message = new SimpleMailMessage();
    message.setFrom(fromEmail);
    message.setTo(toEmail);
    message.setSubject("Recuperação de Senha - Totem Lunavita");
    message.setText("""
        Olá,

        Você solicitou a recuperação de senha para o sistema Totem Lunavita.

        Clique no link abaixo para redefinir sua senha:
        %s

        Este link expira em 1 hora.

        Se você não solicitou esta recuperação, ignore este email.

        Atenciosamente,
        Equipe Lunavita
        """.formatted(resetLink));

    sendSimpleMessage(message, "password reset", toEmail);
  }

  public void sendWelcomeEmail(String toEmail, String role) {
    SimpleMailMessage message = new SimpleMailMessage();
    message.setFrom(fromEmail);
    message.setTo(toEmail);
    message.setSubject("Bem-vindo ao Totem Lunavita");
    message.setText("""
        Olá,

        Seu cadastro no sistema Totem Lunavita foi realizado com sucesso!

        Perfil: %s

        Você já pode fazer login no sistema.

        Atenciosamente,
        Equipe Lunavita
        """.formatted(role));

    sendSimpleMessage(message, "welcome email", toEmail);
  }

  public void sendAccessRequestNotification(String requesterEmail, String cpf, String role, String name) {
    String recipient = resolveSupportRecipient();
    if (recipient == null || recipient.isBlank()) {
      logger.info("Access request not sent because no recipient is configured (requester: {})", requesterEmail);
      return;
    }

    SimpleMailMessage message = new SimpleMailMessage();
    message.setFrom(fromEmail);
    message.setTo(recipient);
    message.setSubject("Novo pedido de acesso - Totem Lunavita");

    StringBuilder body = new StringBuilder();
    body.append("Um novo pedido de acesso foi recebido.\n\n");
    body.append("Nome: ").append(name == null || name.isBlank() ? "-" : name).append("\n");
    body.append("E-mail: ").append(requesterEmail).append("\n");
    body.append("CPF: ").append(cpf == null ? "-" : cpf).append("\n");
    body.append("Perfil desejado: ").append(role == null ? "-" : role).append("\n");
    body.append("\nContate o solicitante para finalizar o cadastro.\n");
    message.setText(body.toString());

    sendSimpleMessage(message, "access request notification", recipient);
  }

  public void sendAppointmentConfirmation(String toEmail, Appointment appointment) {
    sendAppointmentHtmlToPatient(toEmail, appointment);
  }

  @Async
  public void sendAppointmentHtmlToPatient(String toEmail, Appointment appointment) {
    logger.info("[EMAIL-ASYNC] Iniciando envio assíncrono para paciente: {}", toEmail);
    String html = buildPatientHtml(appointment);
    sendHtmlMessage(toEmail, "Confirmação de Consulta - " + clinicName, html,
        "patient appointment confirmation");
  }

  @Async
  public void sendAppointmentHtmlToDoctor(String toEmail, Appointment appointment) {
    logger.info("[EMAIL-ASYNC] Iniciando envio assíncrono para médico: {}", toEmail);
    String html = buildDoctorHtml(appointment);
    sendHtmlMessage(toEmail, "Nova consulta agendada - " + clinicName, html,
        "doctor appointment notification");
  }

  public void sendPaymentReceipt(String toEmail, Appointment appointment, String method) {
    if (toEmail == null || toEmail.isBlank()) {
      logger.info("Skipping payment receipt, no recipient email provided");
      return;
    }

    SimpleMailMessage message = new SimpleMailMessage();
    message.setFrom(fromEmail);
    message.setTo(toEmail);
    message.setSubject("Recibo de Pagamento - " + clinicName);

    StringBuilder body = new StringBuilder();
    body.append("Olá, ").append(appointment.getPatient()).append("!\n\n");
    body.append("Recebemos o pagamento da sua consulta.\n\n");
    body.append("Detalhes do Atendimento:\n");
    body.append("Tipo: ").append(appointment.getType()).append("\n");
    body.append("Profissional: ").append(appointment.getDoctor()).append("\n");
    body.append("Data e horário: ").append(appointment.getDate()).append(" às ")
        .append(appointment.getTime()).append("\n\n");
    body.append("Pagamento:\n");
    body.append("Valor pago: R$ ").append(appointment.getAmount()).append("\n");
    if (method != null && !method.isBlank()) {
      body.append("Forma de pagamento: ").append(method).append("\n");
    }
    body.append("ID da consulta: ").append(appointment.getId()).append("\n\n");
    body.append("Em caso de dúvidas, fale conosco: \n");
    body.append("Telefone/WhatsApp: ").append(clinicPhone).append("\n\n");
    body.append("Obrigado pela confiança!\n");
    body.append(clinicName);

    message.setText(body.toString());
    sendSimpleMessage(message, "payment receipt", toEmail);
  }

  private void sendSimpleMessage(SimpleMailMessage message, String context, String toEmail) {
    if (!isMailConfigured()) {
      logger.info("Email not sent (dev or missing SMTP credentials) -> to: {} subject: {}", toEmail,
          message.getSubject());
      return;
    }
    try {
      mailSender.send(message);
    } catch (Exception ex) {
      logger.warn("Failed to send {} to {} - exception will be swallowed in dev: {}", context, toEmail,
          ex.toString());
    }
  }

  private void sendHtmlMessage(String toEmail, String subject, String htmlBody, String context) {
    if (toEmail == null || toEmail.isBlank()) {
      logger.info("Skipping {}, no recipient email provided", context);
      return;
    }
    if (!isMailConfigured()) {
      logger.info("Email not sent (dev or missing SMTP credentials) -> to: {} subject: {}", toEmail, subject);
      logger.info("Mail config check: fromEmail='{}', hasPassword={}", fromEmail,
          (mailPassword != null && !mailPassword.isBlank()));
      return;
    }
    try {
      logger.info("Attempting to send {} email to: {}", context, toEmail);
      MimeMessage mimeMessage = mailSender.createMimeMessage();
      MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "UTF-8");
      helper.setFrom(fromEmail);
      helper.setTo(toEmail);
      helper.setSubject(subject);
      helper.setText(htmlBody, true);
      mailSender.send(mimeMessage);
      logger.info("Successfully sent {} email to: {}", context, toEmail);
    } catch (Exception ex) {
      logger.error("Failed to send {} to {} - error: {}", context, toEmail, ex.getMessage(), ex);
    }
  }

  private boolean isMailConfigured() {
    return fromEmail != null && !fromEmail.isBlank() && mailPassword != null && !mailPassword.isBlank();
  }

  private String resolveSupportRecipient() {
    if (supportEmail != null && !supportEmail.isBlank()) {
      return supportEmail;
    }
    return fromEmail;
  }

  private String buildPatientHtml(Appointment appointment) {
    String template = """
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <title>Confirmação de Consulta - Totem LunaVita</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body style="margin:0;padding:0;background-color:#f3f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1f2933;">
          <div style="width:100%;padding:24px 0;">
            <div style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.08);">

              <div style="background:linear-gradient(135deg,#0ea5e9,#22c55e);padding:24px 32px;text-align:left;color:#ffffff;">
                <div style="font-size:20px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">TOTEM LUNAVITA</div>
                <div style="margin-top:8px;font-size:13px;opacity:0.9;">Cuidado em cada detalhe da sua jornada de saúde.</div>
                <div style="margin-top:20px;font-size:22px;font-weight:600;">Consulta confirmada ✅</div>
              </div>

              <div style="padding:24px 32px 28px 32px;font-size:14px;line-height:1.6;">
                <p style="margin:0 0 12px 0;">Olá, <span style="font-weight:600;color:#0369a1;">{{pacienteNome}}</span>!</p>
                <p style="margin:0 0 12px 0;">
                  Sua consulta foi confirmada em nosso sistema. Abaixo estão todos os detalhes
                  para que sua experiência na LunaVita seja tranquila e organizada.
                </p>

                <div style="font-size:15px;font-weight:600;color:#0f172a;margin:18px 0 8px 0;">📅 Dados da consulta</div>
                <div style="border-radius:10px;border:1px solid #e2e8f0;padding:12px 14px;background-color:#f9fafb;margin-bottom:12px;">
                  <p style="margin:4px 0;"><span style="font-weight:600;color:#111827;">Tipo:</span> {{tipoConsulta}}</p>
                  <p style="margin:4px 0;"><span style="font-weight:600;color:#111827;">Profissional:</span> {{medicoNome}}</p>
                  <p style="margin:4px 0;"><span style="font-weight:600;color:#111827;">Especialidade:</span> {{especialidade}}</p>
                  <p style="margin:4px 0;"><span style="font-weight:600;color:#111827;">Data:</span> {{dataConsulta}}</p>
                  <p style="margin:4px 0;"><span style="font-weight:600;color:#111827;">Horário:</span> {{horario}}</p>
                  <p style="margin:4px 0;"><span style="font-weight:600;color:#111827;">Valor:</span> R$ {{valor}}</p>
                </div>

                <div style="font-size:15px;font-weight:600;color:#0f172a;margin:18px 0 8px 0;">📍 Local do atendimento</div>
                <div style="border-radius:10px;border:1px solid #e2e8f0;padding:12px 14px;background-color:#f9fafb;margin-bottom:12px;">
                  <p style="margin:4px 0;"><span style="font-weight:600;color:#111827;">Clínica:</span> {{clinicName}}</p>
                  <p style="margin:4px 0;">{{clinicAddress}}</p>
                  <p style="margin:4px 0;"><span style="font-weight:600;color:#111827;">Telefone:</span> {{clinicPhone}}</p>
                </div>

                <p style="margin:0 0 12px 0;">
                  <span style="font-weight:600;color:#111827;">Chegue com 10 minutos de antecedência</span> para garantir
                  um atendimento ainda mais confortável.
                </p>

                <div style="font-size:15px;font-weight:600;color:#0f172a;margin:18px 0 8px 0;">🧾 O que levar</div>
                <ul style="padding-left:18px;margin:8px 0 12px 0;">
                  <li style="margin-bottom:4px;">Documento oficial com foto;</li>
                  <li style="margin-bottom:4px;">Pedido médico, se houver;</li>
                  <li style="margin-bottom:4px;">Exames ou resultados anteriores relacionados ao motivo da consulta.</li>
                </ul>

                <div style="font-size:15px;font-weight:600;color:#0f172a;margin:18px 0 8px 0;">⚠️ Orientações importantes</div>
                <ul style="padding-left:18px;margin:8px 0 12px 0;">
                  <li style="margin-bottom:4px;">
                    Caso o procedimento ou exame exija preparo, confirme com nossa equipe
                    sobre jejum, hidratação e uso de medicações.
                  </li>
                  <li style="margin-bottom:4px;">
                    Em caso de novos sintomas, alergias ou início de medicamentos recentes,
                    informe o profissional antes do atendimento.
                  </li>
                  <li style="margin-bottom:4px;">
                    Para reagendamentos ou cancelamentos, pedimos que avise com antecedência.
                  </li>
                </ul>

                <div style="font-size:15px;font-weight:600;color:#0f172a;margin:18px 0 8px 0;">📞 Dúvidas ou alterações?</div>
                <p style="margin:0 0 12px 0;">
                  Nossa equipe está à disposição para ajudar você pelo WhatsApp ou telefone:
                </p>
                <p style="margin:0 0 12px 0;">
                  <strong>WhatsApp:</strong> {{clinicPhone}}<br />
                  <strong>E-mail:</strong> {{supportEmail}}
                </p>

                <div style="font-size:12px;color:#6b7280;text-align:center;margin-top:18px;border-top:1px solid #e5e7eb;padding-top:14px;">
                  <p style="margin:0 0 8px 0;">
                    Agradecemos a confiança.<br />
                    <strong style="color:#111827;">Será um prazer receber você na LunaVita.</strong>
                  </p>
                  <p style="margin:0;">{{clinicName}} • Fortaleza - CE</p>
                </div>
              </div>
            </div>
          </div>
        </body>
        </html>
                        """;

    return template
        .replace("{{clinicName}}", escape(clinicName))
        .replace("{{pacienteNome}}", escape(appointment.getPatient()))
        .replace("{{medicoNome}}", escape(appointment.getDoctor()))
        .replace("{{especialidade}}", escape(appointment.getSpecialty()))
        .replace("{{cpf}}", escape(appointment.getCpf()))
        .replace("{{tipoConsulta}}", escape(appointment.getType()))
        .replace("{{dataConsulta}}", formatDate(appointment.getDate()))
        .replace("{{horario}}", escape(appointment.getTime()))
        .replace("{{valor}}", formatAmount(appointment.getAmount()))
        .replace("{{clinicAddress}}", escape(clinicAddress))
        .replace("{{clinicPhone}}", escape(clinicPhone))
        .replace("{{supportEmail}}", escape(resolveSupportRecipient()))
        .replace("{{mapUrl}}", escape(clinicMapUrl))
        .replace("{{currentYear}}", String.valueOf(LocalDate.now().getYear()));
  }

  private String buildDoctorHtml(Appointment appointment) {
    String template = """
        <div style="font-family: 'Arial', sans-serif; background: #f7f7f7; padding: 30px;">
          <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
            <div style="background: #2e5f55; padding: 25px; text-align: center;">
              <h2 style="margin: 0; color: #ffffff; font-weight: bold;">Nova consulta confirmada</h2>
              <p style="margin: 5px 0 0; color: #d2ebe5;">{{clinicName}}</p>
            </div>
            <div style="padding: 30px; color: #333; line-height: 1.6;">
              <p>Olá <strong>{{medicoNome}}</strong>,</p>
              <p>Uma nova consulta foi registrada para o paciente <strong>{{pacienteNome}}</strong>.</p>
              <div style="background: #f9fbfb; padding: 15px; border-radius: 8px;">
                <p><strong>Paciente:</strong> {{pacienteNome}}</p>
                <p><strong>CPF do paciente:</strong> {{cpf}}</p>
                <p><strong>Tipo:</strong> {{tipoConsulta}}</p>
                <p><strong>Data:</strong> {{dataConsulta}}</p>
                <p><strong>Horário:</strong> {{horario}}</p>
                <p><strong>Valor previsto:</strong> R$ {{valor}}</p>
              </div>
              <p style="margin-top: 25px;">Especialidade: <strong>{{especialidade}}</strong></p>
              <p>Qualquer ajuste pode ser combinado diretamente com a recepção.</p>
              <p>Contato recepção: <strong>{{clinicPhone}}</strong></p>
              <p>Endereço: <strong>{{clinicAddress}}</strong></p>
              <p><a href="{{mapUrl}}" style="color: #2e5f55; font-weight: bold;">Ver localização</a></p>
              <p style="margin-top: 30px;">Obrigado por fazer parte da {{clinicName}}.</p>
            </div>
          </div>
        </div>
        """;

    return template
        .replace("{{clinicName}}", escape(clinicName))
        .replace("{{medicoNome}}", escape(appointment.getDoctor()))
        .replace("{{pacienteNome}}", escape(appointment.getPatient()))
        .replace("{{cpf}}", escape(appointment.getCpf()))
        .replace("{{tipoConsulta}}", escape(appointment.getType()))
        .replace("{{dataConsulta}}", formatDate(appointment.getDate()))
        .replace("{{horario}}", escape(appointment.getTime()))
        .replace("{{valor}}", formatAmount(appointment.getAmount()))
        .replace("{{especialidade}}", escape(appointment.getSpecialty()))
        .replace("{{clinicPhone}}", escape(clinicPhone))
        .replace("{{clinicAddress}}", escape(clinicAddress))
        .replace("{{mapUrl}}", escape(clinicMapUrl));
  }

  private String formatDate(LocalDate date) {
    if (date == null) {
      return "-";
    }
    return DATE_FORMATTER.format(date);
  }

  private String formatAmount(BigDecimal amount) {
    BigDecimal safe = amount != null ? amount : BigDecimal.ZERO;
    NumberFormat formatter = NumberFormat.getNumberInstance(new Locale("pt", "BR"));
    formatter.setMinimumFractionDigits(2);
    formatter.setMaximumFractionDigits(2);
    return formatter.format(safe);
  }

  private String escape(String value) {
    return HtmlUtils.htmlEscape(value == null ? "" : value);
  }
}
