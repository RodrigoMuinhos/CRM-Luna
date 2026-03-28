# 🚀 Projeto LunaCore - Setup Completo

## ✅ O que foi criado

### 📦 Estrutura do Projeto

```
lunacore/
├── src/
│   ├── main/
│   │   ├── java/com/luna/core/
│   │   │   ├── LunaCoreApplication.java         # Classe principal
│   │   │   ├── auth/                            # Autenticação
│   │   │   │   ├── controller/
│   │   │   │   │   └── AuthController.java
│   │   │   │   ├── dto/
│   │   │   │   │   ├── FirstAdminRequest.java
│   │   │   │   │   ├── LoginRequest.java
│   │   │   │   │   └── LoginResponse.java
│   │   │   │   └── service/
│   │   │   │       └── AuthService.java
│   │   │   ├── common/                          # Código compartilhado
│   │   │   │   ├── enums/
│   │   │   │   │   ├── TenantStatus.java
│   │   │   │   │   ├── LicensePlan.java
│   │   │   │   │   ├── LicenseStatus.java
│   │   │   │   │   ├── ModuleCode.java
│   │   │   │   │   ├── DeviceStatus.java
│   │   │   │   │   ├── UserRole.java
│   │   │   │   │   └── UserStatus.java
│   │   │   │   └── exception/
│   │   │   │       ├── BusinessException.java
│   │   │   │       ├── NotFoundException.java
│   │   │   │       ├── UnauthorizedException.java
│   │   │   │       ├── ErrorResponse.java
│   │   │   │       └── GlobalExceptionHandler.java
│   │   │   ├── config/                          # Configurações
│   │   │   │   └── SecurityConfig.java
│   │   │   ├── device/                          # Dispositivos/Totens
│   │   │   │   ├── entity/
│   │   │   │   │   └── Device.java
│   │   │   │   └── repository/
│   │   │   │       └── DeviceRepository.java
│   │   │   ├── license/                         # Licenças
│   │   │   │   ├── controller/
│   │   │   │   │   └── LicenseController.java
│   │   │   │   ├── dto/
│   │   │   │   │   ├── ActivateLicenseRequest.java
│   │   │   │   │   ├── ActivationResponse.java
│   │   │   │   │   ├── LicenseStatusRequest.java
│   │   │   │   │   └── LicenseStatusResponse.java
│   │   │   │   ├── entity/
│   │   │   │   │   ├── License.java
│   │   │   │   │   ├── LicenseModule.java
│   │   │   │   │   └── ActivationCode.java
│   │   │   │   ├── repository/
│   │   │   │   │   ├── LicenseRepository.java
│   │   │   │   │   ├── LicenseModuleRepository.java
│   │   │   │   │   └── ActivationCodeRepository.java
│   │   │   │   └── service/
│   │   │   │       └── LicenseService.java
│   │   │   ├── security/                        # JWT & Security
│   │   │   │   ├── JwtUtil.java
│   │   │   │   └── JwtAuthenticationFilter.java
│   │   │   ├── tenant/                          # Clínicas/Tenants
│   │   │   │   ├── entity/
│   │   │   │   │   └── Tenant.java
│   │   │   │   └── repository/
│   │   │   │       └── TenantRepository.java
│   │   │   └── user/                            # Usuários
│   │   │       ├── entity/
│   │   │       │   └── User.java
│   │   │       ├── repository/
│   │   │       │   └── UserRepository.java
│   │   │       └── service/
│   │   │           └── UserService.java
│   │   └── resources/
│   │       └── application.yml
│   └── test/
│       ├── java/com/luna/core/
│       │   └── LunaCoreApplicationTests.java
│       └── resources/
│           └── application-test.yml
├── scripts/
│   └── create-database.sql                      # Script SQL para criar DB
├── postman/
│   └── LunaCore.postman_collection.json         # Coleção Postman
├── .env.example                                 # Exemplo de variáveis
├── .gitignore                                   # Git ignore
├── pom.xml                                      # Maven
├── README.md                                    # Documentação principal
└── DEVELOPMENT.md                               # Guia de desenvolvimento
```

## 🎯 Funcionalidades Implementadas

### ✅ Autenticação & Autorização
- [x] JWT token generation e validação
- [x] Login de usuários
- [x] Criação de primeiro admin
- [x] Spring Security configurado
- [x] Password encoding com BCrypt

### ✅ Gestão de Licenças
- [x] Verificação de status de licença
- [x] Ativação de licença com código
- [x] Controle de dispositivos por licença
- [x] Validação de expiração
- [x] Gestão de módulos (TOTEM, LUNAPAY, etc)

### ✅ Multi-tenancy
- [x] Gestão de tenants (clínicas)
- [x] Isolamento de dados por tenant
- [x] Status de tenant (ACTIVE, SUSPENDED, TRIAL)

### ✅ Gestão de Dispositivos
- [x] Registro de dispositivos
- [x] Controle de limites por licença
- [x] Tracking de primeira e última conexão

### ✅ Gestão de Usuários
- [x] Roles (OWNER, ADMIN, RECEPTION, DOCTOR, MANAGER)
- [x] Status (ACTIVE, BLOCKED)
- [x] Vinculação com tenant

## 📋 Endpoints Disponíveis

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| POST | `/auth/first-admin` | Criar primeiro admin | ❌ |
| POST | `/auth/login` | Login | ❌ |
| GET | `/license/status` | Verificar status da licença | ❌ |
| POST | `/license/activate` | Ativar licença | ❌ |
| GET | `/actuator/health` | Health check | ❌ |

## 🔧 Como Rodar

### 1. Pré-requisitos
- Java 17+
- Maven 3.8+
- PostgreSQL 12+

### 2. Criar banco de dados
```bash
psql -U postgres -f scripts/create-database.sql
```

### 3. Executar aplicação
```bash
mvn clean install
mvn spring-boot:run
```

### 4. Testar
```bash
# Criar admin
curl -X POST http://localhost:8080/auth/first-admin \
  -H "Content-Type: application/json" \
  -d '{"tenantName":"Teste","email":"admin@teste.com","name":"Admin","password":"senha123"}'

# Login
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@teste.com","password":"senha123"}'
```

## 📊 Modelo de Dados

### Entidades Principais
1. **Tenant** - Clínicas/empresas
2. **User** - Usuários do sistema
3. **License** - Licenças de produto
4. **LicenseModule** - Módulos habilitados na licença
5. **ActivationCode** - Códigos de ativação
6. **Device** - Dispositivos/totens registrados

### Relacionamentos
- Tenant 1:N User
- Tenant 1:N License
- License 1:N Device
- License 1:N LicenseModule
- License 1:N ActivationCode

## 🔐 Segurança

- **Autenticação**: JWT Bearer Token
- **Senha**: BCrypt hash
- **Session**: Stateless (JWT)
- **CORS**: Configurável
- **Endpoints públicos**: login, first-admin, license/status, license/activate

## 📦 Dependências

- Spring Boot 3.2.0
- Spring Security
- Spring Data JPA
- PostgreSQL Driver
- JJWT (JWT library)
- Lombok
- Spring Validation
- Spring Actuator

## 🚀 Próximos Passos

1. **Integração com LunaTotem**
   - Ajustar front-end para usar novos endpoints
   - Implementar refresh token
   - Adicionar interceptor para renovação automática

2. **Dashboard Admin**
   - CRUD de licenças
   - Gestão de usuários
   - Visualização de devices conectados
   - Geração de códigos de ativação

3. **Auditoria**
   - Log de todas as ações
   - Histórico de ativações
   - Tracking de uso

4. **Notificações**
   - Alertas de expiração
   - Limite de devices atingido
   - Tentativas de ativação inválidas

5. **LunaPay Integration**
   - Endpoint específicos
   - Validação de módulos

## 📝 Notas Importantes

- O JWT secret deve ser alterado em produção (mínimo 256 bits)
- Alterar `ddl-auto` para `validate` em produção
- Configurar backup automático do banco
- Implementar rate limiting para endpoints públicos
- Adicionar logs estruturados (ELK stack)

## 🤝 Contato

Para dúvidas ou suporte, entre em contato com a equipe Luna.

---

**Status**: ✅ MVP Completo e Funcional
**Versão**: 1.0.0-SNAPSHOT
**Data**: Dezembro 2024
