# 🌐 Service Discovery - Padronização de Nomes de Serviços

## 📋 Visão Geral

Todos os serviços da stack **Estação Terapia** agora usam **Service Discovery** do Docker Swarm ao invés de IPs fixos. Isso garante:

- ✅ **Alta disponibilidade** - Serviços podem mover entre nodes
- ✅ **Load balancing automático** - Docker distribui requisições
- ✅ **DNS interno** - Resolução automática de nomes
- ✅ **Portabilidade** - Mesma config em dev/staging/prod

## 🎯 Nomes Padronizados dos Serviços

### 1. **PostgreSQL**
```yaml
Service: postgres
Network Aliases:
  - postgres
  - postgres.estacaoterapia_backend
```

**Uso:**
```env
# ❌ ERRADO (IP fixo)
PG_HOST=10.0.1.10

# ✅ CORRETO (Service name)
PG_HOST=postgres
```

### 2. **PgBouncer**
```yaml
Service: pgbouncer
Network Aliases:
  - pgbouncer
  - estacaoterapia_pgbouncer
  - pgbouncer.estacaoterapia_backend
```

**Uso:**
```env
# ❌ ERRADO
PG_HOST=10.0.1.30
DATABASE_URL=postgresql://user:pass@10.0.1.30:6432/db

# ✅ CORRETO
PG_HOST=estacaoterapia_pgbouncer
DATABASE_URL=postgresql://user:pass@estacaoterapia_pgbouncer:6432/db
```

### 3. **Redis**
```yaml
Service: redis
Network Aliases:
  - redis
  - estacaoterapia_redis
  - redis.estacaoterapia_backend
```

**Uso:**
```env
# ❌ ERRADO
REDIS_HOST=10.0.1.20
REDIS_URL=redis://:pass@10.0.1.20:6379/1

# ✅ CORRETO
REDIS_HOST=estacaoterapia_redis
REDIS_URL=redis://:pass@estacaoterapia_redis:6379/1
```

### 4. **API Backend**
```yaml
Service: api
Network Aliases:
  - api
  - estacaoterapia_api
```

**Uso:**
```env
# ❌ ERRADO
API_URL=http://10.0.1.40:3333

# ✅ CORRETO
API_URL=http://estacaoterapia_api:3333
```

### 5. **Socket Server**
```yaml
Service: socket-server
Network Aliases:
  - socket-server
  - estacaoterapia_socket-server
  - ws
```

**Uso:**
```env
# ❌ ERRADO
SOCKET_URL=http://10.0.1.50:3334

# ✅ CORRETO
SOCKET_URL=http://estacaoterapia_socket-server:3334
```

## 📁 Arquivos Corrigidos

### ✅ Configurações de Produção
- `api/secrets/estacao_api.env.production`
- `api/secrets/estacao_socket.env.example`
- `api/secrets/pgbouncer.ini.production`

### ✅ Docker Stack
- `api/docker-stack.yml`

### ✅ Dockerfiles
- `api/Dockerfile.pgbouncer` (entrypoint dinâmico)
- `api/Dockerfile.redis` (entrypoint com secrets)

### ⚠️ Desenvolvimento Local
- `api/src/config/allowedOrigins.ts` - Mantém IP local `192.168.15.109` para desenvolvimento

## 🔍 Como Verificar Service Discovery

### 1. **Testar Resolução DNS**
```bash
# Entrar em qualquer container
docker exec -it $(docker ps -q -f name=api) bash

# Testar resolução
nslookup postgres
nslookup estacaoterapia_pgbouncer
nslookup estacaoterapia_redis

# Deve retornar IPs da rede overlay
```

### 2. **Verificar Conectividade**
```bash
# Testar porta PostgreSQL
nc -zv postgres 5432

# Testar PgBouncer
nc -zv estacaoterapia_pgbouncer 6432

# Testar Redis
nc -zv estacaoterapia_redis 6379

# Testar API
curl http://estacaoterapia_api:3333/health
```

### 3. **Ver Logs de Conexão**
```bash
# Ver logs do PgBouncer
docker service logs estacaoterapia_pgbouncer -f | grep "host="

# Ver logs da API
docker service logs estacaoterapia_api -f | grep "PG_HOST"
docker service logs estacaoterapia_api -f | grep "REDIS_HOST"
```

## 🔧 Padrão de Nomenclatura

### Formato Completo
```
<stack_name>_<service_name>
```

**Exemplos:**
- `estacaoterapia_postgres`
- `estacaoterapia_pgbouncer`
- `estacaoterapia_redis`
- `estacaoterapia_api`
- `estacaoterapia_socket-server`

### Aliases de Rede
Cada serviço tem múltiplos aliases para flexibilidade:

```yaml
networks:
  estacaoterapia_backend:
    aliases:
      - <service_name>                    # Nome curto (postgres)
      - estacaoterapia_<service_name>     # Nome completo (estacaoterapia_postgres)
      - <service_name>.estacaoterapia_backend  # FQDN (postgres.estacaoterapia_backend)
```

## 📊 Mapeamento de Portas

| Serviço | Porta Interna | Porta Externa (Caddy) |
|---------|---------------|----------------------|
| PostgreSQL | 5432 | - (interno) |
| PgBouncer | 6432 | - (interno) |
| Redis | 6379 | - (interno) |
| API | 3333 | 443 (api-prd.estacaoterapia.com.br) |
| Socket | 3334 | 443 (ws.prd.estacaoterapia.com.br) |

## 🚨 Casos Especiais

### Localhost em Healthchecks
```yaml
# ✅ CORRETO - localhost refere-se ao próprio container
healthcheck:
  test: ['CMD', 'curl', '-f', 'http://localhost:3333/health']
```

### IPs de Desenvolvimento
```typescript
// ✅ ACEITO - apenas para desenvolvimento local
export const allowedOrigins = [
    "http://localhost:3000",
    "http://192.168.15.109:3000",  // IP local dev
];
```

### Conexões Externas
```env
# ✅ CORRETO - serviços externos usam URLs públicas
SUPABASE_URL=https://mktmsurbxszuisgxjnkq.supabase.co
VINDI_API_URL=https://app.vindi.com.br/api/v1/
```

## 🐛 Troubleshooting

### Problema: "Could not resolve host"

**Causa:** Serviço não está na mesma rede ou nome incorreto

**Solução:**
```bash
# 1. Verificar rede
docker network inspect estacaoterapia_backend

# 2. Verificar aliases
docker service inspect estacaoterapia_pgbouncer | grep -A 10 "Aliases"

# 3. Testar DNS
docker exec -it $(docker ps -q -f name=api) nslookup estacaoterapia_pgbouncer
```

### Problema: "Connection refused"

**Causa:** Serviço não está rodando ou porta incorreta

**Solução:**
```bash
# 1. Verificar se service está rodando
docker service ps estacaoterapia_pgbouncer

# 2. Verificar porta
docker service inspect estacaoterapia_pgbouncer | grep -A 5 "ExposedPorts"

# 3. Testar conectividade
docker exec -it $(docker ps -q -f name=api) nc -zv estacaoterapia_pgbouncer 6432
```

### Problema: "Authentication failed"

**Causa:** Credenciais incorretas ou userlist desatualizado

**Solução:**
```bash
# Verificar userlist do PgBouncer
docker exec -it $(docker ps -q -f name=pgbouncer) cat /etc/pgbouncer/userlist.txt

# Recriar secret se necessário
docker secret rm userlist.txt
echo '"user" "md5hash"' | docker secret create userlist.txt -
docker service update --force estacaoterapia_pgbouncer
```

## 🔄 Migração de IPs para Service Names

### Checklist de Migração

- [x] PostgreSQL configurado com service discovery
- [x] PgBouncer usando `host=postgres`
- [x] Redis usando nome do serviço
- [x] API usando `PG_HOST=estacaoterapia_pgbouncer`
- [x] API usando `REDIS_HOST=estacaoterapia_redis`
- [x] Socket usando nomes de serviços
- [x] DATABASE_URL atualizada
- [x] REDIS_URL atualizada
- [x] docker-stack.yml com aliases corretos

### Script de Validação

```bash
#!/bin/bash
# Validar que nenhum IP fixo está sendo usado

echo "🔍 Procurando IPs fixos em configurações..."

# Buscar IPs privados em arquivos de config
grep -r "10\.\|192\.168\.\|172\.1[6-9]\.\|172\.2[0-9]\.\|172\.3[0-1]\." \
  api/secrets/*.production \
  api/docker-stack.yml \
  2>/dev/null | grep -v "localhost\|127.0.0.1" || echo "✅ Nenhum IP fixo encontrado!"

echo ""
echo "🌐 Verificando service names em uso..."

# Verificar services rodando
docker service ls --format "table {{.Name}}\t{{.Replicas}}" | grep estacaoterapia

echo ""
echo "📋 Verificando DNS resolution..."

# Testar de dentro de um container
docker exec $(docker ps -q -f name=api | head -n 1) sh -c "
  echo 'Testando resolução DNS:' &&
  nslookup postgres 2>/dev/null | grep 'Name:' &&
  nslookup estacaoterapia_pgbouncer 2>/dev/null | grep 'Name:' &&
  nslookup estacaoterapia_redis 2>/dev/null | grep 'Name:'
" || echo "⚠️ Container não está rodando ou DNS falhou"
```

## 📚 Referências

- [Docker Swarm Service Discovery](https://docs.docker.com/engine/swarm/networking/#use-swarm-mode-service-discovery)
- [Docker Overlay Networks](https://docs.docker.com/network/overlay/)
- [PgBouncer Configuration](https://www.pgbouncer.org/config.html)

## 🎯 Próximos Passos

1. ✅ Remover todos os IPs fixos da configuração
2. ✅ Usar service discovery em todos os serviços
3. ✅ Documentar padronização
4. 🔄 Testar em ambiente de staging
5. 🔄 Deploy em produção
6. 🔄 Monitorar logs de conexão
7. 🔄 Validar performance e latência

---

**Última atualização:** 15 de janeiro de 2026  
**Versão:** 1.0.0  
**Responsável:** DevOps Team
