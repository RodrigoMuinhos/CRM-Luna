package br.lunavita.totemapi.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO para dados de check-in enviados ao webhook externo
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CheckInWebhookPayload {
    private String nomePaciente;
    private String cpfPaciente;
    private String nomeMedico;
    private String especialidade;
    private String horarioAgendado;          // formato: "2026-01-20 14:30"
    private String horarioConclusaoCheckin;  // formato: "2026-01-20 14:25"
    private String dataAgendamento;          // formato: "2026-01-20"
    private String horaAgendamento;          // formato: "14:30"
    private String status;                   // ex: "CONFIRMADA"
    private String tenantId;
}
