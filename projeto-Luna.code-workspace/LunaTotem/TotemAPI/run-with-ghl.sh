#!/bin/bash
# Script para executar TotemAPI com variáveis de ambiente para GHL webhook

# Defina aqui suas credenciais ou via .env
export WEBHOOK_GHL_TOKEN="${WEBHOOK_GHL_TOKEN:-ln16012x26}"
export SPRING_DATASOURCE_URL="${SPRING_DATASOURCE_URL:-jdbc:postgresql://localhost:5432/lunadb?currentSchema=luna}"
export SPRING_DATASOURCE_USERNAME="${SPRING_DATASOURCE_USERNAME:-postgres}"
export SPRING_DATASOURCE_PASSWORD="${SPRING_DATASOURCE_PASSWORD:-}"
export JWT_SECRET="${JWT_SECRET:-dev-only-change-me}"

echo "========================================="
echo "TotemAPI - GHL Webhook Enabled"
echo "========================================="
echo "WEBHOOK_GHL_TOKEN: ${WEBHOOK_GHL_TOKEN:0:10}***"
echo "Database: ${SPRING_DATASOURCE_URL}"
echo "Port: 8081"
echo "========================================="
echo ""

mvn spring-boot:run
