-- Add CPF column to users table (nullable for existing data)
alter table if exists luna.users add column if not exists cpf varchar(11);
