-- Migration: Criar tabela webhook_config para notificações de check-in
-- Objetivo: Permitir que o cliente configure webhook de saída sem precisar do desenvolvedor
-- Autor: GitHub Copilot
-- Data: 2026-01-20

-- Criar tabela webhook_config
CREATE TABLE IF NOT EXISTS luna.webhook_config (
    id BIGSERIAL PRIMARY KEY,
    webhook_url VARCHAR(500) NOT NULL,
    auth_token VARCHAR(500),
    auth_header_name VARCHAR(100) DEFAULT 'Authorization',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    tenant_id VARCHAR(255) NOT NULL DEFAULT 'default',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255),
    timeout_seconds INTEGER NOT NULL DEFAULT 10,
    
    -- Garante apenas uma configuração por tenant
    CONSTRAINT uk_webhook_config_tenant UNIQUE (tenant_id)
);

-- Criar índice para busca por tenant
CREATE INDEX IF NOT EXISTS idx_webhook_config_tenant 
ON luna.webhook_config(tenant_id);

-- Criar índice para busca por tenant + enabled
CREATE INDEX IF NOT EXISTS idx_webhook_config_tenant_enabled 
ON luna.webhook_config(tenant_id, enabled);

-- Comentários nas colunas para documentação
COMMENT ON TABLE luna.webhook_config IS 'Configuração de webhooks de saída para notificações de check-in';
COMMENT ON COLUMN luna.webhook_config.webhook_url IS 'URL completa do webhook externo para envio de dados';
COMMENT ON COLUMN luna.webhook_config.auth_token IS 'Token de autenticação (opcional) - será enviado no header';
COMMENT ON COLUMN luna.webhook_config.auth_header_name IS 'Nome do header para autenticação (padrão: Authorization)';
COMMENT ON COLUMN luna.webhook_config.enabled IS 'Webhook ativo (true) ou inativo (false)';
COMMENT ON COLUMN luna.webhook_config.tenant_id IS 'Identificador do tenant (multi-tenancy)';
COMMENT ON COLUMN luna.webhook_config.updated_at IS 'Data e hora da última modificação';
COMMENT ON COLUMN luna.webhook_config.updated_by IS 'Email/identificador do usuário que fez a última modificação';
COMMENT ON COLUMN luna.webhook_config.timeout_seconds IS 'Timeout em segundos para requisição webhook (1-60)';
