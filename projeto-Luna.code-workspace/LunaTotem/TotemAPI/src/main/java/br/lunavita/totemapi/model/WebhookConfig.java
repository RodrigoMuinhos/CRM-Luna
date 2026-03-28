package br.lunavita.totemapi.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Configuração de webhook de saída para notificação de check-in
 * Permite que o cliente configure URL e token sem precisar do desenvolvedor
 */
@Entity
@Table(name = "webhook_config")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WebhookConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * URL do webhook externo para onde os dados de check-in serão enviados
     */
    @Column(nullable = false, length = 500)
    private String webhookUrl;

    /**
     * Token de autenticação (opcional)
     * Será enviado no header Authorization: Bearer {token}
     */
    @Column(length = 500)
    private String authToken;

    /**
     * Nome do header customizado (opcional, padrão: Authorization)
     */
    @Column(length = 100)
    private String authHeaderName;

    /**
     * Webhook ativo/inativo
     */
    @Column(nullable = false)
    private Boolean enabled = true;

    /**
     * Tenant ID (para multi-tenancy)
     */
    @Column(nullable = false)
    private String tenantId = "default";

    /**
     * Data/hora da última modificação
     */
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    /**
     * Usuário que fez a última modificação
     */
    @Column(length = 255)
    private String updatedBy;

    /**
     * Timeout em segundos para requisição webhook (padrão: 10)
     */
    @Column(nullable = false)
    private Integer timeoutSeconds = 10;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
