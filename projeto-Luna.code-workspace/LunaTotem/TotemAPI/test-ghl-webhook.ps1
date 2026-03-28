# GHL Webhook Test Script (PowerShell)

$token = "ln16012x26"
$baseUrl = "http://localhost:8081"  # Mude para sua URL Railway se necessário
$endpoint = "$baseUrl/api/webhooks/ghl/patients"

$payload = @{
    contact_id = "khtSMwmZxoKVJuQ2jPfv"
    event_type = "patient.upsert"
    full_name = "Leonardo da C. Marques"
    phone = "+5585988175221"
    cpf = "02375330307"
    email = "leo.cmarques0@gmail.com"
    tenant_id = "TENANT_LUNAVITA"
    birth_date = "30/05/1993"
    notes = "Troca de Implanon"
} | ConvertTo-Json

$headers = @{
    "x-webhook-token" = $token
    "Content-Type"    = "application/json"
}

# Teste 1: Primeira execução (deve criar)
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Teste 1: Primeira execução (deve criar)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$response1 = Invoke-WebRequest -Uri $endpoint `
    -Method POST `
    -Headers $headers `
    -Body $payload `
    -ErrorAction Continue

Write-Host $response1.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
Write-Host ""

# Esperado: success=true, deduplicated=false, patientId=uuid
if ($response1.StatusCode -eq 200) {
    $result = $response1.Content | ConvertFrom-Json
    if ($result.success -eq $true -and $result.deduplicated -eq $false) {
        Write-Host "✅ TESTE 1 PASSOU: Paciente criado com sucesso" -ForegroundColor Green
        Write-Host "   PatientID: $($result.patientId)" -ForegroundColor Green
    }
    else {
        Write-Host "⚠️ TESTE 1 FALHOU: Response inesperada" -ForegroundColor Yellow
    }
}
else {
    Write-Host "❌ TESTE 1 FALHOU: HTTP $($response1.StatusCode)" -ForegroundColor Red
}

Write-Host ""
Write-Host ""

# Teste 2: Reenvio (deve ser deduplicado)
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Teste 2: Reenvio (deve ser deduplicado)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$response2 = Invoke-WebRequest -Uri $endpoint `
    -Method POST `
    -Headers $headers `
    -Body $payload `
    -ErrorAction Continue

Write-Host $response2.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
Write-Host ""

# Esperado: success=true, deduplicated=true, mesmo patientId
if ($response2.StatusCode -eq 200) {
    $result = $response2.Content | ConvertFrom-Json
    if ($result.success -eq $true -and $result.deduplicated -eq $true) {
        Write-Host "✅ TESTE 2 PASSOU: Evento deduplicado corretamente" -ForegroundColor Green
        Write-Host "   PatientID: $($result.patientId)" -ForegroundColor Green
    }
    else {
        Write-Host "⚠️ TESTE 2 FALHOU: Não foi deduplicado" -ForegroundColor Yellow
    }
}
else {
    Write-Host "❌ TESTE 2 FALHOU: HTTP $($response2.StatusCode)" -ForegroundColor Red
}

Write-Host ""
Write-Host ""

# Teste 3: Token inválido (deve retornar 401)
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Teste 3: Token inválido (deve falhar)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$headersInvalid = @{
    "x-webhook-token" = "token-errado"
    "Content-Type"    = "application/json"
}

try {
    $response3 = Invoke-WebRequest -Uri $endpoint `
        -Method POST `
        -Headers $headersInvalid `
        -Body $payload `
        -ErrorAction Stop
    
    Write-Host "❌ TESTE 3 FALHOU: Deveria retornar 401" -ForegroundColor Red
}
catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ TESTE 3 PASSOU: Token rejeitado com 401" -ForegroundColor Green
        Write-Host $_.Exception.Response.StatusCode -ForegroundColor Green
    }
    else {
        Write-Host "⚠️ TESTE 3 FALHOU: Status inesperado $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ Todos os testes concluídos!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
