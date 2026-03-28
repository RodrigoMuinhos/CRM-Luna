# Configuração de Vídeos do Cloudflare R2

## 📦 Como funciona

O sistema busca vídeos do seu **Cloudflare R2** e os **cacheia localmente** para melhor performance e funcionamento offline.

## 🔧 Passo a Passo

### 1. Configure a URL pública do R2

No Cloudflare R2, você precisa tornar o bucket público:

1. Acesse o dashboard do Cloudflare
2. Vá em **R2** → Seu bucket `lunatotem`
3. Em **Settings** → **Public Access**
4. Clique em **Connect a Custom Domain** ou use a URL pública padrão

A URL será algo como:
- Padrão: `https://pub-abc123def456.r2.dev/lunatotem/Videos`
- Custom: `https://videos.lunavita.com.br`

### 2. Crie o arquivo `.env.local`

Copie o arquivo `.env.local.example` e renomeie para `.env.local`:

```bash
cp .env.local.example .env.local
```

Edite e substitua `YOUR-ACCOUNT-ID` pela URL real do seu R2:

```env
# URL pública do bucket R2
R2_PUBLIC_URL=https://pub-SEU-ID-AQUI.r2.dev/lunatotem/Videos

# URL da playlist (mantém localhost em dev)
VIDEO_PLAYLIST_URL=http://localhost:3000/api/videos/playlist-r2
NEXT_PUBLIC_VIDEO_PLAYLIST_URL=http://localhost:3000/api/videos/playlist-r2
```

### 3. Liste seus vídeos

Edite o arquivo `src/app/api/videos/playlist-r2/route.ts` e atualize a lista de vídeos conforme os arquivos no seu R2:

```typescript
const videos: R2Video[] = [
  {
    id: 'video-001',
    url: `${R2_BASE_URL}/5Motivos.mp4`,
    title: '5 Motivos',
    sizeBytes: 86210000,
  },
  // Adicione seus outros vídeos aqui
];
```

### 4. Reinicie o servidor

```bash
npm run dev
```

## 🚀 Como funciona o cache

1. **Ao iniciar**, o sistema busca a lista de vídeos do R2
2. **Automaticamente**, baixa cada vídeo para `public/uploads/videos/cache/`
3. **No modo de espera**, usa o vídeo cacheado (se disponível) ou direto do R2
4. **Offline**, continua funcionando com os vídeos cacheados

## 📂 Estrutura de arquivos

```
TotemUI/
├── .env.local                           # Configuração do R2 (NÃO versionar)
├── data/
│   └── video-settings.json              # Configuração ativa
├── public/uploads/videos/cache/         # Vídeos baixados do R2
├── src/
│   ├── app/api/videos/
│   │   ├── playlist-r2/route.ts         # Lista vídeos do R2
│   │   └── cache/route.ts               # Cache de vídeos
│   └── hooks/
│       └── useR2Videos.ts               # Hook para gerenciar vídeos
```

## 🎬 Testando

### 1. Verificar lista de vídeos:
```bash
curl http://localhost:3000/api/videos/playlist-r2
```

### 2. Forçar cache de um vídeo:
```bash
curl -X POST http://localhost:3000/api/videos/cache \
  -H "Content-Type: application/json" \
  -d '{"videoId":"video-001","videoUrl":"https://seu-r2.com/5Motivos.mp4"}'
```

### 3. Ver vídeos cacheados:
```bash
curl http://localhost:3000/api/videos/cache
```

## ⚙️ Configurações

### Tempo de inatividade (modo de espera)

Edite `data/video-settings.json`:

```json
{
  "inactivityMinutes": 3  // 1-5 minutos
}
```

### Desabilitar cache automático

Se não quiser baixar os vídeos (usar direto do R2):

```typescript
// Em src/app/page.tsx
const { activeVideoSrc } = useR2Videos({
  autoCache: false,  // Desabilita cache
});
```

## 🔍 Troubleshooting

### Vídeo não aparece no modo de espera

1. Verifique se a URL do R2 está correta no `.env.local`
2. Teste a URL manualmente no navegador
3. Veja o console do navegador (F12) para erros
4. Verifique se o R2 está com acesso público habilitado

### Cache não está funcionando

1. Verifique se a pasta `public/uploads/videos/cache/` existe e tem permissão de escrita
2. Veja os logs do servidor Node.js
3. Teste o endpoint `/api/videos/cache` manualmente

### CORS error do R2

Se ver erro de CORS no console, adicione no Cloudflare R2:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, HEAD
```

## 📝 Notas

- Vídeos grandes podem demorar alguns minutos para cachear
- O cache é persistente (não é apagado ao reiniciar)
- Para limpar o cache, delete a pasta `public/uploads/videos/cache/`
