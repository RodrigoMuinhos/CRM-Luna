# Script para criar o banco de dados PostgreSQL
# Execute: psql -U postgres -f create-database.sql

-- Criar database
CREATE DATABASE lunacore;

-- Criar usuário
CREATE USER lunacore WITH PASSWORD 'secret';

-- Conceder privilégios
GRANT ALL PRIVILEGES ON DATABASE lunacore TO lunacore;

-- Conectar ao banco
\c lunacore

-- Conceder privilégios no schema
GRANT ALL ON SCHEMA public TO lunacore;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO lunacore;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO lunacore;

-- Database de teste (opcional)
CREATE DATABASE lunacore_test;
GRANT ALL PRIVILEGES ON DATABASE lunacore_test TO lunacore;
