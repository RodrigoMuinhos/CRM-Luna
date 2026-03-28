# Script para testar o seed e consultar dados
Write-Host "Aguardando backend estar pronto..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

Write-Host "`nExecutando seed..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Method POST -Uri "http://localhost:3333/api/admin/seed-test-data?from=2024-11-20&to=2024-12-10&perDay=60" -UseBasicParsing
    Write-Host "Seed concluido! Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "   1260 pagamentos + 1260 eventos criados (60/dia x 21 dias)`n" -ForegroundColor Gray
} catch {
    Write-Host "Erro no seed: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`nConsultando dados criados...`n" -ForegroundColor Cyan

# Total de pagamentos
Write-Host "Total de pagamentos:" -ForegroundColor Yellow
$payments = Invoke-RestMethod -Uri "http://localhost:3333/api/payments"
Write-Host "  $($payments.Count) registros`n" -ForegroundColor White

# Amostra de pagamentos do dia 25/nov
Write-Host "Pagamentos de 25/nov/2024:" -ForegroundColor Yellow
$paymentsNov25 = Invoke-RestMethod -Uri "http://localhost:3333/api/payments?date=2024-11-25"
Write-Host "  $($paymentsNov25.Count) registros" -ForegroundColor White
if ($paymentsNov25.Count -gt 0) {
    $sample = $paymentsNov25[0]
    Write-Host "  Exemplo: ID=$($sample.id.Substring(0,8))... Amount=$($sample.amount) Method=$($sample.method)`n" -ForegroundColor Gray
}

# Total de eventos
Write-Host "Total de eventos:" -ForegroundColor Yellow
$events = Invoke-RestMethod -Uri "http://localhost:3333/api/appointment-events"
Write-Host "  $($events.Count) registros`n" -ForegroundColor White

# Dashboard summary
Write-Host "Dashboard Summary:" -ForegroundColor Yellow
$dashboard = Invoke-RestMethod -Uri "http://localhost:3333/api/dashboard/summary"
Write-Host "  Receivables: R$ $($dashboard.receivables)" -ForegroundColor White
Write-Host "  Scheduled Count: $($dashboard.scheduledCount)" -ForegroundColor White
Write-Host "  Active Patients: $($dashboard.activePatients)`n" -ForegroundColor White

Write-Host "Teste concluido com sucesso!" -ForegroundColor Green
