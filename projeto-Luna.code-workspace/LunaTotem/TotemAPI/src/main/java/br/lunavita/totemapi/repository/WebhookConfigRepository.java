package br.lunavita.totemapi.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import br.lunavita.totemapi.model.WebhookConfig;

@Repository
public interface WebhookConfigRepository extends JpaRepository<WebhookConfig, Long> {
    
    /**
     * Busca configuração de webhook por tenant
     */
    Optional<WebhookConfig> findByTenantIdAndEnabledTrue(String tenantId);
    
    /**
     * Busca qualquer configuração por tenant (ativa ou não)
     */
    Optional<WebhookConfig> findByTenantId(String tenantId);
}
