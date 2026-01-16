# 🔧 CORREÇÃO: Replicas não estavam sendo criadas

## Problema Identificado

❌ Status dos serviços após o deploy:
```
✅ postgres OK (1/1)     ← Funcionando
✅ pgbouncer OK (0/1)    ← NÃO iniciava
✅ redis OK (0/1)        ← NÃO iniciava
✅ api OK (0/1)          ← NÃO iniciava
✅ socket OK (0/1)       ← NÃO iniciava
```

## Causa Raiz

O **Docker Swarm não conseguia confirmar que os serviços estavam saudáveis** (healthcheck failing), então não criava as replicas.

### Problemas Específicos:

1. **Redis Healthcheck** - Estava usando bash complexo com variáveis escapadas incorretamente:
   ```bash
   # ❌ ERRADO (muito complexo)
   'REDIS_PASS=$$(cat /run/secrets/redis_password 2>/dev/null || true); 
    if [ -n "$$REDIS_PASS" ]; then redis-cli -a "$$REDIS_PASS" ping...'
   ```

2. **Timeout muito curto** - 5-10 segundos era insuficiente para containers iniciarem
   - API precisa compilar TypeScript (lento na primeira vez)
   - PgBouncer precisa conectar ao PostgreSQL
   - Healthchecks muito agressivos matavam os containers

3. **Retries insuficientes** - Com apenas 5 tentativas, o container era morto antes de ficar saudável

## Solução Implementada

✅ **Ajustes feitos em `api/docker-stack.yml`:**

### 1. Redis Healthcheck Simplificado
```yaml
# ✅ NOVO (simples e confiável)
healthcheck:
  test: ['CMD', 'redis-cli', 'ping']
  interval: 15s
  timeout: 10s
  retries: 5
  start_period: 60s  # ← Tempo para iniciar
```

### 2. PgBouncer Healthcheck Melhorado
```yaml
healthcheck:
  test: ['CMD-SHELL', 'pg_isready -h localhost -p 6432 || exit 1']
  interval: 15s
  timeout: 10s
  retries: 5
  start_period: 60s
```

### 3. API/Socket Healthchecks com Mais Tempo
```yaml
healthcheck:
  test: ['CMD', 'curl', '-f', 'http://localhost:3333/health']
  interval: 30s        # ← Aumentado
  timeout: 15s         # ← Aumentado
  retries: 3           # ← Reduzido (temos mais tempo)
  start_period: 180s   # ← 3 minutos para compilar JS/TS
```

## Padrão Recomendado para Healthchecks

Para cada tipo de serviço:

```
┌─ Database (PostgreSQL, Redis, Mongo)
│  interval: 15s
│  timeout: 10s
│  retries: 5
│  start_period: 60s
│
├─ Connection Pool (PgBouncer, Redis Cluster)
│  interval: 15s
│  timeout: 10s
│  retries: 5
│  start_period: 60s
│
└─ Application (Node.js, Go, Python)
   interval: 30s
   timeout: 15s
   retries: 3
   start_period: 180s
```

## Como Aplicar

### Opção 1: Deploy Manual (Recomendado)
```bash
cd /opt/estacao/api
bash deploy-fixed.sh
```

### Opção 2: Cleanup + Redeploy
```bash
# Remover stack antiga
docker stack rm estacaoterapia

# Aguardar limpeza
sleep 30

# Fazer deploy novo
cd /opt/estacao/api
bash deploy-fixed.sh
```

### Opção 3: Using the Fix Script
```bash
bash /opt/estacao/redeploy-fix.sh
```

## Monitoramento Após Deploy

```bash
# Ver status das replicas (ao vivo)
watch -n 5 'docker service ls | grep estacaoterapia'

# Ver tasks por serviço
docker service ps estacaoterapia_api

# Ver logs detalhados
docker service logs estacaoterapia_api -f

# Diagnosticar problema específico
docker service logs estacaoterapia_redis -f
```

## Sinais de Sucesso

Você saberá que funcionou quando vir:

```bash
$ docker service ls
ID          NAME                        MODE        REPLICAS   IMAGE
xxx         estacaoterapia_api          replicated  1/1 ✅    
xxx         estacaoterapia_socket       replicated  1/1 ✅
xxx         estacaoterapia_redis        replicated  1/1 ✅
xxx         estacaoterapia_pgbouncer    replicated  1/1 ✅
xxx         estacaoterapia_postgres     replicated  1/1 ✅
```

## Escalando Para Múltiplas Replicas

Quando tiver 2+ nodes no Swarm, você pode fazer:

```bash
# Aumentar replicas do API para 3
docker service scale estacaoterapia_api=3

# Redis para 2 (com cuidado, replicação pode ser necessária)
docker service scale estacaoterapia_redis=1  # Mantenha em 1
```

## Debug se Continuar Não Funcionando

```bash
# 1. Ver exatamente por que falha
docker service ps estacaoterapia_redis --no-trunc

# 2. Ver últimas 100 linhas de log
docker service logs estacaoterapia_redis --tail 100

# 3. Checar se a imagem existe
docker images | grep estacaoterapia

# 4. Verificar recursos do node
docker node inspect self --pretty

# 5. Verificar rede
docker network ls | grep estacao
```

## Arquivos Modificados

- ✅ `api/docker-stack.yml` - Healthchecks corrigidos

## Próximas Melhorias Recomendadas

1. **Adicionar logging estruturado** - Para melhor diagnóstico
2. **Adicionar Prometheus/Grafana** - Para monitorar saúde em tempo real
3. **Usar secrets para Redis password** - Mesmo no healthcheck
4. **Implementar CI/CD** - Para fazer deploy automático

---

📅 **Data**: 15 de janeiro de 2026  
🔧 **Versão**: 1.0 - Healthchecks Corrigidos
