# Modelo de Deploy

## Objetivo

Separar formalmente o que sobe na cloud do que pertence ao executável local do totem.

Essa separação evita:

- subir binários Windows e artefatos TEF no deploy
- misturar atualização de CRM/API com atualização do executável
- aumentar custo de build, storage e memória por material que não roda online

## Fronteira correta

### Cloud deploy

Componentes que podem subir online:

- `LunaCore`
- `TotemAPI`
- banco de dados
- configurações do totem
- cadastro e metadados de playlist de vídeos
- CRM/mobile web em repositório próprio

### Executável local

Componentes que não fazem parte do deploy cloud:

- `TotemUI` do kiosk
- `LunaPay` quando o pagamento é exclusivamente local
- `sitef-bridge`
- `print-bridge`
- pinpad/siTEF
- `.exe`, `.zip`, kits do cliente, DLLs, instaladores e evidências operacionais

## Regra de negócio para vídeos

- O CRM online não precisa exibir vídeo.
- O online apenas cadastra a playlist e os metadados.
- O totem local busca a playlist ao iniciar e, opcionalmente, faz uma checagem diária.
- O vídeo continua sendo exibido somente no totem.

## Arquivos operacionais

- `docker-compose.yml`
  - stack completo local, útil para laboratório, homologação e debug do kiosk
- `docker-compose.deploy.yml`
  - stack mínimo de cloud
  - não inclui executável, `TotemUI`, `LunaPay` local nem bridges

## Comandos

### Deploy cloud

```powershell
docker compose -f docker-compose.deploy.yml up -d --build
```

### Stack local completo

```powershell
docker compose up -d --build
```

## Política recomendada de repositórios

### Repositório de deploy

Deve conter apenas:

- código da API/cloud
- infraestrutura de deploy
- contratos de sincronização com o totem

### Repositório de release local

Deve conter:

- empacotamento do executável
- instaladores
- bridges locais
- artefatos Windows

## Observação

No estado atual do workspace, o novo repositório `CRM-Luna` ainda está vazio. Portanto, o modelo correto é:

- cloud: API/configuração
- local: executável do totem
- CRM/mobile: repositório próprio quando o código for publicado
