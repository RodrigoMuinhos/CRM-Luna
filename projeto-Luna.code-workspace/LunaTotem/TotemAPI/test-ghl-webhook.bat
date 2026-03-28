@echo off
REM Script para testar webhook GHL - Windows PowerShell

setlocal enabledelayedexpansion

set TOKEN=ln16012x26
set URL=http://localhost:8081/api/webhooks/ghl/patients

echo.
echo ========================================
echo Teste 1: Primeira execucao (deve criar)
echo ========================================
echo.

curl -X POST "%URL%" ^
  -H "Content-Type: application/json" ^
  -H "x-webhook-token: %TOKEN%" ^
  -d "{\"contact_id\": \"khtSMwmZxoKVJuQ2jPfv\", \"event_type\": \"patient.upsert\", \"full_name\": \"Leonardo da C. Marques\", \"phone\": \"+5585988175221\", \"cpf\": \"02375330307\", \"email\": \"leo.cmarques0@gmail.com\", \"tenant_id\": \"TENANT_LUNAVITA\", \"birth_date\": \"30/05/1993\", \"notes\": \"Troca de Implanon\"}"

echo.
echo.
echo ========================================
echo Teste 2: Reenvio (deve ser deduplicado)
echo ========================================
echo.

curl -X POST "%URL%" ^
  -H "Content-Type: application/json" ^
  -H "x-webhook-token: %TOKEN%" ^
  -d "{\"contact_id\": \"khtSMwmZxoKVJuQ2jPfv\", \"event_type\": \"patient.upsert\", \"full_name\": \"Leonardo da C. Marques\", \"phone\": \"+5585988175221\", \"cpf\": \"02375330307\", \"email\": \"leo.cmarques0@gmail.com\", \"tenant_id\": \"TENANT_LUNAVITA\", \"birth_date\": \"30/05/1993\", \"notes\": \"Troca de Implanon\"}"

echo.
echo.
echo ========================================
echo Teste 3: Token invalido (deve falhar)
echo ========================================
echo.

curl -X POST "%URL%" ^
  -H "Content-Type: application/json" ^
  -H "x-webhook-token: token-errado" ^
  -d "{\"contact_id\": \"khtSMwmZxoKVJuQ2jPfv\", \"event_type\": \"patient.upsert\", \"full_name\": \"Leonardo da C. Marques\", \"phone\": \"+5585988175221\", \"cpf\": \"02375330307\", \"email\": \"leo.cmarques0@gmail.com\", \"tenant_id\": \"TENANT_LUNAVITA\", \"birth_date\": \"30/05/1993\", \"notes\": \"Troca de Implanon\"}"

echo.
echo.
echo =========================================
echo +OK: Testes concluidos!
echo =========================================

pause
