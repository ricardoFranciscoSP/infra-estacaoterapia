# 🔧 Socket Server - Redis Connection Timeout Fix

## 📋 Problema Identificado

O Socket Server estava recebendo timeouts ao tentar conectar no Redis, mesmo com Redis disponível e funcionando corretamente.

### Logs do Erro:
```
⏳ Redis não disponível (tentativa 1/10), aguardando 2000ms... 
Falha ao aguardar conexão Redis: Timeout aguardando IORedis

❌ [IORedis] Erro ao conectar ou validar: Error: Timeout aguardando IORedis
```

### Comportamento Observado:
- ✅ Redis está rodando e pronto: `Ready to accept connections tcp`
- ✅ Às vezes o socket conseguia conectar em um container
- ❌ Outras vezes falhava com timeout repetidamente
- **Padrão**: Problema de timing/sincronização em Docker Swarm

---

## 🔍 Causa Raiz

Havia **2 problemas principais**:

### 1. **Host Redis Incorreto** ❌
```typescript
// ❌ ANTES (ERRADO)
const REDIS_HOST = process.env.REDIS_HOST || "estacao_redis_prd";
```

**Problema**: 
- Default hardcoded como `"estacao_redis_prd"` (não existe mais)
- Docker Swarm resolve `estacaoterapia_redis` (do docker-stack.yml)
- Timeout ao tentar resolver hostname inexistente

**Solução**: Usar alias de rede correto
```typescript
// ✅ DEPOIS (CORRETO)
const REDIS_HOST = process.env.REDIS_HOST || "redis";
```

### 2. **Timeout Muito Curto para Docker Swarm** ⏱️
```typescript
// ❌ ANTES: Apenas 15 segundos
client = await waitForIORedisReady(15000);

// ✅ DEPOIS: 60 segundos
client = await waitForIORedisReady(60000);
```

**Problema**:
- DNS em Docker Swarm pode levar > 15s para resolver `estacaoterapia_redis`
- Timeout de 15s é insuficiente em cargas altas ou latência alta
- Retry apenas 10 vezes com delay 2s = máximo 20s total

**Solução**:
- Aumentado timeout para 60s
- Aumentado retries para 15 (agora 15 × 3s = 45s)
- Delay entre tentativas aumentado de 2s para 3s

---

## 📝 Alterações Realizadas

### Arquivo 1: `api/src/socket/server.ts`

**Linha 13-16**: Default host do Redis
```diff
- const REDIS_HOST = process.env.REDIS_HOST || "estacao_redis_prd";
+ const REDIS_HOST = process.env.REDIS_HOST || "estacaoterapia_redis";
```

**Linhas 144-159**: Função `waitForRedis()`
```diff
- async function waitForRedis(host: string, port: number, retries = 10, delay = 2000)
+ async function waitForRedis(host: string, port: number, retries = 15, delay = 3000)
...
- client = await waitForIORedisReady(15000); // Timeout de 15s
+ client = await waitForIORedisReady(60000);  // Timeout aumentado para 60s
...
- console.log(`⏳ Redis não disponível (tentativa ${i + 1}/${retries}), aguardando ${delay}ms...`, errorMsg);
+ console.log(`⏳ Aguardando conexão Redis estar pronta (status: ${client.status})...`);
```

### Arquivo 2: `api/src/config/redis.config.ts`

**Linhas 53-62**: Default host
```diff
- host: process.env.REDIS_HOST || "redis",
+ host: process.env.REDIS_HOST || "estacaoterapia_redis",
```

**Linhas 540-549**: Default timeout
```diff
- export const waitForIORedisReady = async (timeoutMs = 30000): Promise<IORedis> => {
+ export const waitForIORedisReady = async (timeoutMs = 60000): Promise<IORedis> => {
```

---

## 🔐 Configuração de Rede (Docker Swarm)

### docker-stack.yml
```yaml
services:
  redis:
    networks:
      estacaoterapia_backend:
        aliases:
          - redis                      # ⚠️  Alias pode falhar
          - estacaoterapia_redis       # ✅ Nome completo do serviço (USAR ESTE)
          - redis.estacaoterapia_backend # ✅ FQDN interno
```

### entrypoint.sh
```bash
REDIS_HOST="${REDIS_HOST:-estacaoterapia_redis}"  # Nome completo do serviço
```

### Prioridade de Resolução:
1. `process.env.REDIS_HOST` (do docker-stack.yml environment)
2. `"estacaoterapia_redis"` (nome do serviço - MAIS CONFIÁVEL)

**IMPORTANTE**: Em Docker Swarm, sempre use o nome completo do serviço (`estacaoterapia_redis`) 
ao invés de aliases (`redis`) para evitar problemas de resolução DNS.

---

## ✅ Resultado Esperado

Após essas alterações, o Socket Server deve:

```
✅ Redis acessível: redis:6379
✅ [IORedis] Conexão estabelecida e validada
✅ Redis client obtido e validado para Socket.io
🚀 Socket Server rodando na porta 3334
```

---

## 🧪 Teste Manual

```bash
# 1. Verificar conectividade Redis
docker exec estacao_socket-server ping estacaoterapia_redis -c 1

# 2. Testar resolução DNS
docker exec estacao_socket-server nslookup redis

# 3. Testar conexão Redis
docker exec estacao_socket-server redis-cli -h redis ping

# 4. Ver logs completos
docker service logs estacaoterapia_socket-server --tail 100 --follow
```

---

## 📚 Referências

- [IORedis Connection Options](https://github.com/redis/ioredis)
- [Docker Swarm Service Discovery](https://docs.docker.com/engine/swarm/networking/#use-swarm-mode-service-discovery)
- Arquivo anterior: `api/docs/FIX-SOCKET-REDIS-CONNECTION.md`

---

## 🚀 Deploy

```bash
# Fazer rebuild dos containers
cd api
bash deploy.sh

# Ou atualizar apenas o socket
docker service update --force estacaoterapia_socket-server
```

**Data**: 16 de janeiro de 2026
**Status**: ✅ Corrigido e documentado
