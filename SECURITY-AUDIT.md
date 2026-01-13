# 🔒 Relatório de Auditoria de Segurança
## Estação Terapia - Backend e Frontend

**Data da Auditoria**: 2024  
**Versão**: 1.0  
**Severidade**: 🔴 Crítica | 🟠 Alta | 🟡 Média | 🟢 Baixa

---

## 📋 Sumário Executivo

Este relatório identifica **vulnerabilidades críticas e altas** que precisam ser corrigidas imediatamente, além de várias melhorias de segurança recomendadas.

### Estatísticas
- **🔴 Críticas**: 8
- **🟠 Altas**: 12
- **🟡 Médias**: 15
- **🟢 Baixas**: 8

---

## 🔴 VULNERABILIDADES CRÍTICAS

### 1. **Senhas Expostas em Logs** (CRÍTICA)
**Localização**: `api/src/services/auth.service.ts:1144-1175`

**Problema**:
```typescript
console.log('[LOGIN] Senha recebida (raw):', JSON.stringify(password));
console.log('[LOGIN] Tamanho da senha (raw):', password.length);
console.log('[LOGIN] Bytes da senha (raw):', Array.from(password).map(c => c.charCodeAt(0)));
console.log('[LOGIN] Hash no banco (original):', user.Password);
```

**Impacto**: Senhas e hashes são logados em texto claro, expondo credenciais em logs.

**Correção**:
```typescript
// REMOVER todos os logs de senha
// Se necessário para debug, usar apenas flags booleanas:
console.log('[LOGIN] Senha recebida: [REDACTED]');
console.log('[LOGIN] Hash válido:', !!user.Password && user.Password.length === 60);
```

---

### 2. **Credenciais Hardcoded em docker-stack.yml** (CRÍTICA)
**Localização**: `api/docker-stack.yml:39-40`, `docker-compose.yml`

**Problema**:
```yaml
REDIS_PASSWORD: REdnRHkZLnQpK1rcoKsseO3pX4GNIRR
REDIS_URL: 'redis://:REdnRHkZLnQpK1rcoKsseO3pX4GNIRR@redis:6379/1'
```

**Impacto**: Senhas expostas em arquivos versionados no Git.

**Correção**:
- Usar Docker Secrets ou variáveis de ambiente externas
- Remover credenciais de arquivos versionados
- Adicionar ao `.gitignore`

---

### 3. **CORS Permissivo - Permite Conexões Sem Origin** (CRÍTICA)
**Localização**: `api/src/socket/server.ts:60`, `api/src/middlewares/cors.ts`

**Problema**:
```typescript
// Permite conexões sem origem (para testes locais) ou origens permitidas
if (!origin || ALLOWED_ORIGINS.includes(normalizedOrigin || "")) {
    callback(null, true);
}
```

**Impacto**: Permite conexões de qualquer origem quando `origin` é `null`, vulnerável a CSRF.

**Correção**:
```typescript
// Em produção, NUNCA permitir sem origin
if (NODE_ENV === 'production') {
    if (!origin) {
        return callback(new Error("Origin é obrigatório em produção"));
    }
}
if (origin && ALLOWED_ORIGINS.includes(normalizedOrigin)) {
    callback(null, true);
} else {
    callback(new Error("Origem não permitida"));
}
```

---

### 4. **CORS Header com Wildcard em Produção** (CRÍTICA)
**Localização**: `api/src/socket/server.ts:93`

**Problema**:
```typescript
headers["Access-Control-Allow-Origin"] = origin || "*";
```

**Impacto**: Quando `origin` é `null`, retorna `"*"`, permitindo qualquer origem.

**Correção**:
```typescript
if (origin && ALLOWED_ORIGINS.includes(normalizedOrigin)) {
    headers["Access-Control-Allow-Origin"] = origin;
} else {
    // Não definir header se origin não for permitida
    return;
}
```

---

### 5. **Falta de Rate Limiting no Backend** (CRÍTICA)
**Localização**: `api/src/server.ts` - Nenhum middleware de rate limiting encontrado

**Problema**: Não há proteção contra brute force, DDoS ou abuso de API.

**Impacto**: Vulnerável a ataques de força bruta em login, DDoS, e abuso de recursos.

**Correção**:
```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

// Rate limit geral
const generalLimiter = rateLimit({
    store: new RedisStore({
        client: redisClient,
    }),
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // 100 requisições por IP
    message: 'Muitas requisições deste IP, tente novamente mais tarde.'
});

// Rate limit para login (mais restritivo)
const loginLimiter = rateLimit({
    store: new RedisStore({
        client: redisClient,
    }),
    windowMs: 15 * 60 * 1000,
    max: 5, // 5 tentativas de login por IP
    skipSuccessfulRequests: true,
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
});

app.use('/api/auth/login', loginLimiter);
app.use('/api/', generalLimiter);
```

---

### 6. **Falta de Helmet.js para Security Headers** (CRÍTICA)
**Localização**: `api/src/server.ts` - Não implementado

**Problema**: Falta de headers de segurança padrão (XSS Protection, CSP, etc.)

**Impacto**: Vulnerável a XSS, clickjacking, e outros ataques.

**Correção**:
```typescript
import helmet from 'helmet';

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));
```

---

### 7. **SQL Injection Potencial** (CRÍTICA)
**Localização**: `api/src/services/auth.service.ts:1866`

**Problema**:
```typescript
WHERE "Email" ILIKE ${'%' + searchIdentifier.split('@')[0] + '%'}
```

**Impacto**: Embora use template string do Prisma, a concatenação pode ser perigosa se `searchIdentifier` não for validado.

**Correção**:
```typescript
// Validar e sanitizar input
const sanitizedSearch = searchIdentifier.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
WHERE "Email" ILIKE ${'%' + sanitizedSearch + '%'}
// Ou melhor ainda, usar contains do Prisma:
WHERE { Email: { contains: sanitizedSearch, mode: 'insensitive' } }
```

---

### 8. **Redis Password Exposta em Logs** (CRÍTICA)
**Localização**: `api/src/config/redis.config.ts:295`, `api/entrypoint.sh:65`

**Problema**: Logs mostram informações sobre senhas (mesmo que parcialmente).

**Impacto**: Informações sobre autenticação expostas em logs.

**Correção**: Remover logs que mencionam senhas ou usar apenas flags booleanas.

---

## 🟠 VULNERABILIDADES ALTAS

### 9. **Falta de Validação de Input** (ALTA)
**Localização**: Múltiplos controllers e services

**Problema**: Não há validação consistente de inputs usando bibliotecas como `zod` ou `joi`.

**Correção**: Implementar validação de schema em todas as rotas:
```typescript
import { z } from 'zod';

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8).max(100)
});

// Em controllers
const validated = loginSchema.parse(req.body);
```

---

### 10. **Falta de CSRF Protection** (ALTA)
**Localização**: Não implementado

**Problema**: Não há proteção CSRF para requisições state-changing.

**Correção**:
```typescript
import csrf from 'csurf';

const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);

// Em rotas que modificam estado
app.post('/api/update', csrfProtection, handler);
```

---

### 11. **JWT Sem Verificação de Expiração Adequada** (ALTA)
**Localização**: `api/src/utils/verifyToken.ts` (verificar implementação)

**Problema**: Precisa verificar se tokens são validados corretamente e se expiração é checada.

**Correção**: Garantir que:
- Tokens expirados são rejeitados
- Refresh tokens são implementados
- Tokens são invalidados no logout

---

### 12. **Falta de Sanitização de Uploads** (ALTA)
**Localização**: `api/src/routes/files.routes.ts`

**Problema**: Uploads de arquivos podem não estar validados adequadamente.

**Correção**:
```typescript
import fileType from 'file-type';
import { extname } from 'path';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Validar tipo real do arquivo (não confiar na extensão)
const fileInfo = await fileType.fromBuffer(buffer);
if (!fileInfo || !ALLOWED_MIME_TYPES.includes(fileInfo.mime)) {
    throw new Error('Tipo de arquivo não permitido');
}
```

---

### 13. **CORS Permite Múltiplas Origens de Staging em Produção** (ALTA)
**Localização**: `api/src/middlewares/cors.ts:64-68`

**Problema**: Produção permite acesso de pré-produção.

**Correção**: Remover origens de staging em produção:
```typescript
if (NODE_ENV === "production") {
    // NÃO incluir pre.estacaoterapia.com.br em produção
    return CORS_ORIGINS.production;
}
```

---

### 14. **Falta de Logging de Segurança** (ALTA)
**Localização**: Não implementado

**Problema**: Não há logging de tentativas de login falhadas, acessos não autorizados, etc.

**Correção**: Implementar logging de segurança:
```typescript
import winston from 'winston';

const securityLogger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'security.log' })
    ]
});

// Log tentativas de login
securityLogger.warn('Failed login attempt', {
    ip: req.ip,
    email: req.body.email,
    timestamp: new Date()
});
```

---

### 15. **WebSocket Sem Autenticação Adequada** (ALTA)
**Localização**: `api/src/socket/server.ts`

**Problema**: Precisa verificar se WebSocket valida tokens adequadamente.

**Correção**: Garantir autenticação em todas as conexões:
```typescript
io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Token não fornecido'));
    }
    try {
        const decoded = await verifyToken(token);
        socket.data.user = decoded;
        next();
    } catch (err) {
        next(new Error('Token inválido'));
    }
});
```

---

### 16. **Falta de HTTPS Enforcement** (ALTA)
**Localização**: Backend não força HTTPS

**Problema**: Aplicação pode aceitar conexões HTTP em produção.

**Correção**: Forçar HTTPS:
```typescript
if (NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.header('x-forwarded-proto') !== 'https') {
            res.redirect(`https://${req.header('host')}${req.url}`);
        } else {
            next();
        }
    });
}
```

---

### 17. **Variáveis de Ambiente Expostas no Frontend** (ALTA)
**Localização**: `estacao/src` - Variáveis `NEXT_PUBLIC_*`

**Problema**: Chaves públicas da Vindi expostas no bundle do frontend.

**Impacto**: Embora sejam chaves públicas, devem ser rotacionadas se comprometidas.

**Correção**: 
- Documentar que são chaves públicas
- Implementar rotação de chaves
- Não expor chaves privadas

---

### 18. **Falta de Content Security Policy no Frontend** (ALTA)
**Localização**: `estacao/next.config.ts`

**Problema**: CSP não configurado adequadamente.

**Correção**: Adicionar CSP no Next.js:
```typescript
const securityHeaders = [
    {
        key: 'Content-Security-Policy',
        value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
    }
];
```

---

### 19. **Docker Secrets Não Usados** (ALTA)
**Localização**: `docker-compose.yml` - Credenciais em texto claro

**Problema**: Credenciais hardcoded ao invés de usar Docker Secrets.

**Correção**: Migrar para Docker Secrets conforme `docker-compose.production.yml`.

---

### 20. **Falta de Validação de Tamanho de Request Body** (ALTA)
**Localização**: `api/src/server.ts`

**Problema**: Não há limite de tamanho de body, vulnerável a DoS.

**Correção**:
```typescript
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
```

---

## 🟡 VULNERABILIDADES MÉDIAS

### 21. **Logs Excessivos em Produção** (MÉDIA)
**Localização**: Múltiplos arquivos

**Problema**: Muitos `console.log` em produção expõem informações desnecessárias.

**Correção**: Usar biblioteca de logging com níveis:
```typescript
import winston from 'winston';

const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
    // ...
});
```

---

### 22. **Falta de Rotação de Logs** (MÉDIA)
**Localização**: Logs não rotacionados

**Problema**: Logs podem crescer indefinidamente.

**Correção**: Implementar rotação de logs.

---

### 23. **CORS Headers Inconsistentes** (MÉDIA)
**Localização**: `api/src/socket/server.ts` vs `api/src/middlewares/cors.ts`

**Problema**: Configurações de CORS diferentes em diferentes lugares.

**Correção**: Centralizar configuração de CORS.

---

### 24. **Falta de Timeout em Requisições** (MÉDIA)
**Localização**: Não implementado

**Problema**: Requisições podem travar indefinidamente.

**Correção**: Implementar timeouts:
```typescript
app.use((req, res, next) => {
    req.setTimeout(30000); // 30 segundos
    res.setTimeout(30000);
    next();
});
```

---

### 25. **Falta de Validação de Content-Type** (MÉDIA)
**Localização**: `api/src/server.ts`

**Problema**: Aceita qualquer Content-Type.

**Correção**: Validar Content-Type em rotas sensíveis.

---

### 26. **Falta de Rate Limiting por Usuário** (MÉDIA)
**Localização**: Não implementado

**Problema**: Rate limiting apenas por IP, não por usuário autenticado.

**Correção**: Implementar rate limiting por userId também.

---

### 27. **Falta de Monitoramento de Anomalias** (MÉDIA)
**Localização**: Não implementado

**Problema**: Não há detecção de comportamento anômalo.

**Correção**: Implementar monitoramento de padrões suspeitos.

---

### 28. **Falta de Validação de Email** (MÉDIA)
**Localização**: Múltiplos lugares

**Problema**: Emails podem não estar sendo validados adequadamente.

**Correção**: Usar biblioteca de validação de email.

---

### 29. **Falta de Proteção contra Enumeration** (MÉDIA)
**Localização**: `api/src/services/auth.service.ts`

**Problema**: Respostas diferentes para "usuário não existe" vs "senha incorreta" permitem enumeração.

**Correção**: Sempre retornar mesma mensagem genérica.

---

### 30. **Falta de Honeypot Fields** (MÉDIA)
**Localização**: Formulários

**Problema**: Não há proteção contra bots em formulários.

**Correção**: Adicionar campos honeypot.

---

### 31. **Falta de Validação de Referer** (MÉDIA)
**Localização**: Não implementado

**Problema**: Não valida origem das requisições.

**Correção**: Validar Referer header em operações sensíveis.

---

### 32. **Falta de Session Fixation Protection** (MÉDIA)
**Localização**: Sistema de autenticação

**Problema**: Sessões podem ser fixadas.

**Correção**: Regenerar session ID após login.

---

### 33. **Falta de Account Lockout** (MÉDIA)
**Localização**: `api/src/services/auth.service.ts`

**Problema**: Não há bloqueio de conta após múltiplas tentativas.

**Correção**: Implementar account lockout após N tentativas falhadas.

---

### 34. **Falta de Password Strength Requirements** (MÉDIA)
**Localização**: Registro/reset de senha

**Problema**: Senhas podem ser fracas.

**Correção**: Validar força da senha (mínimo 8 caracteres, maiúsculas, números, etc.).

---

### 35. **Falta de 2FA** (MÉDIA)
**Localização**: Sistema de autenticação

**Problema**: Não há autenticação de dois fatores.

**Correção**: Implementar 2FA opcional para contas sensíveis.

---

## 🟢 MELHORIAS DE SEGURANÇA (BAIXA PRIORIDADE)

### 36. **Falta de Security.txt** (BAIXA)
Criar arquivo `/security.txt` com informações de contato para reportar vulnerabilidades.

### 37. **Falta de Subresource Integrity** (BAIXA)
Adicionar SRI para recursos externos carregados.

### 38. **Falta de Certificate Pinning** (BAIXA)
Considerar certificate pinning para APIs críticas.

### 39. **Falta de Security Headers Adicionais** (BAIXA)
Adicionar headers como `X-DNS-Prefetch-Control`, `X-Download-Options`.

### 40. **Falta de Regular Security Audits** (BAIXA)
Implementar auditorias regulares de segurança.

### 41. **Falta de Dependency Scanning** (BAIXA)
Usar ferramentas como `npm audit`, `snyk` regularmente.

### 42. **Falta de Penetration Testing** (BAIXA)
Realizar testes de penetração periódicos.

### 43. **Falta de Incident Response Plan** (BAIXA)
Criar plano de resposta a incidentes.

---

## 📝 PLANO DE AÇÃO RECOMENDADO

### Fase 1 - Crítico (Imediato)
1. ✅ Remover logs de senhas
2. ✅ Migrar credenciais para Docker Secrets
3. ✅ Corrigir CORS para não permitir wildcard
4. ✅ Implementar rate limiting
5. ✅ Implementar Helmet.js
6. ✅ Validar e sanitizar inputs SQL

### Fase 2 - Alta (1 semana)
7. ✅ Implementar validação de input (Zod)
8. ✅ Adicionar CSRF protection
9. ✅ Validar uploads de arquivos
10. ✅ Implementar logging de segurança
11. ✅ Forçar HTTPS
12. ✅ Validar autenticação WebSocket

### Fase 3 - Média (1 mês)
13. ✅ Centralizar configuração CORS
14. ✅ Implementar timeouts
15. ✅ Adicionar account lockout
16. ✅ Melhorar validação de senhas
17. ✅ Implementar monitoramento

---

## 🔧 FERRAMENTAS RECOMENDADAS

- **Rate Limiting**: `express-rate-limit` + `rate-limit-redis`
- **Security Headers**: `helmet`
- **Input Validation**: `zod` ou `joi`
- **CSRF**: `csurf`
- **Logging**: `winston`
- **Dependency Scanning**: `npm audit`, `snyk`
- **Security Testing**: `OWASP ZAP`, `Burp Suite`

---

## 📚 REFERÊNCIAS

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [CORS Security](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

---

**Próximos Passos**: Implementar correções da Fase 1 imediatamente, seguido pelas fases 2 e 3.
