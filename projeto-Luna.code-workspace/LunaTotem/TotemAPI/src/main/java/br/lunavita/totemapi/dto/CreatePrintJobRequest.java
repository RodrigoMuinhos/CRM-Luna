package br.lunavita.totemapi.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request para criar um novo job de impressão na fila
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePrintJobRequest {

    /**
     * ID do terminal/totem que deve imprimir
     */
    private String terminalId;

    /**
     * Tenant para multi-tenancy
     */
    private String tenantId;

    /**
     * Tipo de recibo: PAYMENT, CHECKIN, APPOINTMENT_CONFIRMATION, etc
     */
    private String receiptType;

    /**
     * Conteúdo ESC/POS do recibo codificado em Base64
     */
    private String payload;

    /**
     * Referência ao agendamento (opcional)
     */
    private String appointmentId;

    /**
     * Referência ao pagamento (opcional)
     */
    private String paymentId;

    /**
     * Prioridade (menor = maior prioridade, default: 0)
     */
    private Integer priority;

    /**
     * Máximo de tentativas (default: 5)
     */
    private Integer maxAttempts;

    /**
     * Metadados adicionais em JSON (opcional)
     */
    private String metadata;
}
