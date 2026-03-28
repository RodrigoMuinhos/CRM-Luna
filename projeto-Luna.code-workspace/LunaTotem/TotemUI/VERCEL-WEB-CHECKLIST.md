# Vercel Web-Only Checklist

## Objetivo

Executar o `TotemUI` no Vercel apenas como interface web/admin, sem comportamento de kiosk local.

## Variáveis mínimas

```env
NEXT_PUBLIC_APP_MODE=web-only
TOTEM_API_PROXY_URL=https://SEU-TOTEMAPI
LUNACORE_PROXY_URL=https://SEU-LUNACORE
NEXT_PUBLIC_API_URL=https://SEU-TOTEMAPI
NEXT_PUBLIC_VIDEO_TENANT_ID=tenant-1
```

## Rotas esperadas no Vercel

- `/` -> redireciona para `/mobile-login`
- `/mobile-login`
- `/system`
- `/request-access`
- `/forgot-password`
- `/reset-password`
- `/admin/videos`

## APIs bloqueadas no web-only

- `/api/tef/*`
- `/api/videos/cache`
- `/api/videos/local/*`

## Playlist de vídeos

O ponto crítico de vídeo agora está no backend:

- a playlist do totem é salva no `TotemAPI`
- o admin carrega a playlist autenticada por tenant
- o totem lê a playlist pública do backend
- se o backend falhar, o sistema ainda cai para a playlist padrão do R2

## Limitações remanescentes

Ainda permanecem locais e não devem entrar no fluxo web/admin:

- `/api/videos/upload`
- cache local de mídia
- stores JSON usados só no kiosk local
