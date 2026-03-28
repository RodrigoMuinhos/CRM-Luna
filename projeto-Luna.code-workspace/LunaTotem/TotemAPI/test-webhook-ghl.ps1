# Test GHL Webhook
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  GHL WEBHOOK TEST" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

$baseUrl = "http://localhost:8081/api/webhooks/ghl/patients"
$headers = @{
    'Content-Type' = 'application/json'
    'x-webhook-token' = 'ln16012x26'
}

$payload = @{
    contact_id = 'khtSMwmZxoKVJuQ2jPfv'
    event_type = 'contact.create'
    full_name = 'Leonardo da C. Marques'
    cpf = '023.753.303-07'
    email = 'leo@test.com'
    phone = '(11)98765-4321'
    birth_date = '15/03/1985'
    tenant_id = 'totem'
} | ConvertTo-Json

# TEST 1: Criar paciente
Write-Host "=== TEST 1: Criar novo paciente ===" -ForegroundColor Cyan
try {
    $response1 = Invoke-RestMethod -Uri $baseUrl -Method POST -Headers $headers -Body $payload
    Write-Host "✓ Sucesso!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Yellow
    $response1 | ConvertTo-Json -Depth 5
    Write-Host "`nVerificando deduplicated=false..." -ForegroundColor Yellow
    if ($response1.deduplicated -eq $false) {
        Write-Host "✓ PASS: Paciente criado (deduplicated=false)" -ForegroundColor Green
    } else {
        Write-Host "✗ FAIL: Esperado deduplicated=false" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ ERRO: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n" -ForegroundColor Gray

# TEST 2: Idempotência
Write-Host "=== TEST 2: Idempotência (mesmo payload) ===" -ForegroundColor Cyan
try {
    $response2 = Invoke-RestMethod -Uri $baseUrl -Method POST -Headers $headers -Body $payload
    Write-Host "✓ Sucesso!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Yellow
    $response2 | ConvertTo-Json -Depth 5
    Write-Host "`nVerificando deduplicated=true..." -ForegroundColor Yellow
    if ($response2.deduplicated -eq $true) {
        Write-Host "✓ PASS: Webhook duplicado ignorado (deduplicated=true)" -ForegroundColor Green
    } else {
        Write-Host "✗ FAIL: Esperado deduplicated=true" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ ERRO: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n" -ForegroundColor Gray

# TEST 3: Token inválido
Write-Host "=== TEST 3: Token inválido (deve retornar 401) ===" -ForegroundColor Cyan
try {
    $badHeaders = @{
        'Content-Type' = 'application/json'
        'x-webhook-token' = 'INVALID_TOKEN'
    }
    $response3 = Invoke-RestMethod -Uri $baseUrl -Method POST -Headers $badHeaders -Body $payload
    Write-Host "✗ FAIL: Esperava erro 401 mas recebeu sucesso" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "✓ PASS: Erro 401 recebido como esperado" -ForegroundColor Green
    } else {
        Write-Host "✗ FAIL: Erro inesperado: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  TESTES CONCLUÍDOS" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green
