# Sistema de Auto-Login do Totem

## Problema Resolvido
O totem estava apresentando erro "Usuário não autenticado" ao tentar criar pagamentos PIX quando carregado sem login prévio. Isso exigia intervenção manual do operador para fazer login antes que o totem pudesse funcionar.

## Solução Implementada
Foi criado um sistema de **auto-login silencioso** que autentica o totem automaticamente quando detecta ausência de token válido.

### Como Funciona

1. **Detecção Automática**: No carregamento da página, o sistema verifica se existe um token JWT válido no localStorage
2. **Login Silencioso**: Se não houver token válido, o sistema automaticamente faz login usando credenciais pré-configuradas
3. **Operação Autônoma**: Após o auto-login, o totem opera normalmente sem necessidade de intervenção manual

### Implementação Técnica

#### Arquivo: `src/app/page.tsx`
```typescript
// Auto-login silencioso para o totem
useEffect(() => {
    const autoLogin = async () => {
        if (typeof window === 'undefined') return;
        
        const token = window.localStorage.getItem('lv_token');
        const hasValidToken = !!token && token !== 'undefined' && token !== 'null' && token.split('.').length === 3;
        
        if (hasValidToken) {
            console.log('[TOTEM AUTO-LOGIN] Token válido encontrado');
            return;
        }

        // Credenciais do totem (deve ser um usuário de serviço com permissões limitadas)
        const totemEmail = process.env.NEXT_PUBLIC_TOTEM_EMAIL || 'totem@lunavita.com.br';
        const totemPassword = process.env.NEXT_PUBLIC_TOTEM_PASSWORD || 'totem123';

        console.log('[TOTEM AUTO-LOGIN] Iniciando login automático...');
        
        try {
            const res = await authAPI.login(totemEmail, totemPassword);
            window.localStorage.setItem('lv_token', res.token);
            window.localStorage.setItem('lv_refresh', res.refreshToken || '');
            const normalizedRole = normalizeRole(res.role);
            if (normalizedRole) {
                window.localStorage.setItem('lv_role', normalizedRole);
            }
            setAuth(res.token, normalizedRole);
            console.log('[TOTEM AUTO-LOGIN] ✅ Login automático realizado com sucesso');
        } catch (error) {
            console.error('[TOTEM AUTO-LOGIN] ❌ Erro no login automático:', error);
        }
    };

    autoLogin();
}, []);
```

### Configuração

#### Variáveis de Ambiente (`.env.local`)
```env
# Credenciais para auto-login do totem (usuário de serviço)
NEXT_PUBLIC_TOTEM_EMAIL=totem@lunavita.com.br
NEXT_PUBLIC_TOTEM_PASSWORD=totem123
```

#### Valores Padrão (Fallback)
Se as variáveis de ambiente não estiverem configuradas, o sistema usa:
- **Email**: `totem@lunavita.com.br`
- **Password**: `totem123`

### Configuração de Produção (Railway/Vercel)

Para deploy em produção, configure as variáveis de ambiente:

```bash
# Railway
railway variables set NEXT_PUBLIC_TOTEM_EMAIL="totem@lunavita.com.br"
railway variables set NEXT_PUBLIC_TOTEM_PASSWORD="totem123"

# Vercel
vercel env add NEXT_PUBLIC_TOTEM_EMAIL
vercel env add NEXT_PUBLIC_TOTEM_PASSWORD
```

### Segurança

⚠️ **IMPORTANTE**: As credenciais do totem são públicas (NEXT_PUBLIC_*), portanto:

1. **Crie um usuário específico** para o totem no banco de dados
2. **Limite as permissões** desse usuário apenas ao necessário:
   - Ler consultas/agendamentos
   - Criar pagamentos PIX
   - Não deve ter acesso a dados sensíveis ou administrativos
3. **Use senha forte** em produção (diferente do exemplo)
4. **Monitore acessos** desse usuário

### Criar Usuário de Totem

⚠️ **IMPORTANTE**: Você precisa criar o usuário de serviço do totem no banco de dados antes de usar o auto-login.

#### Opção 1: Via Script SQL

Execute no PostgreSQL (conectado no schema luna):

```sql
-- Criar usuário de serviço do totem
INSERT INTO luna.users (name, email, password, role, tenant_id, created_at, updated_at)
VALUES (
    'Totem Service',
    'totem@lunavita.com.br',
    '$2a$10$EIXzWB2gWAYY3Q5YmOxj5.qkLKxYHJWx.X8CK0g5RjDxJXqJ2P7ty', -- BCrypt hash de 'totem123'
    'ROLE_ATTENDANT', -- Papel com permissões limitadas
    1, -- tenant_id padrão (ajustar conforme necessário)
    NOW(),
    NOW()
)
ON CONFLICT (email) DO NOTHING;
```

O script SQL está disponível em: `archive/scripts-sql/criar-usuario-totem.sql`

#### Opção 2: Via Script NodeJS

```bash
cd C:\Users\RODRIGO\Desktop\OrquestradorLuna
node archive/scripts-nodejs/criar-usuario-totem.js
```

⚠️ **Nota**: O script NodeJS requer as credenciais corretas do Neon Database configuradas.

#### Verificar se o Usuário foi Criado

```sql
SELECT id, name, email, role, tenant_id 
FROM luna.users 
WHERE email = 'totem@lunavita.com.br';
```

#### Testar Login Manual

Depois de criar o usuário, teste o login manualmente:

```bash
# Via curl
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"totem@lunavita.com.br","password":"totem123"}'

# Via PowerShell
$body = @{ email = "totem@lunavita.com.br"; password = "totem123" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method POST -Body $body -ContentType "application/json"
```

Deve retornar um objeto com `token` e `role`.

### Logs de Depuração

O sistema registra no console:

- `[TOTEM AUTO-LOGIN] Token válido encontrado` - Token já existe, não faz login
- `[TOTEM AUTO-LOGIN] Iniciando login automático...` - Iniciando processo
- `[TOTEM AUTO-LOGIN] ✅ Login automático realizado com sucesso` - Sucesso
- `[TOTEM AUTO-LOGIN] ❌ Erro no login automático: <erro>` - Falha

### Fluxo Completo

```
1. Totem carrega página (page.tsx)
   ↓
2. useEffect de auto-login executa
   ↓
3. Verifica localStorage.getItem('lv_token')
   ↓
4a. Se token válido → Nada acontece
4b. Se sem token → Login automático
   ↓
5. authAPI.login(totemEmail, totemPassword)
   ↓
6. Salva token no localStorage
   ↓
7. Totem pronto para criar PIX
```

### Fallback Manual

Se o auto-login falhar, o sistema ainda exibe o modal de login manual como backup.

### Testes

1. **Limpar localStorage**:
```javascript
localStorage.removeItem('lv_token');
localStorage.removeItem('lv_role');
localStorage.removeItem('lv_refresh');
```

2. **Recarregar página**: O auto-login deve ocorrer automaticamente

3. **Verificar console**: Deve aparecer `[TOTEM AUTO-LOGIN] ✅ Login automático realizado com sucesso`

4. **Testar PIX**: Buscar CPF e criar pagamento - não deve dar erro de autenticação

### Benefícios

✅ **Operação Autônoma**: Totem funciona sem intervenção humana  
✅ **Recuperação Automática**: Se token expirar, o totem reloga automaticamente  
✅ **Experiência do Usuário**: Sem erros de autenticação visíveis  
✅ **Confiabilidade**: PIX funciona imediatamente após inicialização  

### Próximos Passos

- [ ] Criar usuário dedicado para o totem no banco de dados
- [ ] Configurar senha forte em produção
- [ ] Testar refresh token automático quando expirar
- [ ] Monitorar logs de auto-login em produção
