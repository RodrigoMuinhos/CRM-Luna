package br.lunavita.totemapi.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import br.lunavita.totemapi.model.WebhookAudit;

public interface WebhookAuditRepository extends JpaRepository<WebhookAudit, String> {
	boolean existsByEventTypeAndMessage(String eventType, String message);
}
