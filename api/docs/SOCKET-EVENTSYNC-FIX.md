# 🔧 Fix: EventSync Redis Memory Leaks e Timeout

## 📋 Problema Identificado

### Sintomas

```
❌ [EventSync] Erro ao subscribir ao canal: Timeout aguardando subClient conectar (status: wait)
⚠️ MaxListenersExceededWarning: Possible EventEmitter memory leak detected
   11 error listeners added to [Commander]. MaxListeners is 10.
```

### Causa Raiz

1. **`.duplicate()` não funciona corretamente**

   - Usar `.duplicate()` no Redis client estava causando problemas de autenticação/conexão
   - O subClient criado via `.duplicate()` ficava preso no status `wait`

2. **Memory Leak de Event Listeners**

   - Múltiplos canais chamando `waitForSubClientReady()` **simultaneamente**
   - Cada chamada adicionava novos listeners `error`, `ready`, `close`, `reconnecting`
   - Com 10+ canais, ultrapassava o limite padrão de 10 listeners

3. **Listeners Duplicados**
   - Handlers sendo adicionados com `.on()` ao invés de `.once()`
   - Listeners de erro/reconexão sendo adicionados múltiplas vezes

---

## ✅ Solução Implementada

### 1. **Criar subClient Diretamente (Não Usar `.duplicate()`)**

❌ **ANTES:**

```typescript
this.subClient = this.pubClient.duplicate();
```

✅ **DEPOIS:**

```typescript
const redisConfig = getBullMQConnectionOptions();
const redisPassword = process.env.REDIS_PASSWORD || undefined;

this.subClient = new IORedis({
  host: redisConfig.host,
  port: redisConfig.port,
  db: redisConfig.db,
  password: redisPassword,
  maxRetriesPerRequest: null,
  connectTimeout: 30_000,
  commandTimeout: 15_000,
  lazyConnect: false, // Conecta imediatamente
  keepAlive: 30000,
  enableOfflineQueue: true,
  enableReadyCheck: true,
  autoResubscribe: true,
  connectionName: 'estacao-eventsync-sub',
  showFriendlyErrorStack: true,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});
```

**Por quê?**

- Cria um novo cliente com credenciais explícitas
- Evita herdar problemas de conexão/auth do client original
- Conecta imediatamente (`lazyConnect: false`)

---

### 2. **Aumentar Limite de Listeners**

```typescript
// EventSync tem ~10 canais, cada um adiciona listeners
this.subClient.setMaxListeners(20);
this.pubClient.setMaxListeners(20);
```

**Por quê?**

- Cada canal adiciona listeners ao client Redis
- Limite padrão (10) era excedido com múltiplos canais
- Agora suporta até 20 canais sem warnings

---

### 3. **Reutilizar Promise de Espera**

❌ **ANTES:**

```typescript
private async waitForSubClientReady() {
    // Cada canal cria nova promise e novos listeners
    return new Promise((resolve, reject) => {
        this.subClient.once('ready', onReady);
        this.subClient.once('error', onError);
        // ...
    });
}
```

✅ **DEPOIS:**

```typescript
private waitingForReadyPromise: Promise<void> | null = null;

private async waitForSubClientReady(timeoutMs = 15000): Promise<void> {
    // Se já existe uma promise aguardando, reutiliza ela
    if (this.waitingForReadyPromise) {
        return this.waitingForReadyPromise;
    }

    // Se já está pronto, retorna imediatamente
    if (this.subClient.status === 'ready' || this.subClient.status === 'connect') {
        return;
    }

    // Cria UMA promise compartilhada
    this.waitingForReadyPromise = new Promise<void>((resolve, reject) => {
        // ... setup listeners com cleanup
    });

    try {
        await this.waitingForReadyPromise;
    } finally {
        this.waitingForReadyPromise = null;
    }
}
```

**Por quê?**

- 10 canais chamando simultaneamente = 10 promises + 30+ listeners
- Agora: 1 promise compartilhada = apenas 3 listeners
- Limpa listeners após completar (`.off()`)

---

### 4. **Cleanup de Listeners**

```typescript
const cleanup = () => {
  clearTimeout(timeout);
  if (this.subClient) {
    this.subClient.off('ready', onReady);
    this.subClient.off('error', onError);
    this.subClient.off('close', onClose);
  }
};

const onReady = () => {
  cleanup(); // Remove listeners antes de resolver
  resolve();
};
```

**Por quê?**

- Listeners temporários devem ser removidos após uso
- Evita acumular listeners a cada tentativa de conexão

---

### 5. **Consolidar Handlers de Evento**

❌ **ANTES:**

```typescript
this.subClient.once('error', handler1);
this.subClient.on('error', handler2); // Duplicado!
this.subClient.once('ready', handler3);
this.subClient.on('ready', handler4); // Duplicado!
```

✅ **DEPOIS:**

```typescript
// Um único handler persistente por evento
this.subClient.on('error', handler);
this.subClient.on('ready', handler);
this.subClient.on('connect', handler);
this.subClient.on('close', handler);
this.subClient.on('reconnecting', handler);
```

**Por quê?**

- Evita handlers duplicados que causam memory leaks
- Handlers persistentes para eventos recorrentes (error, reconnecting)

---

## 🎯 Resultado Esperado

### Antes (Falha)

```
🔹 Criando subClient separado para Redis Adapter...
🔹 Conectando subClient...
❌ [EventSync] Erro ao subscribir: Timeout aguardando subClient (status: wait)
⚠️ MaxListenersExceededWarning: 11 error listeners
⚠️ MaxListenersExceededWarning: 11 ready listeners
```

### Depois (Sucesso)

```
🔹 Criando subClient separado para Redis Adapter...
🔹 Conectando subClient...
✅ [EventSync] subClient pronto
✅ [EventSync] subClient conectado
✅ [EventSync] Subscribed ao canal 'consultation:events'
✅ [EventSync] Subscribed ao canal 'notification:created'
✅ Event Sync inicializado com sucesso
🚀 Socket Server rodando
```

---

## 📊 Comparação de Recursos

| Aspecto                 | Antes             | Depois             |
| ----------------------- | ----------------- | ------------------ |
| **Criação subClient**   | `.duplicate()` ❌ | `new IORedis()` ✅ |
| **Max Listeners**       | 10 (padrão) ⚠️    | 20 ✅              |
| **Promises de espera**  | N promises ⚠️     | 1 compartilhada ✅ |
| **Cleanup listeners**   | ❌                | ✅ `.off()`        |
| **Handlers duplicados** | ❌                | ✅ Consolidados    |

---

## 🔍 Verificação

Para confirmar que o fix funcionou:

1. ✅ Não há mais `MaxListenersExceededWarning`
2. ✅ `subClient status: ready` após conexão
3. ✅ Todos os canais fazem subscribe com sucesso
4. ✅ Eventos são recebidos em tempo real

---

## 🔗 Arquivos Modificados

- [`src/services/eventSync.service.ts`](../src/services/eventSync.service.ts) - EventSync Service
  - Criação direta do subClient
  - Aumento de maxListeners
  - Promise compartilhada de espera
  - Cleanup de listeners

---

## 📚 Referências

- [IORedis - duplicate() vs new instance](https://github.com/redis/ioredis#connection-events)
- [Node.js - EventEmitter Memory Leaks](https://nodejs.org/api/events.html#emittersetmaxlistenersn)
- [Socket.IO Redis Adapter - Best Practices](https://socket.io/docs/v4/redis-adapter/)

---

**Atualizado:** 16/01/2026  
**Status:** ✅ Implementado e Validado
