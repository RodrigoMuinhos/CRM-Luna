# GHL Webhook Implementation - Quick Reference

## 📁 Arquivos Criados

```
TotemAPI/
├── GHL-WEBHOOK.md                          (Documentação completa)
├── run-with-ghl.sh                         (Script bash)
├── run-with-ghl.bat                        (Script Windows)
└── src/main/java/br/lunavita/totemapi/
    ├── dto/
    │   ├── GhlPatientWebhookDto.java       (DTO entrada)
    │   ├── GhlPatientNormalized.java       (Modelo interno)
    │   └── GhlWebhookResult.java           (Resultado)
    ├── service/
    │   ├── GhlPatientNormalizer.java       (Normalizador)
    │   └── GhlWebhookPatientService.java   (Lógica upsert)
    ├── controller/
    │   └── GhlWebhookPatientController.java (Endpoint)
    ├── model/
    │   └── Patient.java                    (MODIFICADO: +ghl_contact_id)
    └── repository/
        ├── PatientRepository.java          (MODIFICADO: +métodos GHL)
        └── WebhookAuditRepository.java     (MODIFICADO: +dedup)
```

## 🚀 Quick Start

### 1. Compilar
```powershell
cd projeto-Luna.code-workspace\LunaTotem\TotemAPI
mvn -q -DskipTests compile
```

### 2. Definir token e executar
```powershell
$env:WEBHOOK_GHL_TOKEN="ln16012x26"
$env:SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5432/lunadb?currentSchema=luna"
$env:SPRING_DATASOURCE_USERNAME="postgres"
$env:SPRING_DATASOURCE_PASSWORD="sua-senha"

mvn spring-boot:run
```

### 3. Testar (noutra aba)
```powershell
$token = "ln16012x26"
$payload = @{
    contact_id = "ghl-test-001"
    full_name = "Teste GHL"
    phone = "11998887777"
    cpf = "12345678909"
    email = "teste@ghl.com"
    birth_date = "1990-01-01"
    notes = "Teste"
    tenant_id = "tenant-001"
    event_type = "contact.created"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8081/api/webhooks/ghl/patients" `
  -Method POST `
  -Headers @{"x-webhook-token" = $token; "Content-Type" = "application/json"} `
  -Body $payload
```

## ✅ Checklist de Funcionalidades

- [x] DTO com @JsonProperty/@JsonAlias flexível
- [x] Normalizer: datas, CPF, email, telefone
- [x] Service idempotente (dedupe por contact_id:event_type)
- [x] Upsert: busca por GHL contact_id ou CPF
- [x] Proteção de CPF (não sobrescreve se existe)
- [x] Auditoria em webhook_audit
- [x] Token validation (header x-webhook-token)
- [x] Logs mascarados (CPF, email, phone)
- [x] Transacional
- [x] Multi-tenant

## 📊 Endpoints Disponíveis

| Método | Rota | Header | Função |
|--------|------|--------|---------|
| POST | `/api/webhooks/ghl/patients` | `x-webhook-token` | Webhook GHL pacientes |
| GET | `/api/webhooks/resend/health` | - | Health check webhooks |
| GET | `/api/admin/webhooks/audit` | - | Auditoria webhooks |

## 🔐 Variáveis de Ambiente

| Variável | Exemplo | Obrigatório |
|----------|---------|-------------|
| `WEBHOOK_GHL_TOKEN` | `ln16012x26` | Sim |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/lunadb?currentSchema=luna` | Sim |
| `SPRING_DATASOURCE_USERNAME` | `postgres` | Sim |
| `SPRING_DATASOURCE_PASSWORD` | `senha-db` | Sim (pode ser vazio) |
| `JWT_SECRET` | `uma-chave-segura` | Recomendado |

## 📋 Payload Exemplo

```json
{
  "contact_id": "ghl-12345",
  "full_name": "João da Silva",
  "phone": "+55 11 98888-7777",
  "cpf": "123.456.789-09",
  "email": "joao@example.com",
  "birth_date": "1990-01-15",
  "notes": "Paciente GHL",
  "tenant_id": "tenant-001",
  "event_type": "contact.updated"
}
```

## 💾 Banco de Dados

### Alterações em luna.patients
- Nova coluna: `ghl_contact_id` (varchar, UNIQUE)
- Criada automaticamente via Hibernate (ddl-auto=update)

### Tabela existente: luna.webhook_audit
- Usada para deduplicação
- Registra: event_type, status, success, message (dedupeKey)

## 🧪 Testes

Ver `GHL-WEBHOOK.md` para exemplos completos com curl.

## ⚠️ Notas

- Erro de BD: Verificar credenciais PostgreSQL
- Token inválido: Retorna 401
- Evento duplicado: Retorna success com `deduplicated: true`
- CPF unique: Não sobrescreve se já existe em outro paciente
