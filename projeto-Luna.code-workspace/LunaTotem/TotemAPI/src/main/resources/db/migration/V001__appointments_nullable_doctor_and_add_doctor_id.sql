-- Migration: Tornar doctor/specialty nullable e adicionar doctor_id
-- Objetivo: Permitir criar consultas sem médico associado
-- Autor: GitHub Copilot
-- Data: 2026-01-17

-- 1) Tornar doctor e specialty nullable (permitir consultas sem médico)
ALTER TABLE luna.appointments ALTER COLUMN doctor DROP NOT NULL;
ALTER TABLE luna.appointments ALTER COLUMN specialty DROP NOT NULL;

-- 2) Adicionar coluna doctor_id (foreign key para doctors.id)
ALTER TABLE luna.appointments ADD COLUMN IF NOT EXISTS doctor_id VARCHAR(255);

-- 3) Criar índice para otimizar queries por tenant + doctor + date
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_doctor_date 
ON luna.appointments(tenant_id, doctor_id, date);

-- 4) Comentários nas colunas para documentação
COMMENT ON COLUMN luna.appointments.doctor IS 'Nome do médico (texto livre) - pode ser NULL';
COMMENT ON COLUMN luna.appointments.specialty IS 'Especialidade do médico - pode ser NULL';
COMMENT ON COLUMN luna.appointments.doctor_id IS 'ID do médico na tabela doctors - opcional';
