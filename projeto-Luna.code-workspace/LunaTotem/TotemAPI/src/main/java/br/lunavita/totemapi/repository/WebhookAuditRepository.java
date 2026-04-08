package br.lunavita.totemapi.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.lunavita.totemapi.model.WebhookAudit;

public interface WebhookAuditRepository extends JpaRepository<WebhookAudit, String> {
	boolean existsByEventTypeAndMessage(String eventType, String message);

    @Query("SELECT a FROM WebhookAudit a " +
            "WHERE (:paymentId IS NULL OR a.paymentId = :paymentId) " +
            "AND (:appointmentId IS NULL OR a.appointmentId = :appointmentId)")
    Page<WebhookAudit> findByOptionalPaymentIdAndAppointmentId(
            @Param("paymentId") String paymentId,
            @Param("appointmentId") String appointmentId,
            Pageable pageable);
}
