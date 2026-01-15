# 🔧 Troubleshooting: Erros de DNS e Redis

## Problemas Identificados

### 1. ❌ `nc: getaddrinfo for host "api" port 3333: Name does not resolve`

**Causa**: O `socket-server` ou outras ferramentas de diagnóstico tentam resolver `api:3333` mas falham no Docker Swarm.

**Por que acontece:**
- Docker Swarm **SIM consegue resolver** `api:3333` via VIP (Virtual IP) interno
- Porém, `nc` (netcat) usa DNS tradional que pode falhar se não configurado corretamente
- O erro ocorre quando Caddy tenta fazer health check ou quando diagnósticos rodão scripts

**✅ Solução**: 
O Caddyfile foi atualizado com:
- Timeout maior: `dial_timeout 15s` (antes era 10s)
- Health check com `health_status 200` explícito
- Policy de retry: `random_selection` com `try_duration 10s`

---

### 2. ❌ `[Redis] Timeout aguardando IORedis`

**Causa**: A conexão com Redis está falhando por timeouts. Há **2 problemas simultâneos**:

#### Problema 2A: Healthcheck do Redis está falhando
```
healthcheck:
  test: [...redis-cli --raw incr ping...]  # ❌ PROBLEMA: 'incr' modifica dados!
```

**Solução aplicada:**
```yaml
healthcheck:
  test:
    - CMD-SHELL
    - 'REDIS_PASS=$(cat /run/secrets/redis_password 2>/dev/null || echo "") && 
       if [ -n "$REDIS_PASS" ]; then 
         redis-cli -a "$REDIS_PASS" ping > /dev/null 2>&1 || exit 1
       else 
         redis-cli ping > /dev/null 2>&1 || exit 1
       fi'
  interval: 10s
  timeout: 10s        # ⬆️ Aumentado de 5s para 10s
  retries: 10         # ⬆️ Aumentado de 5 para 10
  start_period: 30s   # ⬆️ NOVO: Dar tempo inicial para Redis iniciar
```

#### Problema 2B: API não aguarda Redis ficar pronto
**Solução aplicada:**
```yaml
api:
  healthcheck:
    start_period: 60s   # ⬆️ NOVO: Aguardar 60s antes de primeiro health check
    timeout: 10s        # ⬆️ Aumentado de 5s
    retries: 5          # ⬆️ Aumentado de 3
```

---

## 📊 Comparativo: Antes vs Depois

| Aspecto | Antes | Depois | Por quê |
|---------|-------|--------|---------|
| **Redis timeout** | 5s | 10s | Dar tempo para responder |
| **Redis retries** | 5 | 10 | Mais chances de sucesso |
| **API timeout healthcheck** | 5s | 10s | Aguardar startup do Redis |
| **API start_period** | ❌ Não tinha | 60s | Não checar saúde cedo demais |
| **Socket timeout** | 10s | 15s | Melhor resiliência |
| **Caddy dial_timeout** | 10s | 15s | Mais tempo para resolver DNS |

---

## 🚀 Passos para Resolver (Checklist)

### Pré-requisitos
```bash
# 1. Verificar que a rede existe
docker network ls | grep estacao-backend-network

# 2. Se não existe, criar:
docker network create --driver overlay estacao-backend-network

# 3. Verificar volumes
docker volume ls | grep redis_data
docker volume ls | grep postgres_data
docker volume ls | grep documentos_data
```

### Deploy (Na ordem correta)

```bash
# 1. Deploy do stack API (que inclui Redis, PostgreSQL, API, Socket)
docker stack deploy -c api/docker-stack.yml estacaoterapia

# 2. AGUARDAR todos os serviços estarem healthy (importante!)
docker service ls
# Todos devem ter "1/1" replicas e status saudável

# 3. Verificar status específico
docker service logs estacaoterapia_redis --tail 50
docker service logs estacaoterapia_api --tail 50

# 4. Deploy do Caddy (último, porque precisa de API já rodando)
docker stack deploy -c docker-stack.caddy.yml estacaoterapia

# 5. Verificar Caddy
docker service logs estacaoterapia_caddy --tail 50
```

### Diagnóstico pós-deploy

```bash
# 1. Verificar conectividade DNS entre serviços
docker exec -it <container_id_api> \
  nslookup redis

# 2. Testar conexão Redis diretamente
docker exec -it <container_id_api> \
  redis-cli -h redis -p 6379 ping

# 3. Verificar variáveis de ambiente
docker exec -it <container_id_api> \
  env | grep REDIS

# 4. Verificar logs detalhados
docker service logs estacaoterapia_api --follow --tail 100
```

---

## ⚠️ Problemas Comuns & Soluções

### A. Redis ainda falha após deploy

```bash
# Verificar se container Redis está rodando
docker ps | grep redis

# Verificar logs do Redis
docker service logs estacaoterapia_redis --tail 100

# Se precisar recriar:
docker volume rm redis_data  # ⚠️ Perderá dados!
docker service update --force estacaoterapia_redis
```

### B. Socket-server ainda não consegue conectar em API

```bash
# Verificar DNS no container socket-server
docker exec -it <socket_container> \
  nslookup api

# Se falhar, pode ser problema de rede overlay
docker network inspect estacao-backend-network --format='{{json .}}' | jq
```

### C. Caddy ainda não consegue acessar API

```bash
# Verificar se Caddy está na rede estacao-backend-network
docker ps | grep caddy
docker inspect <caddy_container> | grep "Networks" -A 20

# Deve ter AMBAS:
# - estacao-network
# - estacao-backend-network
```

---

## 📝 Arquivo Modificações

### ✅ `api/docker-stack.yml`
- **Redis**: Healthcheck melhorado, timeout aumentado, start_period adicionado
- **API**: healthcheck com start_period e timeouts maiores, placement constraint adicionado
- **Socket-server**: Mesmo ajuste de healthcheck, start_period adicionado

### ✅ `Caddyfile`
- **API block**: Timeout 15s, health check status explícito, retry policy
- **WebSocket block**: Mesmo melhoramento, com headers WebSocket específicos

---

## 🎯 Checklist Final

- [ ] Redes criadas: `estacao-backend-network` existe
- [ ] Volumes criados: `redis_data`, `postgres_data`, `documentos_data`, `caddy_data`, `caddy_config`
- [ ] Secrets criados corretamente
- [ ] Deploy do `api/docker-stack.yml` completo (todos serviços healthy)
- [ ] Deploy do `docker-stack.caddy.yml` completo
- [ ] Testar acesso: `curl -H "Host: api-prd.estacaoterapia.com.br" http://localhost/health`
- [ ] Testar WebSocket: verificar logs sem timeout errors
- [ ] Logs limpos (não há retries infinitos)

---

## 🔗 Referências

- [Docker Swarm DNS Resolution](https://docs.docker.com/engine/swarm/networking/#use-swarm-mode-service-discovery)
- [Healthcheck Best Practices](https://docs.docker.com/compose/compose-file/05-services/#healthcheck)
- [Caddy Reverse Proxy Docs](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)
