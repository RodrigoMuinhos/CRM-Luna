-- Script de testes para PASSO 3 - Autenticação com JWT

-- ========================================
-- PREPARAÇÃO: Usar dados do PASSO 2
-- ========================================
-- Execute primeiro o script: test-license-activation.sql
-- Isso criará:
-- - 1 tenant com ID (salve este ID)
-- - 1 licença ativada
-- - 1 device registrado

-- ========================================
-- TESTE 1: Criar primeiro administrador
-- ========================================

-- curl -X POST http://localhost:8080/auth/first-admin \
--   -H "Content-Type: application/json" \
--   -d '{
--     "tenantId": "TENANT_UUID_AQUI",
--     "name": "Dr. Administrador",
--     "email": "admin@clinicateste.com",
--     "password": "SenhaForte@123"
--   }'

-- Resposta esperada: 200 OK

-- Verificar usuário criado:
SELECT 
    u.id,
    u.name,
    u.email,
    u.role,
    u.status,
    t.name as tenant_name
FROM users u
JOIN tenants t ON u.tenant_id = t.id
WHERE u.email = 'admin@clinicateste.com';

-- ========================================
-- TESTE 2: Login com credenciais válidas
-- ========================================

-- curl -X POST http://localhost:8080/auth/login \
--   -H "Content-Type: application/json" \
--   -d '{
--     "email": "admin@clinicateste.com",
--     "password": "SenhaForte@123",
--     "deviceId": "totem-001"
--   }'

-- Resposta esperada:
-- {
--   "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
--   "tokenType": "Bearer",
--   "expiresIn": 3600,
--   "userId": "USER_UUID",
--   "tenantId": "TENANT_UUID",
--   "name": "Dr. Administrador",
--   "email": "admin@clinicateste.com",
--   "role": "OWNER",
--   "modules": ["TOTEM", "LUNAPAY", "CRM_SLIM"]
-- }

-- ========================================
-- TESTE 3: Testar JWT em endpoint protegido
-- ========================================

-- Salve o accessToken do login anterior e use:

-- curl -X GET http://localhost:8080/actuator/health \
--   -H "Authorization: Bearer SEU_TOKEN_AQUI"

-- ========================================
-- TESTE 4: Login com senha incorreta
-- ========================================

-- curl -X POST http://localhost:8080/auth/login \
--   -H "Content-Type: application/json" \
--   -d '{
--     "email": "admin@clinicateste.com",
--     "password": "SenhaErrada",
--     "deviceId": "totem-001"
--   }'

-- Resposta esperada: 401 UNAUTHORIZED
-- {
--   "status": 401,
--   "error": "Unauthorized",
--   "message": "Credenciais inválidas"
-- }

-- ========================================
-- TESTE 5: Tentar criar segundo OWNER
-- ========================================

-- curl -X POST http://localhost:8080/auth/first-admin \
--   -H "Content-Type: application/json" \
--   -d '{
--     "tenantId": "TENANT_UUID_AQUI",
--     "name": "Outro Admin",
--     "email": "outro@clinicateste.com",
--     "password": "Senha123@"
--   }'

-- Resposta esperada: 400 BAD REQUEST
-- {
--   "status": 400,
--   "error": "Bad Request",
--   "message": "Já existe um administrador principal"
-- }

-- ========================================
-- TESTE 6: Login com usuário bloqueado
-- ========================================

-- Primeiro, bloquear o usuário:
UPDATE users SET status = 'BLOCKED' WHERE email = 'admin@clinicateste.com';

-- Tentar login:
-- curl -X POST http://localhost:8080/auth/login \
--   -H "Content-Type: application/json" \
--   -d '{
--     "email": "admin@clinicateste.com",
--     "password": "SenhaForte@123",
--     "deviceId": "totem-001"
--   }'

-- Resposta esperada: 401 UNAUTHORIZED
-- {
--   "message": "Usuário bloqueado/inativo"
-- }

-- Desbloquear para continuar testes:
UPDATE users SET status = 'ACTIVE' WHERE email = 'admin@clinicateste.com';

-- ========================================
-- TESTE 7: Login com tenant inativo
-- ========================================

-- Desativar tenant:
UPDATE tenants SET status = 'BLOCKED' WHERE name = 'Clínica Teste';

-- Tentar login:
-- curl -X POST http://localhost:8080/auth/login \
--   -H "Content-Type: application/json" \
--   -d '{
--     "email": "admin@clinicateste.com",
--     "password": "SenhaForte@123"
--   }'

-- Resposta esperada: 401 UNAUTHORIZED
-- {
--   "message": "Tenant inativo"
-- }

-- Reativar:
UPDATE tenants SET status = 'ACTIVE' WHERE name = 'Clínica Teste';

-- ========================================
-- TESTE 8: Login com licença inativa
-- ========================================

-- Desativar licença:
UPDATE licenses SET status = 'BLOCKED' WHERE product_key = 'LUNA-TEST-2025-ABCD';

-- Tentar login:
-- curl -X POST http://localhost:8080/auth/login \
--   -H "Content-Type: application/json" \
--   -d '{
--     "email": "admin@clinicateste.com",
--     "password": "SenhaForte@123"
--   }'

-- Resposta esperada: 401 UNAUTHORIZED
-- {
--   "message": "Licença não ativa"
-- }

-- Reativar:
UPDATE licenses SET status = 'ACTIVE' WHERE product_key = 'LUNA-TEST-2025-ABCD';

-- ========================================
-- CONSULTAS ÚTEIS
-- ========================================

-- Ver todos os usuários:
SELECT 
    u.id,
    u.name,
    u.email,
    u.role,
    u.status,
    t.name as tenant_name,
    u.created_at
FROM users u
JOIN tenants t ON u.tenant_id = t.id
ORDER BY u.created_at DESC;

-- Ver token decodificado (use https://jwt.io):
-- Cole o accessToken para ver os claims:
-- - sub: userId
-- - tenantId
-- - role
-- - modules
-- - iat: issued at
-- - exp: expiration

-- ========================================
-- FLUXO COMPLETO DO LUNATOTEM
-- ========================================

-- 1. Verificar status da licença
-- GET /license/status?productKey=LUNA-TEST-2025-ABCD&deviceId=totem-001

-- 2. Se activated=false, ativar
-- POST /license/activate { productKey, activationCode, deviceId, ... }

-- 3. Se requireFirstAdmin=true, criar admin
-- POST /auth/first-admin { tenantId, name, email, password }

-- 4. Fazer login
-- POST /auth/login { email, password, deviceId }

-- 5. Salvar accessToken e usar em todas as requisições:
-- Authorization: Bearer {accessToken}

-- 6. Usar modules retornados para habilitar/desabilitar funcionalidades
-- Ex: if (modules.includes("LUNAPAY")) { enablePaymentFeature(); }
