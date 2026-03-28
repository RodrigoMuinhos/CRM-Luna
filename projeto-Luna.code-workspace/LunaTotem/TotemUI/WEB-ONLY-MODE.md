# TotemUI - Rotas e modo web-only

## Rotas web/admin

Essas rotas fazem sentido no Vercel:

- `/mobile-login`
- `/system`
- `/admin/videos`
- `/request-access`
- `/forgot-password`
- `/reset-password`

## Rotas kiosk/local

Essas rotas pertencem ao totem local ou ao executável:

- `/`
  - fluxo principal do kiosk
  - check-in, pagamento, descanso, vídeo e interação de tela pública
- `/system/technician`
  - acesso técnico local
- `/system/tef/110`
  - operação TEF local

## Comportamento do modo web-only

Quando `NEXT_PUBLIC_APP_MODE=web-only`:

- `/` redireciona para `/mobile-login`
- `/system/technician` redireciona para `/system`
- `/system/tef/110` redireciona para `/system`
- hotkeys e relógio global do kiosk não são renderizados
- o painel `/system` oculta ações locais de técnico e SiTef
- `/api/tef/*` retorna `404`
- `/api/videos/cache` retorna `404`
- `/api/videos/local/*` retorna `404`

## APIs e persistência no cloud

No modelo atual:

- `/api/videos/playlist-r2` lê primeiro a playlist remota salva no `TotemAPI`
- `/api/videos/save-playlist` persiste no `TotemAPI`
- `/api/videos/admin-playlist` lê a playlist autenticada do tenant no `TotemAPI`

Ainda continuam locais ao `TotemUI` apenas:

- `/api/videos/upload`
- stores locais em `src/app/api/*Store.ts`

Ou seja: o ponto crítico de playlist de vídeos já foi migrado para backend persistente.

## Configuração para Vercel

```env
NEXT_PUBLIC_APP_MODE=web-only
TOTEM_API_PROXY_URL=https://SEU-TOTEMAPI
NEXT_PUBLIC_VIDEO_TENANT_ID=tenant-1
```

## Configuração para kiosk local

```env
NEXT_PUBLIC_APP_MODE=kiosk
```
