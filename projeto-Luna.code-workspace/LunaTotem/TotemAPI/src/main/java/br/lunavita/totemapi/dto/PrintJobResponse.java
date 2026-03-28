package br.lunavita.totemapi.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Response contendo informações de um job de impressão
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrintJobResponse {

    private String id;
    private String terminalId;
    private String tenantId;
    private String receiptType;
    private String status;
    private String payload;
    private Integer attempts;
    private Integer maxAttempts;
    private String error;
    private String appointmentId;
    private String paymentId;
    private Integer priority;
    private String metadata;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant printedAt;
    private Instant lastAttemptAt;
}
