# CRM-Luna

Repositório limpo para o produto cloud/web da Luna.

Este pacote foi separado do monorepo operacional para evitar subir:

- executáveis Windows
- `sitef-bridge`, pinpad e artefatos TEF locais
- kits do cliente, dumps, logs e evidências operacionais
- vídeos/cache local do kiosk

## Conteúdo

- `projeto-Luna.code-workspace/LunaCore/lunacore`
- `projeto-Luna.code-workspace/LunaTotem/TotemAPI`
- `projeto-Luna.code-workspace/LunaTotem/TotemUI`
- `docker-compose.deploy.yml`
- `docs/DEPLOY-MODEL.md`

## Modelo

- `LunaCore`: autenticação, usuários e proxy de contexto
- `TotemAPI`: dados clínicos, configurações e playlist remota de vídeos
- `TotemUI`: interface web/admin e modo `web-only` para Vercel

## Vídeos

- o CRM online não reproduz vídeos
- o online cadastra a playlist
- o totem local consome a playlist remota
- a playlist agora é persistida no `TotemAPI`

## Subir localmente

```powershell
copy .env.example .env
docker compose -f docker-compose.deploy.yml up -d --build
```

## Vercel

Variáveis mínimas:

```env
TOTEM_API_PROXY_URL=https://api.seu-dominio.com
NEXT_PUBLIC_API_URL=https://api.seu-dominio.com
NEXT_PUBLIC_APP_MODE=web-only
NEXT_PUBLIC_VIDEO_TENANT_ID=tenant-1
```

Veja também:

- `docs/DEPLOY-MODEL.md`
- `docs/RAILWAY-BACKEND.md`
- `projeto-Luna.code-workspace/LunaTotem/TotemUI/WEB-ONLY-MODE.md`
- `projeto-Luna.code-workspace/LunaTotem/TotemUI/VERCEL-WEB-CHECKLIST.md`

## Railway

Backend recomendado no Railway:

- `projeto-Luna.code-workspace/LunaCore/lunacore`
- `projeto-Luna.code-workspace/LunaTotem/TotemAPI`

Guia:

- `docs/RAILWAY-BACKEND.md`
