# 🔧 Correções de Segurança - Guia de Implementação

Este documento contém as correções prioritárias para as vulnerabilidades identificadas.

## 📦 Dependências Necessárias

Adicione ao `package.json`:

```json
{
  "dependencies": {
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "rate-limit-redis": "^5.0.0",
    "zod": "^3.22.4",
    "csurf": "^1.11.0"
  }
}
```

Execute: `npm install helmet express-rate-limit rate-limit-redis zod csurf`

---

## 1. 🔴 Remover Logs de Senhas

**Arquivo**: `api/src/services/auth.service.ts`

**Substituir linhas 1143-1174**:

```typescript
// ❌ REMOVER ESTES LOGS:
// console.log('[LOGIN] Senha recebida (raw):', JSON.stringify(password));
// console.log('[LOGIN] Tamanho da senha (raw):', password.length);
// console.log('[LOGIN] Bytes da senha (raw):', Array.from(password).map(c => c.charCodeAt(0)));
// console.log('[LOGIN] Senha que será usada para comparação (sem modificação):', JSON.stringify(passwordToCompare));
// console.log('[LOGIN] Tamanho da senha:', passwordToCompare.length);
// console.log('[LOGIN] Bytes da senha:', Array.from(passwordToCompare).map(c => c.charCodeAt(0)));
// console.log('[LOGIN] Hash no banco (original):', user.Password);
// console.log('[LOGIN] Hash no banco (limpo):', cleanHash);
// console.log('[LOGIN] Tamanho do hash no banco:', cleanHash.length);
// console.log('[LOGIN] Hash no banco começa com:', cleanHash.substring(0, 10));
// console.log('[LOGIN] Hash no banco termina com:', cleanHash.substring(cleanHash.length - 5));

// ✅ SUBSTITUIR POR:
// Logs seguros (apenas flags booleanas)
if (process.env.NODE_ENV !== 'production') {
    console.log('[LOGIN] Tentativa de login para:', user.Email);
    console.log('[LOGIN] Hash válido:', !!user.Password && user.Password.length === 60);
}
```

**Também remover logs de hash nas linhas 1159-1161**:

```typescript
// ❌ REMOVER:
// console.error('[LOGIN] Hash no banco:', user.Password);

// ✅ SUBSTITUIR POR:
console.error('[LOGIN] ERRO: Hash no banco está incompleto ou inválido!');
console.error('[LOGIN] Tamanho do hash:', user.Password?.length, 'Esperado: 60');
// NÃO logar o hash em si
```

---

## 2. 🔴 Corrigir CORS - Remover Wildcard

**Arquivo**: `api/src/socket/server.ts`

**Substituir linhas 59-67**:

```typescript
// ❌ REMOVER:
// if (!origin || ALLOWED_ORIGINS.includes(normalizedOrigin || "")) {
//     console.log(`✅ Origem permitida: ${origin || "local"}`);
//     callback(null, true);
// }

// ✅ SUBSTITUIR POR:
const NODE_ENV = process.env.NODE_ENV || 'development';

// Em produção, origin é obrigatório
if (NODE_ENV === 'production' && !origin) {
    console.log(`❌ Conexão bloqueada: origin ausente em produção`);
    return callback(new Error("Origin é obrigatório em produção"));
}

// Permite sem origin apenas em desenvolvimento
if (!origin && NODE_ENV !== 'production') {
    console.log(`✅ Origem permitida (dev): local`);
    return callback(null, true);
}

// Valida origin permitida
if (origin && ALLOWED_ORIGINS.includes(normalizedOrigin)) {
    console.log(`✅ Origem permitida: ${origin}`);
    callback(null, true);
} else {
    console.log(`❌ Origem bloqueada: ${origin}`);
    callback(new Error("Origem não permitida pelo CORS"));
}
```

**Substituir linhas 92-93**:

```typescript
// ❌ REMOVER:
// headers["Access-Control-Allow-Origin"] = origin || "*";

// ✅ SUBSTITUIR POR:
if (origin && ALLOWED_ORIGINS.includes(normalizedOrigin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
} else {
    // Não definir header se origin não for permitida
    return;
}
```

---

## 3. 🔴 Adicionar Helmet.js

**Arquivo**: `api/src/server.ts`

**Adicionar após imports**:

```typescript
import helmet from 'helmet';

// Adicionar após app.use(corsMiddleware)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    noSniff: true,
    xssFilter: true,
    frameguard: {
        action: 'deny'
    },
    referrerPolicy: {
        policy: "strict-origin-when-cross-origin"
    }
}));
```

---

## 4. 🔴 Implementar Rate Limiting

**Arquivo**: `api/src/server.ts`

**Adicionar após imports**:

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { getRedisClient } from './config/redis.config';

// Rate limit geral (100 req/15min por IP)
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // 100 requisições
    message: 'Muitas requisições deste IP, tente novamente mais tarde.',
    standardHeaders: true,
    legacyHeaders: false,
    // Em produção, usar Redis store
    store: process.env.NODE_ENV === 'production' ? 
        new RedisStore({
            sendCommand: async (...args: string[]) => {
                const client = await getRedisClient();
                return client.sendCommand(args);
            }
        }) : undefined
});

// Rate limit para login (5 tentativas/15min por IP)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // 5 tentativas de login
    skipSuccessfulRequests: true,
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    standardHeaders: true,
    legacyHeaders: false,
    store: process.env.NODE_ENV === 'production' ? 
        new RedisStore({
            sendCommand: async (...args: string[]) => {
                const client = await getRedisClient();
                return client.sendCommand(args);
            }
        }) : undefined
});

// Aplicar rate limiting
app.use('/api/', generalLimiter);
```

**Arquivo**: `api/src/routes/auth.routes.ts` (ou onde está a rota de login)

**Adicionar antes da rota de login**:

```typescript
import { loginLimiter } from '../middlewares/rateLimit'; // ou importar do server.ts

router.post('/login', loginLimiter, authController.login);
```

---

## 5. 🔴 Limitar Tamanho de Request Body

**Arquivo**: `api/src/server.ts`

**Substituir linhas 35-38**:

```typescript
// ❌ REMOVER:
// express.json()(req, res, err => {
//     if (err) return next(err);
//     express.urlencoded({ extended: true })(req, res, next);
// });

// ✅ SUBSTITUIR POR:
express.json({ limit: '10mb' })(req, res, err => {
    if (err) return next(err);
    express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
});
```

---

## 6. 🟠 Corrigir CORS no Middleware Principal

**Arquivo**: `api/src/middlewares/cors.ts`

**Substituir linhas 64-68**:

```typescript
// ❌ REMOVER:
// // Em produção, também permite pré-produção acessar (para casos de fallback)
// if (NODE_ENV === "production") {
//     if (!origins.includes("https://pre.estacaoterapia.com.br")) {
//         origins.push("https://pre.estacaoterapia.com.br");
//     }
// }

// ✅ SUBSTITUIR POR:
// Em produção, NÃO permitir pré-produção
// Remover completamente este bloco
```

**Substituir linhas 104-117**:

```typescript
// ❌ REMOVER:
// if (origin && allowedOrigins.includes(origin)) {
//     res.setHeader("Access-Control-Allow-Origin", origin);
//     res.setHeader("Access-Control-Allow-Credentials", "true");
// } else if (origin) {
//     // Log para debug quando origin não é permitida
// }

// ✅ SUBSTITUIR POR:
if (NODE_ENV === 'production' && !origin) {
    // Em produção, origin é obrigatório
    return res.status(403).json({ error: 'Origin é obrigatório' });
}

if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
} else if (origin) {
    // Origin não permitida
    if (NODE_ENV !== 'production') {
        console.log(`[CORS] ❌ Origin bloqueada: ${origin}`);
    }
    // Não definir headers CORS
}
```

---

## 7. 🟠 Implementar Validação de Input

**Criar arquivo**: `api/src/middlewares/validation.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export const validate = (schema: z.ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            schema.parse(req.body);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({
                    error: 'Validação falhou',
                    details: error.errors
                });
            }
            next(error);
        }
    };
};
```

**Exemplo de uso em rotas**:

```typescript
import { z } from 'zod';
import { validate } from '../middlewares/validation';

const loginSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres')
});

router.post('/login', validate(loginSchema), authController.login);
```

---

## 8. 🟠 Sanitizar Input SQL

**Arquivo**: `api/src/services/auth.service.ts`

**Linha 1866 - Substituir**:

```typescript
// ❌ REMOVER:
// WHERE "Email" ILIKE ${'%' + searchIdentifier.split('@')[0] + '%'}

// ✅ SUBSTITUIR POR:
// Sanitizar input
const emailPart = searchIdentifier.split('@')[0];
// Remover caracteres perigosos
const sanitizedSearch = emailPart.replace(/[^a-zA-Z0-9]/g, '');

// Usar Prisma contains (mais seguro)
WHERE {
    Email: {
        contains: sanitizedSearch,
        mode: 'insensitive'
    }
}
```

---

## 9. 🟠 Remover Credenciais do docker-stack.yml

**Arquivo**: `api/docker-stack.yml`

**Substituir linhas 39-40**:

```yaml
# ❌ REMOVER:
# REDIS_PASSWORD: REdnRHkZLnQpK1rcoKsseO3pX4GNIRR
# REDIS_URL: 'redis://:REdnRHkZLnQpK1rcoKsseO3pX4GNIRR@redis:6379/1'

# ✅ SUBSTITUIR POR:
# Credenciais devem vir de secrets ou variáveis de ambiente externas
# Não definir aqui
```

**Usar secrets do Docker**:

```yaml
secrets:
  - source: redis_password
    target: redis_password
  - source: redis_url
    target: redis_url

environment:
  REDIS_PASSWORD_FILE: /run/secrets/redis_password
  REDIS_URL_FILE: /run/secrets/redis_url
```

---

## 10. 🟠 Adicionar Logging de Segurança

**Criar arquivo**: `api/src/utils/securityLogger.ts`

```typescript
import winston from 'winston';

const securityLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ 
            filename: 'logs/security.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        })
    ]
});

export const logSecurityEvent = (
    event: string,
    details: Record<string, any>
) => {
    securityLogger.warn(event, {
        ...details,
        timestamp: new Date().toISOString()
    });
};

// Exemplos de uso:
// logSecurityEvent('Failed login attempt', { ip: req.ip, email: req.body.email });
// logSecurityEvent('Unauthorized access attempt', { ip: req.ip, path: req.path });
// logSecurityEvent('Rate limit exceeded', { ip: req.ip, path: req.path });
```

---

## 11. 🟡 Remover Logs Excessivos em Produção

**Criar arquivo**: `api/src/utils/logger.ts`

```typescript
import winston from 'winston';

const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.simple()
        }),
        new winston.transports.File({ 
            filename: 'logs/error.log',
            level: 'error'
        }),
        new winston.transports.File({ 
            filename: 'logs/combined.log'
        })
    ]
});

export default logger;

// Substituir console.log por logger
// logger.debug('Debug message');
// logger.info('Info message');
// logger.warn('Warning message');
// logger.error('Error message');
```

---

## 📋 Checklist de Implementação

- [ ] Instalar dependências: `helmet`, `express-rate-limit`, `rate-limit-redis`, `zod`, `csurf`
- [ ] Remover logs de senhas do `auth.service.ts`
- [ ] Corrigir CORS no `socket/server.ts`
- [ ] Corrigir CORS no `middlewares/cors.ts`
- [ ] Adicionar Helmet.js no `server.ts`
- [ ] Implementar rate limiting
- [ ] Limitar tamanho de request body
- [ ] Implementar validação de input
- [ ] Sanitizar input SQL
- [ ] Remover credenciais do `docker-stack.yml`
- [ ] Implementar logging de segurança
- [ ] Substituir console.log por logger

---

## ⚠️ IMPORTANTE

1. **Teste todas as mudanças** em ambiente de desenvolvimento antes de produção
2. **Faça backup** do código atual antes de aplicar mudanças
3. **Aplique mudanças gradualmente** - não todas de uma vez
4. **Monitore logs** após implementação para garantir que tudo funciona
5. **Atualize documentação** conforme necessário

---

## 🔄 Próximos Passos

Após implementar estas correções críticas, consulte `SECURITY-AUDIT.md` para as correções de prioridade média e baixa.
