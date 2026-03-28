# Scripts úteis para o projeto LunaCore

## Desenvolvimento

### Build e executar
```powershell
# Compilar o projeto
mvn clean install

# Executar a aplicação
mvn spring-boot:run

# Executar com profile específico
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

### Testes
```powershell
# Executar todos os testes
mvn test

# Executar testes com cobertura
mvn clean test jacoco:report
```

## Database

### Criar banco de dados
```powershell
# Via psql
psql -U postgres -f scripts/create-database.sql

# Ou via linha de comando
psql -U postgres -c "CREATE DATABASE lunacore;"
psql -U postgres -c "CREATE USER lunacore WITH PASSWORD 'secret';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE lunacore TO lunacore;"
```

### Conectar ao banco
```powershell
psql -U lunacore -d lunacore
```

## Docker (Opcional)

### PostgreSQL via Docker
```powershell
# Subir PostgreSQL
docker run --name lunacore-postgres `
  -e POSTGRES_DB=lunacore `
  -e POSTGRES_USER=lunacore `
  -e POSTGRES_PASSWORD=secret `
  -p 5432:5432 `
  -d postgres:15

# Ver logs
docker logs -f lunacore-postgres

# Parar
docker stop lunacore-postgres

# Remover
docker rm lunacore-postgres
```

## API - Comandos cURL

### Criar primeiro admin
```powershell
curl -X POST http://localhost:8080/auth/first-admin `
  -H "Content-Type: application/json" `
  -d '{\"tenantName\":\"Clínica Teste\",\"email\":\"admin@teste.com\",\"name\":\"Admin\",\"password\":\"senha123\"}'
```

### Login
```powershell
curl -X POST http://localhost:8080/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"admin@teste.com\",\"password\":\"senha123\"}'
```

### Verificar status de licença
```powershell
curl -X GET "http://localhost:8080/license/status?productKey=ABC-123&deviceId=DEV-001"
```

### Ativar licença
```powershell
curl -X POST http://localhost:8080/license/activate `
  -H "Content-Type: application/json" `
  -d '{\"productKey\":\"ABC-123\",\"activationCode\":\"482739\",\"deviceId\":\"DEV-001\",\"deviceName\":\"Totem 1\"}'
```

## Limpar e reconstruir
```powershell
# Limpar tudo e reconstruir
mvn clean install -DskipTests

# Limpar target
mvn clean
```

## IDE

### IntelliJ IDEA
```powershell
# Importar projeto Maven
File > Open > Selecionar pom.xml

# Habilitar annotation processing para Lombok
Settings > Build, Execution, Deployment > Compiler > Annotation Processors
Marcar: Enable annotation processing
```

### VS Code
```powershell
# Extensões recomendadas:
# - Extension Pack for Java
# - Spring Boot Extension Pack
# - Lombok Annotations Support
```
