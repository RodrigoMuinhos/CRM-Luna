# 🔗 Configurar Webhook GoHighLevel → TotemAPI

## 📋 Informações Necessárias

### 🌐 URL do Webhook (Railway)
```
https://appealing-appreciation-production.up.railway.app/api/webhooks/ghl/patients
```

### 🔑 Token de Autenticação
```
ln16012x26
```

---

## 🎯 Passo a Passo no GoHighLevel

### 1️⃣ Acessar Configurações de Workflows
1. Entre no GoHighLevel
2. Vá em **Settings** (Configurações)
3. Clique em **Workflows** ou **Automations**

### 2️⃣ Criar ou Editar Workflow
1. Crie um **novo Workflow** ou edite um existente
2. Escolha o gatilho: **Contact Created** ou **Contact Updated**
3. Adicione uma ação: **Webhook**

### 3️⃣ Configurar o Webhook

#### URL do Webhook
```
https://appealing-appreciation-production.up.railway.app/api/webhooks/ghl/patients
```

#### Método HTTP
```
POST
```

#### Headers (Cabeçalhos)
| Nome | Valor |
|------|-------|
| `Content-Type` | `application/json` |
| `x-webhook-token` | `ln16012x26` |

#### Body (Corpo JSON)
```json
{
  "contact_id": "{{contact.id}}",
  "event_type": "contact.create",
  "full_name": "{{contact.name}}",
  "cpf": "{{contact.customField.CPF}}",
  "email": "{{contact.email}}",
  "phone": "{{contact.phone}}",
  "birth_date": "{{contact.customField.DataNascimento}}",
  "tenant_id": "totem",
  "notes": "Criado via GHL em {{timestamp}}"
}
```

---

## 🔧 Mapeamento de Campos

### Campos Obrigatórios
| Campo GHL | Campo API | Descrição |
|-----------|-----------|-----------|
| `{{contact.id}}` | `contact_id` | ID único do contato no GHL |
| `contact.create` ou `contact.update` | `event_type` | Tipo de evento |
| `{{contact.name}}` | `full_name` | Nome completo |
| `{{contact.customField.CPF}}` | `cpf` | CPF (apenas números) |
| `{{contact.phone}}` | `phone` | Telefone (apenas números) |

### Campos Opcionais
| Campo GHL | Campo API | Descrição |
|-----------|-----------|-----------|
| `{{contact.email}}` | `email` | Email do paciente |
| `{{contact.customField.DataNascimento}}` | `birth_date` | Data de nascimento |
| `"totem"` (fixo) | `tenant_id` | Identificador do tenant (sempre "totem") |
| `{{contact.notes}}` | `notes` | Observações |

---

## 📝 Exemplos de Payload

### Exemplo 1: Contato Completo
```json
{
  "contact_id": "khtSMwmZxoKVJuQ2jPfv",
  "event_type": "contact.create",
  "full_name": "Leonardo da Costa Marques",
  "cpf": "023.753.303-07",
  "email": "leonardo@example.com",
  "phone": "(11) 98765-4321",
  "birth_date": "15/03/1985",
  "tenant_id": "totem",
  "notes": "Cliente desde 2024"
}
```

### Exemplo 2: Contato Mínimo
```json
{
  "contact_id": "abc123def456",
  "event_type": "contact.create",
  "full_name": "Maria Silva",
  "cpf": "12345678900",
  "phone": "11987654321"
}
```

---

## ✅ Validação e Teste

### Testar no GoHighLevel
1. No workflow, clique em **Test Webhook**
2. Verifique se retorna:
   ```json
   {
     "success": true,
     "patientId": "uuid-do-paciente",
     "deduplicated": false
   }
   ```

### Testar Manualmente (PowerShell)
```powershell
$headers = @{
    'Content-Type' = 'application/json'
    'x-webhook-token' = 'ln16012x26'
}

$body = @{
    contact_id = 'test_' + (Get-Date -Format 'yyyyMMddHHmmss')
    event_type = 'contact.create'
    full_name = 'Teste Manual'
    cpf = '12345678900'
    phone = '11999999999'
    email = 'teste@example.com'
} | ConvertTo-Json

Invoke-RestMethod `
    -Uri 'https://appealing-appreciation-production.up.railway.app/api/webhooks/ghl/patients' `
    -Method POST `
    -Headers $headers `
    -Body $body
```

---

## 🚨 Possíveis Erros

### ❌ Erro 401: Token Inválido
```json
{
  "success": false,
  "message": "Invalid webhook token"
}
```
**Solução:** Verifique se o header `x-webhook-token` está correto.

### ❌ Erro 400: Campos Obrigatórios Faltando
```json
{
  "success": false,
  "message": "contact_id é obrigatório"
}
```
**Solução:** Verifique se `contact_id` e `event_type` estão sendo enviados.

### ❌ Erro 400: CPF Inválido
```json
{
  "success": false,
  "message": "CPF é obrigatório"
}
```
**Solução:** Certifique-se de que o campo personalizado CPF existe no GHL.

---

## 📊 Monitoramento

### Ver Logs no Railway
1. Acesse: https://railway.app/project/appealing-appreciation
2. Vá em **Deployments** → **Logs**
3. Procure por `[GHL]` para ver webhooks recebidos

### Verificar Banco de Dados
```sql
-- Ver últimos webhooks processados
SELECT * FROM luna.webhook_audit 
ORDER BY created_at DESC 
LIMIT 10;

-- Ver pacientes criados via GHL
SELECT id, name, cpf, email, phone, ghl_contact_id, tenant_id
FROM luna.patients 
WHERE ghl_contact_id IS NOT NULL
ORDER BY created_at DESC;
```

---

## 🔄 Idempotência

O webhook é **idempotente**: enviar o mesmo payload múltiplas vezes **NÃO criará duplicatas**.

**Primeira chamada:**
```json
{
  "success": true,
  "patientId": "abc-123",
  "deduplicated": false  // ← Paciente criado
}
```

**Chamadas subsequentes (mesmo contact_id + event_type):**
```json
{
  "success": true,
  "patientId": "abc-123",
  "deduplicated": true  // ← Ignorado (já existe)
}
```

---

## 🎨 Campos Personalizados no GHL

### Criar Campos Necessários
1. Vá em **Settings** → **Custom Fields**
2. Crie os seguintes campos:
   - **CPF** (tipo: Text)
   - **Data de Nascimento** (tipo: Date)
   - **Plano de Saúde** (tipo: Text) - opcional

### Usar nos Workflows
```
{{contact.customField.CPF}}
{{contact.customField.DataNascimento}}
{{contact.customField.PlanoSaude}}
```

---

## 📞 Suporte

### Logs de Debug
Os logs incluem:
- `[GHL] Webhook recebido - contactId: xxx, eventType: xxx`
- `[GHL] Paciente criado/atualizado`
- `[GHL] Evento já processado` (idempotência)

### Formato de Dados Aceitos

**CPF:** Aceita com ou sem formatação
- ✅ `023.753.303-07`
- ✅ `02375330307`

**Telefone:** Aceita com ou sem formatação
- ✅ `(11) 98765-4321`
- ✅ `11987654321`

**Data:** Múltiplos formatos
- ✅ `15/03/1985` (DD/MM/YYYY)
- ✅ `03/15/1985` (MM/DD/YYYY)
- ✅ `1985-03-15` (ISO)

---

## ✨ Pronto!

Após configurar, todo contato criado ou atualizado no GoHighLevel será automaticamente sincronizado com a tabela `luna.patients` no banco de dados! 🎉
