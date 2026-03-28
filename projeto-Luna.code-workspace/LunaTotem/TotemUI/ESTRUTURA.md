# Estrutura do Projeto TotemUI

## Organização

O projeto TotemUI é uma aplicação Next.js que integra dois sistemas:

### 1. Sistema de Totem (Páginas Públicas)
- **Localização:** `/src/pages/*` e `/src/app/page.tsx`
- **Funcionalidade:** Interface de autoatendimento para pacientes
- **Rotas:**
  - `/` - Home (página inicial do totem)
  - `/phone-input` - Entrada de telefone
  - `/patient-list` - Lista de pacientes
  - `/check-in-complete` - Confirmação de check-in
  - etc.

### 2. Sistema Administrativo (Dashboard)
- **Localização:** `/src/totem-system/*` e `/src/app/system/page.tsx`
- **Funcionalidade:** Painel administrativo para gestão da clínica
- **Rota:** `/system`
- **Componentes:**
  - Dashboard - Visão geral e estatísticas
  - Patients - Gerenciamento de pacientes
  - Doctors - Gerenciamento de médicos
  - Appointments - Gerenciamento de consultas
  - Calendar - Calendário de agendamentos

## Como Usar

### Desenvolvimento Local

```bash
cd TotemUI
npm install
npm run dev
```

- Interface do Totem: http://localhost:3000
- Sistema Administrativo: http://localhost:3000/system

### Deploy

O projeto está configurado para deploy no Vercel:
- Selecione **Root Directory: TotemUI**
- Framework: Next.js (detectado automaticamente)
- Ambiente: `NEXT_PUBLIC_API_URL=https://seu-backend.render.com`

## Estrutura de Pastas

```
TotemUI/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx           # Home do Totem
│   │   └── system/
│   │       └── page.tsx       # Dashboard Administrativo
│   ├── pages/                  # Páginas do Totem
│   │   ├── Home.tsx
│   │   ├── PhoneInput.tsx
│   │   ├── PatientList.tsx
│   │   └── ...
│   ├── totem-system/          # Sistema Administrativo (migrado do TotemSystem)
│   │   ├── components/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Patients.tsx
│   │   │   ├── Doctors.tsx
│   │   │   ├── Appointments.tsx
│   │   │   └── Calendar.tsx
│   │   └── styles/
│   ├── components/            # Componentes compartilhados
│   │   └── ui/               # shadcn/ui components
│   └── lib/                   # Utilitários e configurações
│       ├── api.ts            # Cliente API
│       └── apiConfig.ts      # Configuração da API
```

## Conexão com Backend

A aplicação se conecta ao backend Spring Boot através das variáveis de ambiente:

- **Desenvolvimento:** `NEXT_PUBLIC_API_URL=http://localhost:3333`
- **Produção:** `NEXT_PUBLIC_API_URL=https://seu-backend.render.com`

Configure em:
- `.env.local` (desenvolvimento)
- `.env.production` (produção)
- Vercel Dashboard (variáveis de ambiente)

## Observações

- Ambos os sistemas (Totem e Administrativo) rodam na mesma aplicação Next.js
- Não é necessário subir dois projetos separados
- O TotemSystem foi integrado ao TotemUI como uma subpasta
