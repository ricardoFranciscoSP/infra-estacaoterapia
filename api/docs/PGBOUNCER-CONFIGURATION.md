# 🔧 Configuração do PgBouncer com Docker Swarm

## 📋 Visão Geral

O PgBouncer agora está configurado para conectar dinamicamente ao serviço PostgreSQL usando o DNS interno do Docker Swarm, com suporte a secrets e variáveis de ambiente.

## 🎯 Mudanças Implementadas

### 1. **Dockerfile.pgbouncer**

#### ✅ O que foi adicionado:
- **Ferramentas**: Adicionado `gettext` para processamento de templates
- **Diretórios de templates**: `/etc/pgbouncer/templates/` para armazenar configurações base
- **Cópia de configurações**: `pgbouncer.ini.production` e `userlist.txt.example` copiados para a imagem
- **Entrypoint script**: Script bash que processa configurações dinamicamente

#### 🔄 Como funciona:
```bash
# O entrypoint faz o seguinte:
1. Carrega variáveis de ambiente (PG_HOST, PG_PORT, etc.)
2. Verifica se existe secret montado em /run/secrets/
3. Se existe secret: usa ele como base
4. Se não existe: usa template da imagem
5. Substitui o host/port pelo nome do serviço do Swarm
6. Inicia o pgbouncer
```

### 2. **docker-stack.yml**

#### ✅ Variáveis de Ambiente Adicionadas:
```yaml
environment:
  PG_HOST: postgres          # Nome do serviço PostgreSQL
  PG_PORT: '5432'            # Porta do PostgreSQL
  PG_DB: estacaoterapia      # Nome do banco
  PGBOUNCER_PORT: '6432'     # Porta do PgBouncer
```

#### 🔐 Secrets Atualizados:
```yaml
secrets:
  - source: pgbouncer.ini
    target: /run/secrets/pgbouncer.ini  # Movido para /run/secrets/
  - source: userlist.txt
    target: /run/secrets/userlist.txt
```

### 3. **pgbouncer.ini.production**

#### ✅ Conexão Atualizada:
```ini
# ANTES (IP fixo):
estacaoterapia = host=10.0.1.10 port=5432 ...

# DEPOIS (Service discovery):
estacaoterapia = host=postgres port=5432 ...
```

O entrypoint substituirá `postgres` pelo valor da variável `$PG_HOST`.

## 🚀 Como Usar

### 1. **Build da Imagem**
```bash
cd api
docker build -f Dockerfile.pgbouncer -t estacaoterapia-pgbouncer:prd-v1 .
```

### 2. **Criar Secrets (se ainda não existem)**
```bash
# PgBouncer.ini
docker secret create pgbouncer.ini secrets/pgbouncer.ini.production

# Userlist.txt (crie com senhas hasheadas em MD5)
docker secret create userlist.txt secrets/userlist.txt
```

#### 📝 Como gerar hash MD5 para userlist.txt:
```bash
# Formato: "username" "md5" + md5(password + username)
# Exemplo para user "estacaoterapia" com senha "mypassword":
echo -n "mypasswordestacaoterapia" | md5sum
# Resultado: abc123...

# userlist.txt final:
"estacaoterapia" "md5abc123..."
```

### 3. **Deploy do Stack**
```bash
docker stack deploy -c docker-stack.yml estacaoterapia
```

## 🔍 Verificação

### 1. **Verificar logs do PgBouncer**
```bash
docker service logs estacaoterapia_pgbouncer -f
```

Você deve ver:
```
🔧 PgBouncer starting with:
   PostgreSQL Host: postgres
   PostgreSQL Port: 5432
   Database: estacaoterapia
   PgBouncer Port: 6432
📦 Using pgbouncer.ini from secret
✅ Configuration ready:
[databases]
estacaoterapia = host=postgres port=5432 dbname=estacaoterapia connect_query='SELECT 1'
```

### 2. **Testar conexão via PgBouncer**
```bash
# Entrar no container do PgBouncer
docker exec -it $(docker ps -q -f name=pgbouncer) bash

# Testar conexão
psql -h localhost -p 6432 -U estacaoterapia -d estacaoterapia -c "SELECT version();"
```

### 3. **Verificar healthcheck**
```bash
docker service ps estacaoterapia_pgbouncer
```

Status deve ser **Running** com healthcheck **healthy**.

## 🔧 Configuração Avançada

### Customizar Variáveis de Ambiente

Você pode sobrescrever as variáveis no `docker-stack.yml`:

```yaml
pgbouncer:
  environment:
    PG_HOST: postgres-primary      # Usar outro host
    PG_PORT: '5433'                # Porta customizada
    PG_DB: my_database             # Outro banco
    PGBOUNCER_PORT: '6432'
```

### Usar Múltiplos Bancos

Edite o `pgbouncer.ini.production`:

```ini
[databases]
estacaoterapia = host=postgres port=5432 dbname=estacaoterapia
production_db = host=postgres port=5432 dbname=production
staging_db = host=postgres-staging port=5432 dbname=staging
```

## 📊 Monitoramento

### Admin Console do PgBouncer

```bash
# Conectar ao admin console
psql -h localhost -p 6432 -U admin pgbouncer

# Comandos úteis:
SHOW POOLS;        # Ver pools ativos
SHOW DATABASES;    # Ver bancos configurados
SHOW STATS;        # Estatísticas de uso
SHOW CLIENTS;      # Clientes conectados
```

## 🐛 Troubleshooting

### Problema: PgBouncer não conecta ao PostgreSQL

**Verificar:**
```bash
# 1. Service postgres está rodando?
docker service ps estacaoterapia_postgres

# 2. Rede está correta?
docker network inspect estacaoterapia_backend

# 3. DNS resolve?
docker exec -it $(docker ps -q -f name=pgbouncer) nslookup postgres
```

### Problema: Senha incorreta

**Verificar:**
```bash
# 1. Userlist.txt está correto?
docker exec -it $(docker ps -q -f name=pgbouncer) cat /etc/pgbouncer/userlist.txt

# 2. Gerar novo hash MD5
echo -n "senha_aqui$usuario" | md5sum
```

### Problema: Configuração não atualiza

**Solução:**
```bash
# Forçar recreate do serviço
docker service update --force estacaoterapia_pgbouncer
```

## 📚 Referências

- [PgBouncer Documentation](https://www.pgbouncer.org/config.html)
- [Docker Swarm Secrets](https://docs.docker.com/engine/swarm/secrets/)
- [Docker Service Discovery](https://docs.docker.com/network/overlay/)

## 🎯 Próximos Passos

1. ✅ Configuração dinâmica via variáveis de ambiente
2. ✅ Conexão via service discovery do Swarm
3. ✅ Secrets integrados na imagem
4. 🔄 Monitoramento com métricas Prometheus (futuro)
5. 🔄 Backup automático de configurações (futuro)
