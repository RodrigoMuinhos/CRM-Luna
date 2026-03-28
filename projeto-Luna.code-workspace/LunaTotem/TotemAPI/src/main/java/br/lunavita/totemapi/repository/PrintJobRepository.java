package br.lunavita.totemapi.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import br.lunavita.totemapi.model.PrintJob;
import br.lunavita.totemapi.model.PrintJob.PrintJobStatus;

/**
 * Repositório para gerenciar jobs de impressão
 */
@Repository
public interface PrintJobRepository extends JpaRepository<PrintJob, String> {

    interface PrintJobSaleCandidate {
        String getId();
        String getPaymentId();
        String getAppointmentId();
    }

    /**
     * Busca todos os jobs pendentes de um terminal específico,
     * ordenados por prioridade (menor = maior prioridade) e data de criação
     */
    @Query("SELECT pj FROM PrintJob pj WHERE pj.terminalId = :terminalId " +
           "AND pj.status = 'PENDING' " +
           "ORDER BY pj.priority ASC, pj.createdAt ASC")
    List<PrintJob> findPendingByTerminal(@Param("terminalId") String terminalId);

    /**
     * Busca o próximo job pendente de um terminal (apenas 1)
     */
    @Query("SELECT pj FROM PrintJob pj WHERE pj.terminalId = :terminalId " +
           "AND pj.status = 'PENDING' " +
           "ORDER BY pj.priority ASC, pj.createdAt ASC")
    Optional<PrintJob> findNextPendingByTerminal(@Param("terminalId") String terminalId);

    /**
     * Busca todos os jobs de um tenant específico
     */
    List<PrintJob> findByTenantIdOrderByCreatedAtDesc(String tenantId);

    /**
     * Busca jobs por status e terminal
     */
    List<PrintJob> findByTerminalIdAndStatusOrderByCreatedAtDesc(String terminalId, PrintJobStatus status);

    /**
     * Busca jobs relacionados a um pagamento
     */
    Optional<PrintJob> findByPaymentId(String paymentId);

    /**
     * Busca jobs relacionados a um agendamento
     */
    List<PrintJob> findByAppointmentIdOrderByCreatedAtDesc(String appointmentId);

    /**
     * Busca jobs PAYMENT recentes (opcionalmente por terminal).
     * A filtragem de saleId é feita na camada de serviço para evitar problemas com LOB em JPQL.
     */
    @Query("SELECT pj FROM PrintJob pj " +
           "WHERE pj.receiptType = 'PAYMENT' " +
           "AND (:terminalId IS NULL OR :terminalId = '' OR pj.terminalId = :terminalId) " +
           "ORDER BY pj.createdAt DESC")
    List<PrintJob> findRecentPaymentJobs(@Param("terminalId") String terminalId, Pageable pageable);

    /**
     * Busca candidatos de saleId sem carregar payload (LOB), reduzindo custo de consulta.
     */
    @Query("SELECT pj.id as id, pj.paymentId as paymentId, pj.appointmentId as appointmentId " +
           "FROM PrintJob pj " +
           "WHERE pj.receiptType = 'PAYMENT' " +
           "AND (:terminalId IS NULL OR :terminalId = '' OR pj.terminalId = :terminalId) " +
           "ORDER BY pj.createdAt DESC")
    List<PrintJobSaleCandidate> findRecentPaymentSaleCandidates(
            @Param("terminalId") String terminalId,
            Pageable pageable
    );

    /**
     * Busca jobs travados há muito tempo (possível falha do agent)
     */
    @Query("SELECT pj FROM PrintJob pj WHERE pj.status = 'PRINTING' " +
           "AND pj.lastAttemptAt < :threshold")
    List<PrintJob> findStalledJobs(@Param("threshold") Instant threshold);

    /**
     * Conta jobs pendentes de um terminal
     */
    Long countByTerminalIdAndStatus(String terminalId, PrintJobStatus status);

    /**
     * Busca jobs falhados de um terminal
     */
    List<PrintJob> findByTerminalIdAndStatusOrderByUpdatedAtDesc(String terminalId, PrintJobStatus status);
}
