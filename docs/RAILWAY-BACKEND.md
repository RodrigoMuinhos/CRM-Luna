# Railway Backend

## Objetivo

Subir o backend cloud da Luna no Railway com dois serviços separados:

- `LunaCore`
- `TotemAPI`

O `TotemUI` web/admin continua no Vercel.

## Estrutura no Railway

Crie um projeto no Railway e adicione dois serviços apontando para este mesmo repositório:

- `lunacore`
  - root directory: `projeto-Luna.code-workspace/LunaCore/lunacore`
- `totemapi`
  - root directory: `projeto-Luna.code-workspace/LunaTotem/TotemAPI`

Os dois serviços usam `Dockerfile`.

## Ordem recomendada

1. Suba `totemapi`.
2. Anote a URL pública gerada pelo Railway.
3. Suba `lunacore`.
4. Configure `TOTEM_API_BASE_URL` no `lunacore` apontando para a URL pública do `totemapi`.
5. Atualize o Vercel para usar a URL pública do `totemapi`.

## Variáveis do TotemAPI

Obrigatórias:

```env
PORT=8081
SPRING_DATASOURCE_URL=jdbc:postgresql://...
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=...
JWT_SECRET=...
TOTEM_ENCRYPTION_KEY=...
ALLOWED_ORIGINS=https://seu-projeto.vercel.app
```

Opcionais:

```env
WEBHOOK_GHL_TOKEN=
RESEND_API_KEY=
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_WEBHOOK_SECRET=
LUNAPAY_BASE_URL=
LUNAPAY_PIX_GATEWAY=SITEF
LUNAPAY_PIX_EXPIRATION_MINUTES=30
SPRING_MAIL_HEALTH_ENABLED=false
SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE=3
SPRING_DATASOURCE_HIKARI_MINIMUM_IDLE=1
SPRING_DATASOURCE_HIKARI_CONNECTION_TIMEOUT=15000
SPRING_DATASOURCE_HIKARI_IDLE_TIMEOUT=300000
SPRING_DATASOURCE_HIKARI_MAX_LIFETIME=600000
SPRING_JPA_HIBERNATE_DDL_AUTO=update
```

## Variáveis do LunaCore

Obrigatórias:

```env
PORT=8080
SPRING_DATASOURCE_URL=jdbc:postgresql://...
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=...
JWT_SECRET=...
TOTEM_API_BASE_URL=https://totemapi-production.up.railway.app
```

Opcionais:

```env
TOTEM_API_CONNECT_TIMEOUT=2s
TOTEM_API_READ_TIMEOUT=5s
```

## Variáveis do Vercel

Depois que o `TotemAPI` estiver público, configure no Vercel:

```env
TOTEM_API_PROXY_URL=https://totemapi-production.up.railway.app
NEXT_PUBLIC_API_URL=https://totemapi-production.up.railway.app
NEXT_PUBLIC_APP_MODE=web-only
NEXT_PUBLIC_VIDEO_TENANT_ID=tenant-1
NEXT_PUBLIC_VIDEO_AUTO_CACHE=false
```

## Observações importantes

- `TotemAPI` permanece com `SPRING_JPA_HIBERNATE_DDL_AUTO=update` por enquanto.
- Não configure `validate` no `TotemAPI` até introduzir Flyway nele.
- `LunaCore` pode continuar com validação do schema.
- O backend expõe healthcheck em `/actuator/health`.
- Para custo menor, mantenha apenas 1 instância por serviço no início.
