# Correção de Erros de Conexão Redis - Documentação

## Problema Identificado

A API estava recebendo erros de conexão Redis do tipo:
```
Error: getaddrinfo ENOTFOUND redis
```

E timeouts:
```
❌ [IORedis] Erro ao conectar ou validar: Error: Timeout aguardando IORedis
```

Isso causava com que o BullMQ (workers de jobs) falhasse:
```
🚨 [AgendaWorker] Worker error: Error: Command timed out
```

## Causas Raiz Identificadas

1. **Timeout de Conexão Muito Curto**: O `connectTimeout` de 30 segundos era insuficiente para Docker Swarm com problemas de DNS
2. **Retry Strategy Fraco**: Apenas 15 tentativas com delay fixo de 500ms não era suficiente
3. **Falta de Diagnóstico de DNS**: Sem logs detalhados sobre erros de resolução de DNS
4. **Entrypoint Bloqueante**: O script tentava conectar ao Redis de forma síncrona antes de iniciar Node.js

## Alterações Implementadas

### 1. **src/config/redis.config.ts** - Melhorias na Configuração de IORedis

#### Aumentar Timeouts
```typescript
// ANTES:
connectTimeout: 30_000, // 30 segundos

// DEPOIS:
connectTimeout: 60_000,  // 60 segundos
commandTimeout: 30_000,  // Adicionar timeout para comandos também
```

**Razão**: Docker Swarm pode ter latência alta na resolução de DNS, especialmente em redes overlay.

#### Aumentar Tentativas de Reconexão
```typescript
// ANTES:
const MAX_RETRIES = 15;
const RETRY_DELAY_MS = 2000;

// DEPOIS:
const MAX_RETRIES = 20;  // Mais tentativas
const RETRY_DELAY_MS = 3000;  // Delay progressivo começando maior
```

#### Melhorar Retry Strategy
```typescript
retryStrategy: (times: number) => {
    // ...
    // Backoff exponencial: 500ms * times, máx 10 segundos
    const delay = Math.min(times * 500, 10_000);
    
    // Logs detalhados nas tentativas iniciais e a cada 3
    if (times === 1) {
        console.log(`⏳ [IORedis] Primeira tentativa de conexão em ${delay}ms...`);
        console.log(`   Host: ${configHost}, Port: ${configPort}, DB: ${configDb}`);
    } else if (times % 3 === 0 || times <= 5) {
        console.log(`⏳ [IORedis] Tentativa ${times}/${MAX_RETRIES} - próxima em ${delay}ms`);
    }
```

**Razão**: Backoff exponencial permite que a rede se estabilize, e logs detalhados nas primeiras tentativas ajudam no diagnóstico.

#### Adicionar Configurações de DNS IPv4-Preferente
```typescript
const redisConfig = {
    // ...
    dns: {
        family: 0,  // IPv4 e IPv6
        hints: 0,
    },
    preferIPv4: true,  // Preferir IPv4 em Docker Swarm
};
```

**Razão**: Docker Swarm com redes overlay pode ter problemas com IPv6. IPv4 é mais confiável.

#### Melhorar Handlers de Erro
```typescript
ioredisClient.on("error", (err) => {
    const errorMsg = err?.message || String(err);
    
    // Erros de DNS/rede específicos
    if (errorMsg.includes('ENOTFOUND')) {
        console.error(`❌ [IORedis] Erro DNS: Não consegue resolver hostname "${configHost}"`);
        console.error(`   Causa comum: Problema na rede overlay do Docker Swarm ou container sem DNS configurado`);
        console.error(`   Solução: Verificar se redis está rodando e se a rede está acessível`);
    } else if (errorMsg.includes('ECONNREFUSED')) {
        console.error(`❌ [IORedis] Conexão recusada: Redis não está escutando em ${configHost}:${configPort}`);
    } else if (errorMsg.includes('ETIMEDOUT')) {
        console.error(`❌ [IORedis] Timeout: Conexão com Redis expirou`);
    }
    // ...
});
```

**Razão**: Mensagens de erro descritivas facilitam diagnóstico de problemas.

### 2. **api/entrypoint.sh** - Melhorias em Diagnóstico de DNS

#### Adicionar Diagnóstico de DNS
```bash
echo "📡 Diagnóstico de DNS para Redis:"

# Tentar resolver DNS do Redis
if nslookup "$REDIS_HOST" >/dev/null 2>&1; then
    REDIS_IP=$(nslookup "$REDIS_HOST" 2>/dev/null | grep -A1 "Name:" | tail -1 | awk '{print $NF}')
    echo "✅ DNS resolvido: $REDIS_HOST → $REDIS_IP"
else
    echo "⚠️  nslookup falhou para $REDIS_HOST"
    
    # Tentar com getent (alternativa)
    if getent hosts "$REDIS_HOST" >/dev/null 2>&1; then
        REDIS_IP=$(getent hosts "$REDIS_HOST" | awk '{print $1}')
        echo "✅ getent resolveu: $REDIS_HOST → $REDIS_IP"
    fi
fi
```

**Razão**: Saber se o DNS está resolvendo o Redis é o primeiro passo para diagnóstico.

#### Log de Informações de Rede
```bash
echo "🔍 Informações de rede do container:"
echo "   • Hostname: $(hostname 2>/dev/null || echo 'não disponível')"
echo "   • Interface eth0: $(ifconfig eth0 2>/dev/null | grep "inet " | awk '{print $2}' || echo 'não disponível')"

# Se /etc/resolv.conf existe, mostrar nameservers
if [ -f /etc/resolv.conf ]; then
    echo "   • DNS servers:"
    grep "^nameserver" /etc/resolv.conf | sed 's/^/     /'
fi
```

**Razão**: Informações de rede e DNS servers ajudam a identificar problemas de configuração.

#### Não Bloquear em Falha de Conexão Redis
```bash
# ANTES: Tentava reconectar com retry (bloqueava)
# DEPOIS: Test simples com timeout, sem bloquear
if timeout 5 nc -z "$REDIS_HOST" "$REDIS_PORT" >/dev/null 2>&1; then
    echo "✅ Redis está acessível via: $REDIS_HOST:$REDIS_PORT"
else
    echo "⚠️  Redis NÃO está respondendo no momento"
    echo "   ℹ️  Isso é OK - o Node.js tentará reconectar automaticamente"
    echo "   🔄 Continuando inicialização do container..."
fi
```

**Razão**: O entrypoint.sh não deve bloquear a inicialização do Node.js se Redis não estiver pronto. Deixar o IORedis (que tem retry automático melhorado) lidar com reconexões.

## Fluxo de Inicialização Agora

```
1. Container inicia (entrypoint.sh)
   ├─ Carrega secrets
   ├─ Configura variáveis de ambiente
   ├─ 📡 Diagnóstico de DNS para Redis
   │  ├─ Resolve hostname "redis" → IP
   │  ├─ Mostra nameservers configurados
   │  └─ Mostra interfaces de rede
   ├─ Testa conectividade Redis (5s timeout, não bloqueia)
   ├─ ✅ Continua mesmo que Redis não responda
   └─ Inicia Node.js
   
2. Node.js inicia (src/config/redis.config.ts)
   ├─ ✅ [IORedis] Criando nova conexão singleton...
   ├─ 🔌 [IORedis] Conectando ao Redis...
   ├─ ⏳ [IORedis] Tentativa 1/20 - reconectando em 500ms
   ├─ ⏳ [IORedis] Tentativa 2/20 - reconectando em 1000ms
   ├─ ⏳ [IORedis] Tentativa 3/20 - reconectando em 1500ms
   ├─ ... (continua com backoff exponencial até 10 segundos)
   ├─ Se Redis fica disponível:
   │  └─ ✅ [IORedis] Status: READY - Conectado e pronto para uso
   ├─ Se Redis continua indisponível:
   │  ├─ ❌ [IORedis] Erro DNS: Não consegue resolver hostname "redis"
   │  ├─ ⚠️ [IORedis] Tentativa 20/20 - próxima em 10000ms
   │  └─ 🛑 [IORedis] Redis indisponível após 20 tentativas
   │
   └─ BullMQ aguarda Redis
      ├─ 🚦 Aguardando disponibilidade de Redis para iniciar workers BullMQ...
      ├─ ⏳ [Redis] Aguardando Redis ficar disponível (redis:6379, db 1)
      └─ ✅ [Redis] Conectado e pronto
```

## Melhorias de Logging

### Antes
```
❌ [IORedis] Erro ao conectar ou validar: Error: Timeout aguardando IORedis
⏳ [BullMQ] Aguardando conexão Redis...
❌ [IORedis] Erro: Error: Timeout aguardando IORedis
```

### Depois
```
📡 Diagnóstico de DNS para Redis:
✅ DNS resolvido: redis → 10.0.5.12
🔍 Informações de rede do container:
   • Hostname: estacaoterapia_api.1.zwidvgchsiwh
   • Interface eth0: 10.0.5.11
   • DNS servers:
      nameserver 127.0.0.11

🔌 [IORedis] Status: CONNECT - Conectando ao Redis (redis:6379)
⏳ [IORedis] Tentativa 1/20 - reconectando em 500ms...
   Host: redis, Port: 6379, DB: 1
   Status esperado: "ready"
⏳ [IORedis] Tentativa 3/20 - próxima em 1500ms
⚠️ [IORedis] Ainda aguardando conexão (5 tentativas)
⏳ [IORedis] Tentativa 6/20 - próxima em 3000ms

❌ [IORedis] Erro DNS: Não consegue resolver hostname "redis"
   Causa comum: Problema na rede overlay do Docker Swarm ou container sem DNS configurado
   Solução: Verificar se redis está rodando e se a rede está acessível

✅ [IORedis] Status: READY - Conectado e pronto para uso
   Host: redis:6379, DB: 1
```

## Checklist de Diagnóstico se Ainda Houver Problemas

Se após as alterações ainda houver problemas, verificar:

1. **Redis está rodando?**
   ```bash
   docker service ls | grep redis
   docker service ps estacaoterapia_redis
   ```

2. **Rede overlay está configurada?**
   ```bash
   docker network ls | grep estacao
   docker network inspect estacaoterapia_backend
   ```

3. **DNS está funcionando dentro do container?**
   ```bash
   # De dentro do container da API:
   nslookup redis
   getent hosts redis
   cat /etc/resolv.conf
   ```

4. **Redis está escutando na porta?**
   ```bash
   docker exec $(docker ps | grep redis | awk '{print $1}') \
     redis-cli -p 6379 PING
   ```

5. **Firewall/iptables está bloqueando?**
   ```bash
   # No nó Swarm:
   sudo iptables -L -n | grep 6379
   sudo ufw status | grep 6379
   ```

## Variáveis de Ambiente Críticas

Garantir que estão definidas no docker-stack.yml ou secrets:

```yaml
environment:
  NODE_ENV: production
  REDIS_HOST: redis        # Alias da rede
  REDIS_PORT: '6379'
  REDIS_DB: '1'
  
secrets:
  redis_password: <arquivo-com-senha>
```

## Próximos Passos Recomendados

1. Fazer deploy com as alterações
2. Monitorar logs iniciais (primeiras 2-3 minutos)
3. Aguardar que a mensagem `✅ [IORedis] Status: READY` apareça
4. Se timeout continuar após 20 tentativas:
   - Aumentar `MAX_RETRIES` para 30
   - Aumentar `connectTimeout` para 90000 (90s)
   - Adicionar mais namespaces de logging

## Resumo de Mudanças

| Arquivo | Alteração | Benefício |
|---------|-----------|----------|
| `src/config/redis.config.ts` | `connectTimeout: 30s → 60s` | Mais tempo para DNS resolver |
| `src/config/redis.config.ts` | `MAX_RETRIES: 15 → 20` | Mais tentativas de reconexão |
| `src/config/redis.config.ts` | `RETRY_DELAY_MS: 2s → 3s` | Mais tempo entre tentativas |
| `src/config/redis.config.ts` | `retryStrategy` com backoff exponencial | Delay progressivo (500ms → 10s) |
| `src/config/redis.config.ts` | Handlers de erro descritivos | Diagnóstico facilitado |
| `api/entrypoint.sh` | Diagnóstico de DNS para Redis | Identificar problemas de resolução |
| `api/entrypoint.sh` | Log de informações de rede | Verificar configuração de rede |
| `api/entrypoint.sh` | Teste simples (timeout 5s) | Não bloquear inicialização |

