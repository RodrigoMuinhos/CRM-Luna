package br.lunavita.totemapi.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import br.lunavita.totemapi.model.Appointment;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, String> {

    // ===== MÉTODOS MULTI-TENANT (SEMPRE FILTRAR POR TENANT_ID) =====

    /**
     * Busca agendamento por ID dentro do tenant
     */
    Optional<Appointment> findByTenantIdAndId(String tenantId, String id);

    /**
     * Lista todos os agendamentos do tenant
     */
    List<Appointment> findAllByTenantId(String tenantId);

    /**
     * Busca agendamentos futuros do tenant, ordenados por data/hora
     */
    List<Appointment> findByTenantIdAndDateGreaterThanEqualOrderByDateAscTimeAscPatientAsc(
            String tenantId, LocalDate from);

    /**
     * Busca agendamentos futuros filtrando por nome de paciente
     */
    List<Appointment> findByTenantIdAndDateGreaterThanEqualAndPatientIgnoreCaseContainingOrderByDateAscTimeAscPatientAsc(
            String tenantId, LocalDate from, String patientPart);

    /**
     * Busca agendamentos por status dentro do tenant
     */
    List<Appointment> findByTenantIdAndStatusOrderByDateAscTimeAsc(String tenantId, String status);

    /**
     * Busca agendamentos de uma data específica do tenant
     */
    List<Appointment> findByTenantIdAndDateOrderByTimeAsc(String tenantId, LocalDate date);

    /**
     * Busca agendamentos de um paciente específico
     */
    List<Appointment> findByTenantIdAndPatientIdOrderByDateDescTimeDesc(String tenantId, String patientId);

    /**
     * Conta agendamentos não pagos do tenant
     */
    @Query("SELECT COUNT(a) FROM Appointment a WHERE a.tenantId = :tenantId AND a.paid = false")
    long countUnpaidByTenantId(@Param("tenantId") String tenantId);

    /**
     * Busca agendamentos NÃO pagos (qualquer data) por nome do paciente e/ou CPF (parcial).
     *
     * Observação: mantém compatibilidade com o fluxo de pagamento (buscar por CPF parcial).
     */
    @Query("SELECT a FROM Appointment a " +
            "LEFT JOIN Patient p ON p.id = a.patientId AND p.tenantId = a.tenantId " +
            "WHERE a.tenantId = :tenantId " +
            "AND a.paid = false " +
            "AND (LOWER(a.patient) LIKE LOWER(CONCAT('%', :q, '%')) " +
            "     OR LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%')) " +
            "     OR (:cpfPart <> '' AND (a.cpf LIKE CONCAT('%', :cpfPart, '%') OR p.cpf LIKE CONCAT('%', :cpfPart, '%')))) " +
            "ORDER BY a.date DESC, a.time DESC, a.patient ASC")
    List<Appointment> searchUnpaidByTenantIdAndPatientOrCpf(
            @Param("tenantId") String tenantId,
            @Param("q") String q,
            @Param("cpfPart") String cpfPart);

    /**
     * Variante SEM filtro de tenant (não recomendado; mantido para compatibilidade).
     */
    @Query("SELECT a FROM Appointment a " +
            "LEFT JOIN Patient p ON p.id = a.patientId " +
            "WHERE a.paid = false " +
            "AND (LOWER(a.patient) LIKE LOWER(CONCAT('%', :q, '%')) " +
            "     OR LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%')) " +
            "     OR (:cpfPart <> '' AND (a.cpf LIKE CONCAT('%', :cpfPart, '%') OR p.cpf LIKE CONCAT('%', :cpfPart, '%')))) " +
            "ORDER BY a.date DESC, a.time DESC, a.patient ASC")
    List<Appointment> searchUnpaidByPatientOrCpf(
            @Param("q") String q,
            @Param("cpfPart") String cpfPart);

    // ===== MÉTODOS DEPRECADOS (NÃO USAR - SEM FILTRO DE TENANT) =====

    /**
     * @deprecated Use
     *             findByTenantIdAndDateGreaterThanEqualOrderByDateAscTimeAscPatientAsc()
     */
    @Deprecated
    List<Appointment> findByDateGreaterThanEqualOrderByDateAscTimeAscPatientAsc(LocalDate from);

    /**
     * @deprecated Use
     *             findByTenantIdAndDateGreaterThanEqualAndPatientIgnoreCaseContainingOrderByDateAscTimeAscPatientAsc()
     */
    @Deprecated
    List<Appointment> findByDateGreaterThanEqualAndPatientIgnoreCaseContainingOrderByDateAscTimeAscPatientAsc(
            LocalDate from, String patientPart);
}
