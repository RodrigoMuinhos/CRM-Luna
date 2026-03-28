# Script para rodar o backend com Neon PostgreSQL
Write-Host "Iniciando backend com Neon PostgreSQL..." -ForegroundColor Green

# Configurar variáveis de ambiente
# NUNCA commitar credenciais reais. Defina SPRING_DATASOURCE_* no seu ambiente.
if (-not $env:SPRING_DATASOURCE_URL) { $env:SPRING_DATASOURCE_URL = 'jdbc:postgresql://localhost:5432/lunadb?currentSchema=totemapi' }
if (-not $env:SPRING_DATASOURCE_USERNAME) { $env:SPRING_DATASOURCE_USERNAME = 'postgres' }
# Não define senha por padrão
if (-not $env:SPRING_DATASOURCE_DRIVER) { $env:SPRING_DATASOURCE_DRIVER = 'org.postgresql.Driver' }

Write-Host "Variáveis de ambiente configuradas." -ForegroundColor Yellow
Write-Host "Database: Neon PostgreSQL (neondb)" -ForegroundColor Cyan
Write-Host "Port: 3333" -ForegroundColor Cyan

# Executar o JAR
java -jar target/totem-api-0.0.1-SNAPSHOT.jar
