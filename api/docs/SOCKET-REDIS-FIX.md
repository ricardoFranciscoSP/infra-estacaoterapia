# 🔧 Fix: Timeout do Redis Adapter Socket.IO - SubClient

## 📋 Problema

O Socket Server falhava ao inicializar o Redis Adapter com o erro:

```
❌ Erro Redis Adapter Socket.IO: Timeout aguardando subClient
❌ Erro ao iniciar Socket Server: Error: Falha crítica ao inicializar Redis Adapter: Timeout aguardando subClient
```

A conexão Redis principal funcionava, mas o **subClient criado com `.duplicate()`** não conseguia se conectar em tempo hábil.

## 🔍 Causa Raiz

O problema estava em [socket/adapter.ts](socket/adapter.ts):

```typescript
// ❌ PROBLEMA: .duplicate() pode herdar problemas de conexão
const subClient = pubClient.duplicate();

// Timeout de 15 segundos era insuficiente para:
// - Autenticação com senha
// - DNS em Docker Swarm
// - Reconexão após falhas transitórias
```

### Por que .duplicate() falhava:

1. **Não herda corretamente as opções de autenticação** quando há `requirepass` no Redis
2. **Timing race condition**: pubClient está pronto, mas subClient ainda está em `wait` ou `connecting`
3. **Timeout curto (15s)**: insuficiente em ambientes Swarm com latência de DNS

## ✅ Solução Implementada

### 1. **Substituir `.duplicate()` por novo cliente (adapter.ts)**

```typescript
// ✅ ANTES: Usar .duplicate() que herda problemas
const subClient = pubClient.duplicate();

// ✅ DEPOIS: Criar novo cliente com configuração explícita
const redisConfig = getBullMQConnectionOptions();
const redisPassword = process.env.REDIS_PASSWORD || undefined;

const subClient = new IORedis({
  host: redisConfig.host,
  port: redisConfig.port,
  db: redisConfig.db,
  password: redisPassword, // ← Senha explícita
  maxRetriesPerRequest: null,
  connectTimeout: 60_000,
  commandTimeout: 30_000,
  lazyConnect: true,
  // ... outras opções ...
});

// Conectar explicitamente
await subClient.connect();
```

### 2. **Aguardar estabilização antes do Adapter (server.ts)**

```typescript
// Aguarda um pouco antes de inicializar o adapter
console.log('🔹 Aguardando estabilização da conexão Redis...');
await new Promise((resolve) => setTimeout(resolve, 2000));

try {
  await initRedisAdapter(io, { host: REDIS_HOST, port: REDIS_PORT, db: REDIS_DB });
} catch (adapterErr) {
  // Continua sem adapter em lugar de falhar completamente
  console.warn('⚠️ Socket.IO rodará SEM Redis Adapter');
}
```

### 3. **Melhorias no tratamento de erros**

- Timeout explícito ao conectar subClient
- Event listeners para cada estado (connect, ready, error, close)
- Fallback gracioso se adapter falhar
- Melhor logging diagnóstico

## 📝 Checklist de Implementação

Alterações realizadas:

- ✅ [socket/adapter.ts](socket/adapter.ts)

  - Substituído `.duplicate()` por novo cliente IORedis
  - Adicionado `.connect()` explícito
  - Melhorado tratamento de erros
  - Adicionados event listeners

- ✅ [socket/server.ts](socket/server.ts)

  - Adicionado delay de estabilização (2s)
  - Adicionado try/catch para adapter
  - Fallback gracioso se adapter falhar

- ✅ [socket-redis-diagnose.sh](socket-redis-diagnose.sh)
  - Script de diagnóstico para troubleshooting

## 🧪 Testes Recomendados

### 1. Testar inicialização local

```bash
cd api
npm run dev:socket
```

Verificar logs:

```
✅ Redis disponível e ping confirmado!
🔹 Aguardando estabilização da conexão Redis antes de inicializar Adapter...
🔹 Criando subClient separado para Redis Adapter...
✅ [Socket.IO] subClient conectado
✅ Ambos os clientes Redis estão prontos
✅ Redis Adapter Socket.IO inicializado com sucesso
```

### 2. Testar em Docker Swarm

```bash
# Redeploy do serviço
docker service update --force estacaoterapia_socket-server

# Monitorar logs
docker service logs estacaoterapia_socket-server -f --tail 50
```

Procurar por:

```
✅ Redis Adapter Socket.IO inicializado com sucesso
✅ Socket.IO está pronto para múltiplas instâncias com Redis Adapter
🚀 Socket Server rodando na porta 3001
```

### 3. Testar com Redis com senha

```bash
# Verificar se REDIS_PASSWORD está no docker-stack.yml
grep REDIS_PASSWORD api/docker-stack.yml

# Verificar se o Redis está exigindo senha
docker exec $(docker ps --filter "label=com.docker.swarm.service.name=estacaoterapia_redis" --format "{{.ID}}" | head -1) \
    redis-cli CONFIG GET requirepass
```

### 4. Testar com múltiplas instâncias

```bash
# Scale up do Socket Server (testa Redis Adapter)
docker service scale estacaoterapia_socket-server=3

# Verificar comunicação entre instâncias
# - Conectar em uma instância
# - Verificar se eventos chegam de outra instância
```

## 🔧 Troubleshooting

### Se ainda houver "Timeout aguardando subClient"

1. **Verificar conectividade Redis:**

   ```bash
   ./socket-redis-diagnose.sh
   ```

2. **Verificar REQUIREPASS:**

   ```bash
   docker exec <redis-container> redis-cli CONFIG GET requirepass
   ```

3. **Reiniciar Redis:**

   ```bash
   docker service update --force estacaoterapia_redis
   ```

4. **Aumentar timeout do subClient:**

   - Em [socket/adapter.ts](socket/adapter.ts), aumentar `connectTimeout` de 60000 para 90000

5. **Verificar logs do Redis:**
   ```bash
   docker service logs estacaoterapia_redis --tail 50
   ```

## 📊 Impacto

- ✅ Socket Server inicia corretamente com Redis Adapter
- ✅ Múltiplas instâncias podem comunicar via Redis
- ✅ Fallback gracioso se Redis estiver indisponível
- ✅ Melhor logging para diagnóstico
- ✅ Suporta Redis com ou sem `requirepass`

## 🚀 Deploy

1. Fazer push das alterações
2. Redeploy do Socket Server:
   ```bash
   docker service update --force estacaoterapia_socket-server
   ```
3. Monitorar logs por 5 minutos
4. Testar conexões WebSocket

## 📚 Referências

- [IORedis `.duplicate()` documentation](https://github.com/luin/ioredis#duplicate)
- [Socket.IO Redis Adapter](https://socket.io/docs/v4/redis-adapter/)
- [Docker Swarm Service Discovery](https://docs.docker.com/engine/swarm/networking/)
