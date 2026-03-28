@echo off
REM Script para executar TotemAPI com variáveis de ambiente para GHL webhook (Windows)

setlocal enabledelayedexpansion

REM Defina aqui suas credenciais ou via variáveis de ambiente
if "%WEBHOOK_GHL_TOKEN%"=="" set "WEBHOOK_GHL_TOKEN=ln16012x26"
if "%SPRING_DATASOURCE_URL%"=="" set "SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/lunadb?currentSchema=luna"
if "%SPRING_DATASOURCE_USERNAME%"=="" set "SPRING_DATASOURCE_USERNAME=postgres"
if "%SPRING_DATASOURCE_PASSWORD%"=="" set "SPRING_DATASOURCE_PASSWORD="
if "%JWT_SECRET%"=="" set "JWT_SECRET=dev-only-change-me"

echo =========================================
echo TotemAPI - GHL Webhook Enabled
echo =========================================
echo WEBHOOK_GHL_TOKEN: %WEBHOOK_GHL_TOKEN:~0,10%***
echo Database: %SPRING_DATASOURCE_URL%
echo Port: 8081
echo =========================================
echo.

mvn spring-boot:run
pause
