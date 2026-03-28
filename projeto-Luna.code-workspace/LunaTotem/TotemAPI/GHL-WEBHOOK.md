# GoHighLevel (GHL) Webhook Integration

## Implementação Completa
Webhook idempotente para criar/atualizar pacientes via GoHighLevel com integração segura.

## Arquivos criados/modificados

### DTOs
- `src/main/java/br/lunavita/totemapi/dto/GhlPatientWebhookDto.java` - DTO de entrada do webhook
- `src/main/java/br/lunavita/totemapi/dto/GhlPatientNormalized.java` - Modelo normalizado interno
- `src/main/java/br/lunavita/totemapi/dto/GhlWebhookResult.java` - Resultado do processamento

### Services
- `src/main/java/br/lunavita/totemapi/service/GhlPatientNormalizer.java` - Normalizador de dados (datas, limpeza, validação)
- `src/main/java/br/lunavita/totemapi/service/GhlWebhookPatientService.java` - Lógica idempotente de upsert

### Controllers
- `src/main/java/br/lunavita/totemapi/controller/GhlWebhookPatientController.java` - Endpoint REST

### Modelos
- `src/main/java/br/lunavita/totemapi/model/Patient.java` - Adicionado campo `ghl_contact_id` (UNIQUE)

### Repositórios
- `src/main/java/br/lunavita/totemapi/repository/PatientRepository.java` - Métodos: `findByTenantIdAndGhlContactId()`, `findByGhlContactId()`
- `src/main/java/br/lunavita/totemapi/repository/WebhookAuditRepository.java` - Método: `existsByEventTypeAndMessage()`

## Endpoint

**POST** `/api/webhooks/ghl/patients`

**Headers:**
```
Content-Type: application/json
x-webhook-token: {WEBHOOK_GHL_TOKEN}
```

**Payload:**
```json
{
  "contact_id": "ghl-12345",
  "full_name": "João Silva",
  "phone": "+55 11 98888-7777",
  "cpf": "123.456.789-09",
  "email": "joao@example.com",
  "birth_date": "1990-01-15",
  "notes": "Paciente referenciado por GHL",
  "tenant_id": "tenant-001",
  "event_type": "contact.updated"
}
```

**Response Success (201):**
```json
{
  "success": true,
  "deduplicated": false,
  "patientId": "uuid-do-paciente"
}
```

**Response Deduplicated (200):**
```json
{
  "success": true,
  "deduplicated": true,
  "patientId": "uuid-do-paciente"
}
```

**Response Error (400/401/500):**
```json
{
  "success": false,
  "message": "erro especifico"
}
```

## Segurança

1. **Autenticação via header `x-webhook-token`**
   - Token deve ser definido em variável de ambiente: `WEBHOOK_GHL_TOKEN`
   - Token inválido retorna 401 Unauthorized

2. **Idempotência**
   - Deduplicação por `contact_id:event_type` armazenado em `webhook_audit`
   - Mesmo evento reaplicado não reprocessa, retorna sucesso

3. **Mascaramento de dados sensíveis em logs**
   - CPF, email, telefone são mascarados quando logados
   - Sem vazamento de PII

## Fluxo de Processamento

```
1. Validar token (header x-webhook-token)
2. Normalizar dados (limpeza, formatação de datas)
3. Buscar paciente por:
   a. ghl_contact_id (com filtro de tenant)
   b. ghl_contact_id (sem filtro de tenant)
   c. cpf (com filtro de tenant)
   d. cpf (sem filtro de tenant)
4. Se não encontrado, criar novo paciente
5. Se encontrado, atualizar campos
6. Verificar idempotência em webhook_audit
   - Se já processado, retornar sucesso (deduplicated=true)
   - Se novo, registrar em webhook_audit e retornar sucesso (deduplicated=false)
7. Logar operação (mascarado)
```

## Dados Tratados

- **Campos copiados direto:** name, email, phone, birth_date, notes, ghl_contact_id
- **Campos normalizados:**
  - `cpf`: Remove formatação (123.456.789-09 → 12345678909)
  - `phone`: Remove formatação (+55 11 98888-7777 → 5511988887777)
  - `email`: Lowercase (João@EXAMPLE.COM → joao@example.com)
  - `birth_date`: Normaliza formato para ISO (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD → YYYY-MM-DD)
- **Proteção:** CPF único não pode ser sobrescrito se já existe

## Compilação

```powershell
cd projeto-Luna.code-workspace\LunaTotem\TotemAPI
mvn -q -DskipTests compile
```

## Execução Local

**Configurar variáveis de ambiente:**
```powershell
$env:WEBHOOK_GHL_TOKEN="ln16012x26"
$env:SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5432/lunadb?currentSchema=luna"
$env:SPRING_DATASOURCE_USERNAME="postgres"
$env:SPRING_DATASOURCE_PASSWORD="sua-senha"
```

**Rodar:**
```powershell
mvn spring-boot:run
```

**Porta padrão:** 8081

## Teste com curl

```bash
curl -X POST http://localhost:8081/api/webhooks/ghl/patients \
  -H "Content-Type: application/json" \
  -H "x-webhook-token: ln16012x26" \
  -d '{
    "contact_id": "ghl-test-001",
    "full_name": "Teste GHL",
    "phone": "11998887777",
    "cpf": "12345678909",
    "email": "teste@ghl.com",
    "birth_date": "1990-01-01",
    "notes": "Teste webhook",
    "tenant_id": "tenant-001",
    "event_type": "contact.created"
  }'
```

## Observações

- **tenant_id** é obrigatório para multi-tenancy
- **contact_id** e **event_type** são obrigatórios para idempotência
- Compatível com @JsonAlias para flexibilidade de payloads
- Logs estruturados com emojis para fácil identificação
- Transacional (rollback automático em erros)

## Próximas Etapas (Opcional)

- Testes unitários para normalizer
- Integração com sistema de eventos (rabbitmq, kafka)
- Webhook signature validation (HMAC-SHA256)
- Metricas/monitoring via Prometheus
- Rate limiting por token
