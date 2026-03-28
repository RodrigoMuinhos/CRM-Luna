-- Script para testar o fluxo de ativação de licença
-- Execute este script após a aplicação criar as tabelas automaticamente

-- 1. Criar um tenant de teste
INSERT INTO tenants (id, name, cnpj, status, subscription_plan, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'Clínica Teste',
    '12.345.678/0001-90',
    'ACTIVE',
    'PROFESSIONAL',
    now(),
    now()
) ON CONFLICT DO NOTHING;

-- 2. Obter o ID do tenant criado (use este ID nos próximos comandos)
-- SELECT id FROM tenants WHERE name = 'Clínica Teste';

-- 3. Criar uma licença com status PENDING_ACTIVATION
INSERT INTO licenses (id, tenant_id, product_key, plan, status, valid_from, valid_until, max_devices, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    (SELECT id FROM tenants WHERE name = 'Clínica Teste' LIMIT 1),
    'LUNA-TEST-2025-ABCD',
    'PROFESSIONAL',
    'PENDING_ACTIVATION',
    now(),
    now() + interval '1 year',
    3,
    now(),
    now()
);

-- 4. Criar um código de ativação para a licença
INSERT INTO activation_codes (id, license_id, code, expires_at, created_at)
VALUES (
    gen_random_uuid(),
    (SELECT id FROM licenses WHERE product_key = 'LUNA-TEST-2025-ABCD' LIMIT 1),
    '123456',
    now() + interval '30 days',
    now()
);

-- 5. Criar módulos para a licença (TOTEM e LUNAPAY)
INSERT INTO license_modules (id, license_id, module_code, enabled)
VALUES
    (gen_random_uuid(), (SELECT id FROM licenses WHERE product_key = 'LUNA-TEST-2025-ABCD' LIMIT 1), 'TOTEM', true),
    (gen_random_uuid(), (SELECT id FROM licenses WHERE product_key = 'LUNA-TEST-2025-ABCD' LIMIT 1), 'LUNAPAY', true),
    (gen_random_uuid(), (SELECT id FROM licenses WHERE product_key = 'LUNA-TEST-2025-ABCD' LIMIT 1), 'CRM_SLIM', true);

-- 6. Verificar os dados criados
SELECT 
    t.name as tenant_name,
    l.product_key,
    l.status as license_status,
    l.max_devices,
    ac.code as activation_code,
    ac.expires_at,
    ac.used_at
FROM licenses l
JOIN tenants t ON l.tenant_id = t.id
LEFT JOIN activation_codes ac ON ac.license_id = l.id
WHERE l.product_key = 'LUNA-TEST-2025-ABCD';

-- 7. Ver módulos habilitados
SELECT 
    l.product_key,
    lm.module_code,
    lm.enabled
FROM license_modules lm
JOIN licenses l ON lm.license_id = l.id
WHERE l.product_key = 'LUNA-TEST-2025-ABCD';

-- ========================================
-- TESTES COM CURL (executar após criar os dados acima)
-- ========================================

-- Teste 1: Verificar status da licença (ANTES da ativação)
-- curl -X GET "http://localhost:8080/license/status?productKey=LUNA-TEST-2025-ABCD&deviceId=totem-001"
-- Resposta esperada: {"status":"PENDING_ACTIVATION","activated":false,"tenantId":"...","modules":["TOTEM","LUNAPAY","CRM_SLIM"]}

-- Teste 2: Ativar a licença
-- curl -X POST http://localhost:8080/license/activate \
--   -H "Content-Type: application/json" \
--   -d '{
--     "productKey": "LUNA-TEST-2025-ABCD",
--     "activationCode": "123456",
--     "deviceId": "totem-001",
--     "deviceName": "Totem Recepção",
--     "cnpj": "12.345.678/0001-90",
--     "emailResponsavel": "admin@clinicateste.com"
--   }'
-- Resposta esperada: {"tenantId":"...","licenseId":"...","requireFirstAdmin":true,"modules":["TOTEM","LUNAPAY","CRM_SLIM"]}

-- Teste 3: Verificar status da licença (DEPOIS da ativação)
-- curl -X GET "http://localhost:8080/license/status?productKey=LUNA-TEST-2025-ABCD&deviceId=totem-001"
-- Resposta esperada: {"status":"ACTIVE","activated":true,"tenantId":"...","modules":["TOTEM","LUNAPAY","CRM_SLIM"]}

-- ========================================
-- CONSULTAS DE VERIFICAÇÃO PÓS-ATIVAÇÃO
-- ========================================

-- Verificar se o device foi criado
SELECT * FROM devices WHERE device_id = 'totem-001';

-- Verificar se o código de ativação foi marcado como usado
SELECT code, used_at FROM activation_codes WHERE code = '123456';

-- Verificar se o status da licença mudou para ACTIVE
SELECT product_key, status FROM licenses WHERE product_key = 'LUNA-TEST-2025-ABCD';

-- ========================================
-- LIMPEZA (se quiser recomeçar os testes)
-- ========================================

-- DELETE FROM devices WHERE device_id = 'totem-001';
-- UPDATE activation_codes SET used_at = NULL WHERE code = '123456';
-- UPDATE licenses SET status = 'PENDING_ACTIVATION' WHERE product_key = 'LUNA-TEST-2025-ABCD';
