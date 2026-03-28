# LunaCore - Sistema de Gestão de Licenças e Tenants

Sistema core para gerenciamento de licenças, ativação de dispositivos e autenticação de usuários da plataforma Luna.

## 🚀 Tecnologias

- **Java 17**
- **Spring Boot 3.2.0**
- **Spring Security** (JWT)
- **Spring Data JPA**
- **PostgreSQL**
- **Maven**
- **Lombok**

## 📦 Estrutura do Projeto

```
com.luna.core
 ├─ config          # Configurações do Spring (Security, etc)
 ├─ security        # JWT Utils e filtros de autenticação
 ├─ tenant          # Entidades e lógica de clínicas/tenants
 ├─ license         # Licenças, módulos e códigos de ativação
 ├─ device          # Dispositivos/totens instalados
 ├─ user            # Usuários e roles
 ├─ auth            # Login e autenticação JWT
 └─ common          # Exceptions, enums e utils compartilhados
```

## 🔧 Configuração

### 1. Banco de Dados PostgreSQL

Crie o banco de dados:

```sql
CREATE DATABASE lunacore;
CREATE USER lunacore WITH PASSWORD 'secret';
GRANT ALL PRIVILEGES ON DATABASE lunacore TO lunacore;
```

### 2. Variáveis de Ambiente (Opcional)

```bash
export LUNACORE_JWT_SECRET=your-secret-key-here-minimum-256-bits
```

### 3. Executar a Aplicação

```bash
# Build do projeto
mvn clean install

# Executar
mvn spring-boot:run
```

A aplicação estará disponível em: `http://localhost:8080`

## 📡 Endpoints da API

### 🔐 Autenticação

#### Criar Primeiro Admin
```http
POST /auth/first-admin
Content-Type: application/json

{
  "tenantName": "Clínica Exemplo",
  "cnpj": "12345678000190",
  "email": "admin@clinica.com",
  "name": "Administrador",
  "password": "senha123",
  "phone": "11999999999"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@clinica.com",
  "password": "senha123"
}
```

**Resposta:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "uuid",
  "email": "admin@clinica.com",
  "name": "Administrador",
  "role": "OWNER",
  "tenantId": "uuid",
  "tenantName": "Clínica Exemplo",
  "availableModules": ["TOTEM", "LUNAPAY"]
}
```

### 📋 Licenças

#### Verificar Status da Licença
```http
GET /license/status?productKey=ABC-123-XYZ&deviceId=TOTEM-001
```

**Resposta:**
```json
{
  "valid": true,
  "status": "ACTIVE",
  "message": "License is active and valid",
  "tenantId": "uuid",
  "tenantName": "Clínica Exemplo",
  "validUntil": "2024-12-31T23:59:59Z",
  "enabledModules": ["TOTEM", "LUNAPAY"],
  "deviceRegistered": true,
  "activeDevices": 2,
  "maxDevices": 5
}
```

#### Ativar Licença
```http
POST /license/activate
Content-Type: application/json

{
  "productKey": "ABC-123-XYZ",
  "activationCode": "482739",
  "deviceId": "TOTEM-001",
  "deviceName": "Totem Recepção 1"
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "License activated successfully",
  "deviceId": "uuid",
  "tenantId": "uuid",
  "enabledModules": ["TOTEM", "LUNAPAY"]
}
```

## 🗂️ Modelos de Dados

### Enums Principais

- **TenantStatus**: `ACTIVE`, `SUSPENDED`, `TRIAL`
- **LicensePlan**: `BASIC`, `PRO`, `TOTEM_PAY`, `ENTERPRISE`
- **LicenseStatus**: `ACTIVE`, `PENDING_ACTIVATION`, `EXPIRED`, `BLOCKED`
- **ModuleCode**: `TOTEM`, `LUNAPAY`, `CRM_SLIM`, `CRM_FULL`, `ANALYTICS`
- **UserRole**: `OWNER`, `ADMIN`, `RECEPTION`, `DOCTOR`, `MANAGER`
- **DeviceStatus**: `ACTIVE`, `BLOCKED`

## 🔒 Segurança

- Autenticação via **JWT** (Bearer Token)
- Senha criptografada com **BCrypt**
- Endpoints públicos:
  - `/auth/login`
  - `/auth/first-admin`
  - `/license/status`
  - `/license/activate`
  - `/actuator/**`

## 🧪 Testando a API

### 1. Criar primeiro admin
```bash
curl -X POST http://localhost:8080/auth/first-admin \
  -H "Content-Type: application/json" \
  -d '{
    "tenantName": "Clínica Teste",
    "email": "admin@teste.com",
    "name": "Admin Teste",
    "password": "senha123"
  }'
```

### 2. Fazer login
```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@teste.com",
    "password": "senha123"
  }'
```

### 3. Verificar status de licença
```bash
curl -X GET "http://localhost:8080/license/status?productKey=ABC-123&deviceId=DEV-001"
```

## 📝 Próximos Passos

1. ✅ Estrutura básica do projeto
2. ✅ Autenticação e licenciamento
3. 🔄 Integração com LunaTotem (front + API)
4. 🔄 Adicionar logs de auditoria
5. 🔄 Dashboard de administração
6. 🔄 Integração com LunaPay

## 🤝 Contribuindo

Este é um projeto privado. Para contribuir, entre em contato com a equipe.

## 📄 Licença

Proprietário - Luna © 2024
