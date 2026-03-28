package br.lunavita.totemapi.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Base64;

/**
 * Serviço para gerar recibos no formato ESC/POS.
 * ESC/POS é o protocolo padrão para impressoras térmicas.
 */
@Service
@Slf4j
public class ReceiptGeneratorService {

    // Comandos ESC/POS
    private static final byte ESC = 0x1B;
    private static final byte GS = 0x1D;
    private static final byte LF = 0x0A;
    private static final byte CR = 0x0D;

    // Comandos de formatação
    private static final byte[] CMD_INIT = {ESC, '@'};                    // Inicializar impressora
    private static final byte[] CMD_ALIGN_LEFT = {ESC, 'a', 0};          // Alinhar à esquerda
    private static final byte[] CMD_ALIGN_CENTER = {ESC, 'a', 1};        // Alinhar ao centro
    private static final byte[] CMD_ALIGN_RIGHT = {ESC, 'a', 2};         // Alinhar à direita
    private static final byte[] CMD_BOLD_ON = {ESC, 'E', 1};             // Negrito ON
    private static final byte[] CMD_BOLD_OFF = {ESC, 'E', 0};            // Negrito OFF
    private static final byte[] CMD_DOUBLE_HEIGHT = {ESC, '!', 0x10};    // Altura dupla
    private static final byte[] CMD_DOUBLE_WIDTH = {ESC, '!', 0x20};     // Largura dupla
    private static final byte[] CMD_DOUBLE_SIZE = {ESC, '!', 0x30};      // Tamanho duplo (altura + largura)
    private static final byte[] CMD_NORMAL_SIZE = {ESC, '!', 0x00};      // Tamanho normal
    private static final byte[] CMD_CUT = {GS, 'V', 66, 0};              // Cortar papel
    private static final byte[] CMD_FEED = {ESC, 'd', 3};                // Avançar 3 linhas

    private static final DateTimeFormatter DATE_FORMATTER = 
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss").withZone(ZoneId.of("America/Sao_Paulo"));

    /**
     * Gera um recibo de pagamento em formato ESC/POS
     */
    public String generatePaymentReceipt(
            String clinicName,
            String patientName,
            String cpf,
            BigDecimal amount,
            String paymentMethod,
            String appointmentDate,
            String appointmentTime,
            String doctorName,
            String specialty) {

        try {
            ByteArrayOutputStream output = new ByteArrayOutputStream();

            // Inicializa impressora
            output.write(CMD_INIT);

            // Cabeçalho - Nome da clínica (centralizado, tamanho duplo)
            output.write(CMD_ALIGN_CENTER);
            output.write(CMD_DOUBLE_SIZE);
            output.write(CMD_BOLD_ON);
            writeLine(output, clinicName != null ? clinicName : "Luna Vita");
            output.write(CMD_NORMAL_SIZE);
            output.write(CMD_BOLD_OFF);

            // Subtítulo
            writeLine(output, "RECIBO DE PAGAMENTO");
            output.write(LF);

            // Data/Hora da impressão
            output.write(CMD_ALIGN_CENTER);
            writeLine(output, DATE_FORMATTER.format(Instant.now()));
            output.write(LF);

            // Linha separadora
            output.write(CMD_ALIGN_LEFT);
            writeLine(output, "================================");

            // Dados do paciente
            output.write(CMD_BOLD_ON);
            writeLine(output, "DADOS DO PACIENTE");
            output.write(CMD_BOLD_OFF);
            writeLine(output, "Nome: " + (patientName != null ? patientName : "N/A"));
            writeLine(output, "CPF: " + formatCpf(cpf));
            output.write(LF);

            // Dados do agendamento
            if (appointmentDate != null || doctorName != null) {
                output.write(CMD_BOLD_ON);
                writeLine(output, "AGENDAMENTO");
                output.write(CMD_BOLD_OFF);
                if (appointmentDate != null) {
                    writeLine(output, "Data: " + appointmentDate);
                }
                if (appointmentTime != null) {
                    writeLine(output, "Horario: " + appointmentTime);
                }
                if (doctorName != null) {
                    writeLine(output, "Medico: " + doctorName);
                }
                if (specialty != null) {
                    writeLine(output, "Especialidade: " + specialty);
                }
                output.write(LF);
            }

            // Linha separadora
            writeLine(output, "================================");

            // Valor pago (destacado)
            output.write(CMD_ALIGN_CENTER);
            output.write(CMD_DOUBLE_HEIGHT);
            output.write(CMD_BOLD_ON);
            writeLine(output, "VALOR PAGO");
            output.write(CMD_DOUBLE_SIZE);
            writeLine(output, formatCurrency(amount));
            output.write(CMD_NORMAL_SIZE);
            output.write(CMD_BOLD_OFF);
            output.write(LF);

            // Forma de pagamento
            output.write(CMD_ALIGN_CENTER);
            writeLine(output, "Forma: " + formatPaymentMethod(paymentMethod));
            output.write(LF);

            // Linha separadora
            output.write(CMD_ALIGN_LEFT);
            writeLine(output, "================================");

            // Mensagem de rodapé
            output.write(CMD_ALIGN_CENTER);
            writeLine(output, "PAGAMENTO CONFIRMADO");
            writeLine(output, "Aguarde ser chamado");
            output.write(LF);
            writeLine(output, "Obrigado pela preferencia!");
            output.write(LF);

            // Avança papel e corta
            output.write(CMD_FEED);
            output.write(CMD_CUT);

            // Converte para Base64
            byte[] escPosBytes = output.toByteArray();
            return Base64.getEncoder().encodeToString(escPosBytes);

        } catch (Exception e) {
            log.error("Erro ao gerar recibo ESC/POS", e);
            throw new RuntimeException("Erro ao gerar recibo", e);
        }
    }

    /**
     * Gera um recibo simplificado de check-in
     */
    public String generateCheckInReceipt(
            String clinicName,
            String patientName,
            String appointmentDate,
            String appointmentTime,
            String queueNumber) {

        try {
            ByteArrayOutputStream output = new ByteArrayOutputStream();

            output.write(CMD_INIT);

            // Cabeçalho
            output.write(CMD_ALIGN_CENTER);
            output.write(CMD_DOUBLE_SIZE);
            output.write(CMD_BOLD_ON);
            writeLine(output, clinicName != null ? clinicName : "Luna Vita");
            output.write(CMD_NORMAL_SIZE);
            output.write(CMD_BOLD_OFF);
            writeLine(output, "CHECK-IN REALIZADO");
            output.write(LF);

            // Data/Hora
            writeLine(output, DATE_FORMATTER.format(Instant.now()));
            output.write(LF);

            // Dados
            output.write(CMD_ALIGN_LEFT);
            writeLine(output, "Paciente: " + (patientName != null ? patientName : "N/A"));
            writeLine(output, "Data: " + (appointmentDate != null ? appointmentDate : "N/A"));
            writeLine(output, "Horario: " + (appointmentTime != null ? appointmentTime : "N/A"));
            output.write(LF);

            // Número na fila (se houver)
            if (queueNumber != null) {
                output.write(CMD_ALIGN_CENTER);
                output.write(CMD_DOUBLE_SIZE);
                output.write(CMD_BOLD_ON);
                writeLine(output, "SENHA: " + queueNumber);
                output.write(CMD_NORMAL_SIZE);
                output.write(CMD_BOLD_OFF);
                output.write(LF);
            }

            // Mensagem
            output.write(CMD_ALIGN_CENTER);
            writeLine(output, "Aguarde ser chamado");
            output.write(LF);

            output.write(CMD_FEED);
            output.write(CMD_CUT);

            byte[] escPosBytes = output.toByteArray();
            return Base64.getEncoder().encodeToString(escPosBytes);

        } catch (Exception e) {
            log.error("Erro ao gerar recibo de check-in", e);
            throw new RuntimeException("Erro ao gerar recibo", e);
        }
    }

    /**
     * Escreve uma linha de texto seguida de quebra de linha
     */
    private void writeLine(ByteArrayOutputStream output, String text) throws Exception {
        if (text != null) {
            output.write(text.getBytes(StandardCharsets.UTF_8));
        }
        output.write(LF);
    }

    /**
     * Formata CPF: 123.456.789-00
     */
    private String formatCpf(String cpf) {
        if (cpf == null || cpf.length() != 11) {
            return cpf != null ? cpf : "N/A";
        }
        return cpf.substring(0, 3) + "." + 
               cpf.substring(3, 6) + "." + 
               cpf.substring(6, 9) + "-" + 
               cpf.substring(9, 11);
    }

    /**
     * Formata valor monetário: R$ 150,00
     */
    private String formatCurrency(BigDecimal amount) {
        if (amount == null) {
            return "R$ 0,00";
        }
        return String.format("R$ %.2f", amount).replace('.', ',');
    }

    /**
     * Formata método de pagamento
     */
    private String formatPaymentMethod(String method) {
        if (method == null) {
            return "N/A";
        }
        return switch (method.toUpperCase()) {
            case "PIX" -> "PIX";
            case "CREDIT_CARD" -> "Cartao de Credito";
            case "DEBIT_CARD" -> "Cartao de Debito";
            case "CASH" -> "Dinheiro";
            case "BOLETO" -> "Boleto";
            default -> method;
        };
    }
}
