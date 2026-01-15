# 🔧 PgBouncer Quick Reference

## 📁 Arquivos Modificados

- ✅ `Dockerfile.pgbouncer` - Imagem com configuração dinâmica
- ✅ `docker-stack.yml` - Service com variáveis de ambiente
- ✅ `secrets/pgbouncer.ini.production` - Configuração usando service discovery
- ✅ `secrets/pgbouncer.ini.example` - Template atualizado

## 📁 Arquivos Criados

- ✅ `create-pgbouncer-secrets.sh` - Script para criar secrets
- ✅ `validate-pgbouncer.sh` - Script de validação
- ✅ `docs/PGBOUNCER-CONFIGURATION.md` - Documentação completa

## 🚀 Deploy Rápido

### 1. Build da Imagem

```bash
cd api
docker build -f Dockerfile.pgbouncer -t estacaoterapia-pgbouncer:prd-v1 .
```

**Nota**: Templates de configuração estão embarcados na imagem. Build funciona sem arquivos `secrets/` locais.

### 2. Criar Secrets

```bash
chmod +x create-pgbouncer-secrets.sh
./create-pgbouncer-secrets.sh
```

Ou manualmente:

```bash
# Gerar hash MD5 (senha: "mypass", user: "estacaoterapia")
echo -n "mypassestacaoterapia" | md5sum
# Resultado: abc123...

# Criar userlist.txt
echo '"estacaoterapia" "md5abc123..."' > /tmp/userlist.txt

# Criar secrets
docker secret create pgbouncer.ini secrets/pgbouncer.ini.production
docker secret create userlist.txt /tmp/userlist.txt
rm /tmp/userlist.txt
```

### 3. Deploy

```bash
docker stack deploy -c docker-stack.yml estacaoterapia
```

### 4. Validar

```bash
chmod +x validate-pgbouncer.sh
./validate-pgbouncer.sh
```

## 🔍 Verificação Rápida

```bash
# Logs
docker service logs estacaoterapia_pgbouncer -f

# Status
docker service ps estacaoterapia_pgbouncer

# Testar conexão
CONTAINER_ID=$(docker ps -q -f name=pgbouncer)
docker exec -it $CONTAINER_ID psql -h localhost -p 6432 -U estacaoterapia -d estacaoterapia -c "SELECT 1;"
```

## 🎯 Como Funciona

```
┌─────────────────────────────────────────┐
│ 1. docker-stack.yml                     │
│    - Monta secrets em /run/secrets/     │
│    - Define env vars: PG_HOST=postgres  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 2. pgbouncer-entrypoint.sh              │
│    - Lê secret ou usa template          │
│    - Substitui host por $PG_HOST        │
│    - Gera /etc/pgbouncer/pgbouncer.ini  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 3. pgbouncer inicia                     │
│    - Conecta em: postgres:5432          │
│    - Escuta em: 0.0.0.0:6432            │
└─────────────────────────────────────────┘
```

## 🔐 Formato do userlist.txt

```
"username" "md5<hash>"
```

Onde `<hash>` = md5(password + username)

### Exemplo:

```bash
# User: estacaoterapia, Password: mypass123
echo -n "mypass123estacaoterapia" | md5sum
# Output: 1234567890abcdef...

# userlist.txt:
"estacaoterapia" "md51234567890abcdef..."
```

## 🌐 Conexão do PostgreSQL

O PgBouncer conecta ao PostgreSQL usando DNS do Swarm:

```ini
[databases]
estacaoterapia = host=postgres port=5432 dbname=estacaoterapia
```

O `postgres` resolve automaticamente para o IP do serviço `estacaoterapia_postgres`.

## 📊 Variáveis de Ambiente

| Variável         | Padrão           | Descrição              |
| ---------------- | ---------------- | ---------------------- |
| `PG_HOST`        | `postgres`       | Hostname do PostgreSQL |
| `PG_PORT`        | `5432`           | Porta do PostgreSQL    |
| `PG_DB`          | `estacaoterapia` | Nome do banco          |
| `PGBOUNCER_PORT` | `6432`           | Porta do PgBouncer     |

## 🐛 Troubleshooting

### Problema: "connection refused"

```bash
# Verificar se postgres está rodando
docker service ps estacaoterapia_postgres

# Verificar DNS
docker exec -it $(docker ps -q -f name=pgbouncer) nslookup postgres
```

### Problema: "authentication failed"

```bash
# Verificar userlist.txt
docker exec -it $(docker ps -q -f name=pgbouncer) cat /etc/pgbouncer/userlist.txt

# Recriar secret
docker secret rm userlist.txt
echo '"user" "md5hash..."' | docker secret create userlist.txt -
docker service update --force estacaoterapia_pgbouncer
```

### Problema: "database not found"

```bash
# Verificar pgbouncer.ini
docker exec -it $(docker ps -q -f name=pgbouncer) cat /etc/pgbouncer/pgbouncer.ini

# Ver logs
docker service logs estacaoterapia_pgbouncer --tail 50
```

## 📚 Documentação Completa

Ver: [docs/PGBOUNCER-CONFIGURATION.md](docs/PGBOUNCER-CONFIGURATION.md)

## 🎯 Checklist de Deploy

- [ ] Imagem buildada: `docker images | grep pgbouncer`
- [ ] Secrets criados: `docker secret ls | grep -E "pgbouncer|userlist"`
- [ ] Network criada: `docker network ls | grep estacaoterapia_backend`
- [ ] Service rodando: `docker service ps estacaoterapia_pgbouncer`
- [ ] Healthcheck OK: `docker service ps estacaoterapia_pgbouncer` (ver status)
- [ ] Conexão testada: `psql -h localhost -p 6432 ...`

## 🔄 Atualizar Configuração

```bash
# 1. Editar secrets/pgbouncer.ini.production
vim secrets/pgbouncer.ini.production

# 2. Recriar secret
docker secret rm pgbouncer.ini
docker secret create pgbouncer.ini secrets/pgbouncer.ini.production

# 3. Forçar update
docker service update --force estacaoterapia_pgbouncer

# 4. Verificar
docker service logs estacaoterapia_pgbouncer -f
```
