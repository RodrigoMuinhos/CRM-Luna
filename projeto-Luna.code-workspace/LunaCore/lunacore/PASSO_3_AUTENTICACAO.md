# PASSO 3 - Autenticação com JWT

## ✅ Implementação Completa

### 📋 Componentes Implementados

#### 1. DTOs de Autenticação (Records)

##### `FirstAdminRequest`
```java
public record FirstAdminRequest(
    @NotBlank String tenantId,
    @NotBlank String name,
    @Email @NotBlank String email,
    @Size(min = 8) String password
) {}
```

**Endpoint**: `POST /api/auth/first-admin`

**Quando usar**: Após ativação de licença quando `requireFirstAdmin = true`

**Validações**:
- Apenas 1 usuário com role OWNER por tenant
- Email não pode estar em uso
- Senha mínima de 8 caracteres

---

##### `LoginRequest`
```java
public record LoginRequest(
    @Email @NotBlank String email,
    @NotBlank String password,
    String deviceId
) {}
```

**Endpoint**: `POST /api/auth/login`

**Campos**:
- `email`: Email do usuário
- `password`: Senha
- `deviceId`: ID do dispositivo (opcional, para auditoria futura)

---

##### `LoginResponse`
```java
public record LoginResponse(
    String accessToken,
    String tokenType,
    Long expiresIn,
    String userId,
    String tenantId,
    String name,
    String email,
    String role,
    List<String> modules
) {}
```

**Retorna após login bem-sucedido**:
- `accessToken`: JWT token para autenticação
- `tokenType`: Sempre "Bearer"
- `expiresIn`: Tempo de expiração em segundos (3600 = 1h)
- `userId`: ID do usuário logado
- `tenantId`: ID do tenant
- `name`: Nome do usuário
- `email`: Email do usuário
- `role`: Role (OWNER, ADMIN, RECEPTION, DOCTOR, FINANCE)
- `modules`: Módulos habilitados na licença

---

### 🔐 JwtUtil

Responsável por gerar e validar tokens JWT.

#### Métodos Principais:

```java
// Gerar token
String generateToken(User user, Tenant tenant, List<String> modules)

// Validar token
boolean isValid(String token)

// Extrair informações
String getUserId(String token)
String getTenantId(String token)
String getRole(String token)
List<String> getModules(String token)
Claims getClaims(String token)
```

#### Claims no Token:
- `sub` (subject): User ID
- `tenantId`: ID do tenant
- `role`: Role do usuário
- `modules`: Lista de módulos habilitados
- `iat`: Issued At (timestamp de criação)
- `exp`: Expiration (timestamp de expiração)

---

### 🛡️ JwtAuthenticationFilter

Filter que intercepta todas as requisições e valida o JWT.

**Fluxo**:
1. Verifica header `Authorization: Bearer {token}`
2. Extrai e valida o token
3. Busca o usuário no banco
4. Verifica se está ACTIVE
5. Cria `Authentication` no `SecurityContext`
6. Adiciona authorities baseadas no role

**Resultado**: Usuário autenticado disponível via `@AuthenticationPrincipal` ou `SecurityContextHolder`

---

### 🔑 AuthService

#### `createFirstAdmin(FirstAdminRequest)`

**Validações**:
1. Tenant deve existir
2. Não pode já existir um OWNER para esse tenant
3. Email não pode estar em uso
4. Cria usuário com role OWNER e status ACTIVE

**Resposta**: 200 OK ou exceção

---

#### `login(LoginRequest)`

**Validações**:
1. ✅ Usuário existe
2. ✅ Senha correta
3. ✅ Usuário status = ACTIVE
4. ✅ Tenant status = ACTIVE ou TRIAL
5. ✅ Licença existe e status = ACTIVE
6. ✅ Busca módulos habilitados
7. ✅ Gera JWT com todas as informações

**Resposta**: `LoginResponse` com token e dados do usuário

---

### 🛠️ SecurityConfig

Configuração de segurança Spring.

#### Endpoints Públicos (não requerem autenticação):
- `POST /auth/login`
- `POST /auth/first-admin`
- `GET /license/status`
- `POST /license/activate`
- `/actuator/**`

#### Endpoints Protegidos:
- Todos os demais requerem header `Authorization: Bearer {token}`

#### Configuração:
- CSRF desabilitado (API stateless)
- Session policy: STATELESS
- JWT filter antes do UsernamePasswordAuthenticationFilter
- Password encoder: BCryptPasswordEncoder

---

### 🧪 Como Testar

#### Pré-requisitos:
1. Execute `scripts/test-license-activation.sql` (PASSO 2)
2. Ative uma licença
3. Anote o `tenantId` retornado

#### Teste 1: Criar Primeiro Admin

```bash
curl -X POST http://localhost:8080/api/auth/first-admin \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "SEU_TENANT_ID",
    "name": "Dr. Administrador",
    "email": "admin@clinica.com",
    "password": "SenhaForte@123"
  }'
```

**Resposta**: `200 OK`

#### Teste 2: Login

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@clinica.com",
    "password": "SenhaForte@123",
    "deviceId": "totem-001"
  }'
```

**Resposta**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9.eyJ0ZW5hbnRJZCI...",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "tenantId": "660e8400-e29b-41d4-a716-446655440000",
  "name": "Dr. Administrador",
  "email": "admin@clinica.com",
  "role": "OWNER",
  "modules": ["TOTEM", "LUNAPAY", "CRM_SLIM"]
}
```

#### Teste 3: Usar JWT em Requisição Protegida

```bash
curl -X GET http://localhost:8080/api/algum-endpoint \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

### 🚨 Validações e Erros

| Cenário | Status | Mensagem |
|---------|--------|----------|
| Tenant não encontrado | 404 | "Tenant não encontrado" |
| Já existe OWNER | 400 | "Já existe um administrador principal" |
| Email em uso | 400 | "E-mail já em uso" |
| Credenciais inválidas | 401 | "Credenciais inválidas" |
| Usuário bloqueado | 401 | "Usuário bloqueado/inativo" |
| Tenant inativo | 401 | "Tenant inativo" |
| Licença não encontrada | 401 | "Licença não encontrada" |
| Licença inativa | 401 | "Licença não ativa" |

---

### 🔄 Fluxo Completo - LunaTotem

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Verificar Status da Licença                             │
│    GET /license/status?productKey=XXX&deviceId=YYY         │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │ activated = false?       │
              └────────┬─────────────────┘
                       │ SIM
                       ▼
              ┌──────────────────────────┐
              │ 2. Ativar Licença        │
              │ POST /license/activate   │
              └────────┬─────────────────┘
                       │
                       ▼
              ┌──────────────────────────────┐
              │ requireFirstAdmin = true?    │
              └────────┬────────────┬────────┘
                  SIM  │            │ NÃO
                       ▼            ▼
        ┌───────────────────────┐  │
        │ 3. Criar Admin        │  │
        │ POST /auth/first-admin│  │
        └──────────┬────────────┘  │
                   │                │
                   └────────┬───────┘
                            ▼
                   ┌────────────────────┐
                   │ 4. Login           │
                   │ POST /auth/login   │
                   └────────┬───────────┘
                            │
                            ▼
                   ┌────────────────────────────┐
                   │ 5. Salvar accessToken       │
                   │ Usar em todas requisições:  │
                   │ Authorization: Bearer TOKEN │
                   └────────────────────────────┘
```

---

### 📦 Arquivos Modificados/Criados

#### Enums:
- ✅ `UserRole.java` - OWNER, ADMIN, RECEPTION, DOCTOR, FINANCE

#### DTOs:
- ✅ `FirstAdminRequest.java` - Record
- ✅ `LoginRequest.java` - Record com deviceId
- ✅ `LoginResponse.java` - Record com todos os campos

#### Security:
- ✅ `JwtUtil.java` - Geração e validação de JWT
- ✅ `JwtAuthenticationFilter.java` - Filter de autenticação
- ✅ `SecurityConfig.java` - Configuração Spring Security

#### Service:
- ✅ `AuthService.java` - Lógica de first-admin e login

#### Controller:
- ✅ `AuthController.java` - Endpoints de autenticação

#### Repository:
- ✅ `LicenseRepository.java` - Método `findFirstByTenantOrderByValidUntilDesc`

#### Scripts:
- ✅ `test-authentication.sql` - Testes completos

---

### 🎯 Próximos Passos

**PASSO 4**: Compartilhar JWT entre LunaCore e LunaTotem API

Opções:
1. **Biblioteca compartilhada**: Criar módulo comum com `JwtUtil`
2. **Duplicar validação**: Copiar `JwtUtil` para LunaTotem API
3. **Serviço de validação**: LunaTotem chama endpoint do LunaCore

**Recomendação**: Opção 2 (mais simples) - copiar `JwtUtil` e usar mesmo `jwt.secret`

---

### 💡 Dicas de Implementação no Front

```javascript
// Após ativação
const activationResponse = await activateLicense(...);
if (activationResponse.requireFirstAdmin) {
  // Mostrar formulário de criação de admin
  showFirstAdminForm(activationResponse.tenantId);
} else {
  // Ir direto pro login
  showLoginForm();
}

// Após criar admin ou já existir
const loginResponse = await login(email, password, deviceId);

// Salvar token
localStorage.setItem('accessToken', loginResponse.accessToken);
localStorage.setItem('tenantId', loginResponse.tenantId);
localStorage.setItem('userId', loginResponse.userId);
localStorage.setItem('modules', JSON.stringify(loginResponse.modules));

// Usar em todas as requisições
axios.defaults.headers.common['Authorization'] = 
  `Bearer ${loginResponse.accessToken}`;

// Habilitar módulos dinamicamente
const modules = JSON.parse(localStorage.getItem('modules'));
if (modules.includes('LUNAPAY')) {
  enablePaymentFeature();
}
```

---

### 🔒 Segurança

- ✅ Senha hasheada com BCrypt
- ✅ JWT assinado com HS256
- ✅ Token expira em 1 hora
- ✅ Validações de status (user, tenant, license)
- ✅ CSRF desabilitado (API stateless)
- ✅ Apenas HTTPS em produção (configurar no deployment)

---

### 📝 Variáveis de Ambiente

Já configuradas em `application.yml`:

```yaml
jwt:
  secret: ${LUNACORE_JWT_SECRET:dev-secret-key-change-in-production-minimum-256-bits}
  expiration: 3600000   # 1 hora em milissegundos
```

**⚠️ IMPORTANTE**: Em produção, definir `LUNACORE_JWT_SECRET` como variável de ambiente com valor seguro (mínimo 256 bits)
