package br.lunavita.totemapi.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

/**
 * Entidade que representa um job de impressão na fila.
 * Garante que nenhum recibo seja perdido e permite reprocessamento.
 */
@Entity
@Table(name = "print_jobs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrintJob {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    /**
     * ID do terminal/totem que deve imprimir este job
     */
    @Column(nullable = false)
    private String terminalId;

    /**
     * Tenant para multi-tenancy
     */
    @Column(nullable = false)
    private String tenantId;

    /**
     * Tipo de recibo: PAYMENT, CHECKIN, APPOINTMENT_CONFIRMATION, etc
     */
    @Column(nullable = false)
    private String receiptType;

    /**
     * Status atual do job de impressão
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PrintJobStatus status;

    /**
     * Conteúdo ESC/POS do recibo (comandos de impressão em bytes codificados em Base64)
     */
    @Lob
    @Column(nullable = false, columnDefinition = "TEXT")
    private String payload;

    /**
     * Número de tentativas de impressão já realizadas
     */
    @Column(nullable = false)
    private Integer attempts = 0;

    /**
     * Máximo de tentativas permitidas antes de marcar como FAILED permanentemente
     */
    @Column(nullable = false)
    private Integer maxAttempts = 5;

    /**
     * Mensagem de erro da última tentativa (se houver)
     */
    @Column(columnDefinition = "TEXT")
    private String error;

    /**
     * Referência ao agendamento relacionado (opcional)
     */
    private String appointmentId;

    /**
     * ID do pagamento relacionado (opcional)
     */
    private String paymentId;

    /**
     * Timestamp de quando o job foi criado
     */
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    /**
     * Timestamp da última atualização
     */
    @UpdateTimestamp
    private Instant updatedAt;

    /**
     * Timestamp de quando foi impresso com sucesso
     */
    private Instant printedAt;

    /**
     * Timestamp da última tentativa de impressão
     */
    private Instant lastAttemptAt;

    /**
     * Prioridade do job (menor número = maior prioridade)
     */
    @Column(nullable = false)
    private Integer priority = 0;

    /**
     * Dados adicionais em formato JSON (opcional)
     */
    @Lob
    @Column(columnDefinition = "TEXT")
    private String metadata;

    /**
     * Verifica se o job pode ser reprocessado
     */
    public boolean canRetry() {
        return attempts < maxAttempts && 
               (status == PrintJobStatus.PENDING || status == PrintJobStatus.FAILED);
    }

    /**
     * Incrementa o contador de tentativas
     */
    public void incrementAttempts() {
        this.attempts++;
        this.lastAttemptAt = Instant.now();
    }

    /**
     * Marca como impresso com sucesso
     */
    public void markPrinted() {
        this.status = PrintJobStatus.PRINTED;
        this.printedAt = Instant.now();
        this.error = null;
    }

    /**
     * Marca como falha com mensagem de erro
     */
    public void markFailed(String errorMessage) {
        this.error = errorMessage;
        if (attempts >= maxAttempts) {
            this.status = PrintJobStatus.FAILED;
        } else {
            this.status = PrintJobStatus.PENDING; // Permite retry
        }
    }

    /**
     * Status de um job de impressão
     */
    public enum PrintJobStatus {
        /**
         * Aguardando impressão
         */
        PENDING,
        
        /**
         * Em processo de impressão (locked pelo agent)
         */
        PRINTING,
        
        /**
         * Impresso com sucesso
         */
        PRINTED,
        
        /**
         * Falhou após todas as tentativas
         */
        FAILED,
        
        /**
         * Cancelado manualmente
         */
        CANCELED
    }
}
