-- Migration: persistir playlist remota do totem no banco
-- Objetivo: permitir que CRM/Vercel atualize videos sem depender de arquivo local

CREATE TABLE IF NOT EXISTS luna.video_playlist_config (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    playlist_json TEXT NOT NULL DEFAULT '[]',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255),
    CONSTRAINT uk_video_playlist_config_tenant UNIQUE (tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_video_playlist_config_tenant
ON luna.video_playlist_config(tenant_id);

COMMENT ON TABLE luna.video_playlist_config IS 'Playlist remota de videos exibidos no totem';
COMMENT ON COLUMN luna.video_playlist_config.tenant_id IS 'Identificador do tenant';
COMMENT ON COLUMN luna.video_playlist_config.playlist_json IS 'JSON com a lista ordenada de videos remotos';
COMMENT ON COLUMN luna.video_playlist_config.updated_at IS 'Data e hora da ultima alteracao';
COMMENT ON COLUMN luna.video_playlist_config.updated_by IS 'Usuario que atualizou a playlist';
