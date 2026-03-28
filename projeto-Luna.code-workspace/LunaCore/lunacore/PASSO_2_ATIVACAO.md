# PASSO 2 - Fluxo de Ativação de Licenças

## ✅ Implementação Completa

### 📋 DTOs Criados

#### 1. `LicenseStatusResponse`
```java
public record LicenseStatusResponse(
    LicenseStatus status,
    boolean activated,
    String tenantId,
    List<String> modules
) {}
```

**Endpoint**: `GET /license/status?productKey={key}&deviceId={id}`

**Retorna**:
- `status`: Status atual da licença (ACTIVE, PENDING_ACTIVATION, EXPIRED, BLOCKED)
- `activated`: Se o device específico já está ativado
- `tenantId`: ID do tenant associado
- `modules`: Lista de módulos habilitados (ex: ["TOTEM", "LUNAPAY", "CRM_SLIM"])

---

#### 2. `ActivateLicenseRequest`
```java
public record ActivateLicenseRequest(
    @NotBlank String productKey,
    @NotBlank String activationCode,
    @NotBlank String deviceId,
    String deviceName,
    String cnpj,
    String emailResponsavel
) {}
```

**Endpoint**: `POST /license/activate`

**Campos**:
- `productKey`: Chave do produto (ex: "LUNA-TEST-2025-ABCD")
- `activationCode`: Código de ativação (ex: "123456")
- `deviceId`: ID único do dispositivo
- `deviceName`: Nome amigável do dispositivo (opcional)
- `cnpj`: CNPJ da clínica (opcional)
- `emailResponsavel`: Email do responsável (opcional)

---

#### 3. `ActivationResponse`
```java
public record ActivationResponse(
    String tenantId,
    String licenseId,
    boolean requireFirstAdmin,
    List<String> modules
) {}
```

**Retorna após ativação bem-sucedida**:
- `tenantId`: ID do tenant
- `licenseId`: ID da licença
- `requireFirstAdmin`: `true` se ainda não existe um usuário OWNER (precisa chamar /auth/first-admin)
- `modules`: Módulos habilitados

---

### 🔄 Lógica de Negócio

#### GET /license/status
1. Busca a licença pela `productKey`
2. Verifica se está **expirada** ou **bloqueada**
3. Verifica se o `deviceId` está registrado
4. Retorna lista de módulos habilitados
5. Calcula se está `activated` (device registrado + status ACTIVE)

#### POST /license/activate
1. **Valida a licença**: Não pode estar BLOCKED ou EXPIRED
2. **Valida o código de ativação**:
   - Deve existir e não estar usado (`usedAt` = null)
   - Não pode estar expirado
3. **Verifica limite de dispositivos**: Compara devices ativos com `maxDevices`
4. **Registra/atualiza o device**:
   - Cria novo device se não existir
   - Atualiza `lastSeenAt` se já existir
5. **Marca código como usado**: Define `usedAt = now()`
6. **Ativa a licença**: Se estava PENDING_ACTIVATION → muda para ACTIVE
7. **Verifica se existe admin**: Checa se já existe usuário com role OWNER
8. **Retorna resposta** com `requireFirstAdmin = !hasAdmin`

---

### 🗄️ Repositories Utilizados

- `LicenseRepository`: Busca licenças por productKey
- `ActivationCodeRepository`: Valida códigos de ativação
- `DeviceRepository`: Registra e gerencia devices
- `LicenseModuleRepository`: Lista módulos habilitados
- `UserRepository`: Verifica existência de admin (OWNER)

---

### 🧪 Como Testar

#### 1. Preparar dados de teste
Execute o script SQL: `scripts/test-license-activation.sql`

Este script cria:
- 1 tenant: "Clínica Teste"
- 1 licença: productKey = "LUNA-TEST-2025-ABCD"
- 1 código de ativação: "123456"
- 3 módulos: TOTEM, LUNAPAY, CRM_SLIM

#### 2. Testar endpoint de status (ANTES da ativação)
```bash
curl -X GET "http://localhost:8080/license/status?productKey=LUNA-TEST-2025-ABCD&deviceId=totem-001"
```

**Resposta esperada**:
```json
{
  "status": "PENDING_ACTIVATION",
  "activated": false,
  "tenantId": "...",
  "modules": ["TOTEM", "LUNAPAY", "CRM_SLIM"]
}
```

#### 3. Ativar a licença
```bash
curl -X POST http://localhost:8080/license/activate \
  -H "Content-Type: application/json" \
  -d '{
    "productKey": "LUNA-TEST-2025-ABCD",
    "activationCode": "123456",
    "deviceId": "totem-001",
    "deviceName": "Totem Recepção",
    "cnpj": "12.345.678/0001-90",
    "emailResponsavel": "admin@clinicateste.com"
  }'
```

**Resposta esperada**:
```json
{
  "tenantId": "...",
  "licenseId": "...",
  "requireFirstAdmin": true,
  "modules": ["TOTEM", "LUNAPAY", "CRM_SLIM"]
}
```

#### 4. Testar endpoint de status (DEPOIS da ativação)
```bash
curl -X GET "http://localhost:8080/license/status?productKey=LUNA-TEST-2025-ABCD&deviceId=totem-001"
```

**Resposta esperada**:
```json
{
  "status": "ACTIVE",
  "activated": true,
  "tenantId": "...",
  "modules": ["TOTEM", "LUNAPAY", "CRM_SLIM"]
}
```

#### 5. Verificar no banco de dados
```sql
-- Device criado?
SELECT * FROM devices WHERE device_id = 'totem-001';

-- Código marcado como usado?
SELECT code, used_at FROM activation_codes WHERE code = '123456';

-- Status mudou para ACTIVE?
SELECT product_key, status FROM licenses WHERE product_key = 'LUNA-TEST-2025-ABCD';
```

---

### ⚠️ Validações Implementadas

1. **Licença não encontrada** → 404 NOT_FOUND
2. **Licença bloqueada ou expirada** → 400 BAD_REQUEST
3. **Código de ativação inválido** → 400 BAD_REQUEST
4. **Código de ativação expirado** → 400 BAD_REQUEST
5. **Limite de dispositivos atingido** → 400 BAD_REQUEST

---

### 📦 Arquivos Modificados/Criados

#### DTOs:
- ✅ `LicenseStatusResponse.java` - Convertido para record
- ✅ `ActivateLicenseRequest.java` - Convertido para record + novos campos
- ✅ `ActivationResponse.java` - Convertido para record

#### Service:
- ✅ `LicenseService.java` - Reescrito conforme especificação

#### Controller:
- ✅ `LicenseController.java` - Simplificado

#### Repository:
- ✅ `DeviceRepository.java` - Adicionado método `findByLicenseAndDeviceId`

#### Scripts:
- ✅ `test-license-activation.sql` - Script completo de testes

---

### 🎯 Próximo Passo

**PASSO 3**: Implementar autenticação
- `/auth/first-admin` - Criar primeiro admin após ativação
- `/auth/login` - Login com JWT
- Integrar JWT filter no SecurityConfig

---

### 🔗 Integração com LunaTotem

Após ativação bem-sucedida, o LunaTotem deve:

1. Se `requireFirstAdmin = true`:
   - Redirecionar para tela de criação do primeiro admin
   - Chamar `POST /auth/first-admin` com dados do admin
   
2. Se `requireFirstAdmin = false`:
   - Redirecionar para tela de login
   - Chamar `POST /auth/login` para autenticar

3. Salvar `tenantId` localmente para futuras requisições

4. Usar os `modules` retornados para habilitar/desabilitar funcionalidades no front
