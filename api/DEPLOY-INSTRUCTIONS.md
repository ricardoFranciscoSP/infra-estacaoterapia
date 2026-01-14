# 🚀 Instruções de Deploy - 100% Funcional

## ✅ Pré-requisitos

1. **Docker Swarm ativo** na sua máquina/servidor
2. **Todos os secrets configurados** em `./secrets/`
3. **Arquivo de backup do banco** em `./backups/estacaoterapia_prd.sql` (opcional)

## 📋 Preparação

### 1. Configurar Secrets

Copie os exemplos e configure com suas credenciais:

```bash
# PostgreSQL
cp ./secrets/postgres.env.example ./secrets/postgres.env
# Edite com suas credenciais

# API
cp ./secrets/estacao_api.env.example ./secrets/estacao_api.env
# Edite com suas credenciais

# Socket
cp ./secrets/estacao_socket.env.example ./secrets/estacao_socket.env
# Edite com suas credenciais

# PgBouncer
cp ./secrets/pgbouncer.ini.example ./secrets/pgbouncer.ini
cp ./secrets/userlist.txt.example ./secrets/userlist.txt
```

### 2. Verificar Docker Swarm

```bash
docker info | grep "Swarm"
# Deve retornar: Swarm: active
```

## 🚀 Executar Deploy

```bash
cd /path/to/api
chmod +x deploy.sh
./deploy.sh
```

## 📊 O que o Deploy Faz

O script `deploy.sh` executa as seguintes etapas:

### 1️⃣ **Validação Inicial**

- ✅ Verifica se Docker Swarm está ativo
- ✅ Valida existência de todos os arquivos de secrets
- ✅ Extrai credenciais do `postgres.env`

### 2️⃣ **Gerenciamento de Secrets**

- ✅ Cria/atualiza secrets do Docker Swarm
- ✅ Cria secrets individuais (postgres_user, postgres_password, postgres_db, redis_password)

### 3️⃣ **Gerenciamento de Volumes**

- ✅ Verifica e cria volumes necessários:
  - `postgres_data` - Dados do PostgreSQL
  - `redis_data` - Dados do Redis
  - `documentos_data` - Documentos da aplicação

### 4️⃣ **Gerenciamento de Redes**

- ✅ Cria redes overlay do Docker Swarm:
  - `estacao-backend-network`
  - `estacao-network`

### 5️⃣ **Build de Imagens**

- ✅ Build da imagem da API: `estacaoterapia-api:prd-{TAG}`
- ✅ Build da imagem do Socket: `estacaoterapia-socket-server:prd-{TAG}`

### 6️⃣ **Deploy para Swarm**

- ✅ Faz backup do `docker-stack.yml` atual
- ✅ Atualiza tags das imagens
- ✅ Deploy com zero-downtime (rolling update)

### 7️⃣ **Monitoramento de Saúde**

- ✅ Aguarda PostgreSQL, Redis e PgBouncer ficarem prontos (até 180 segundos)
- ✅ Exibe status dos serviços

### 8️⃣ **Restauração do Banco de Dados**

- ✅ Verifica se backup SQL existe
- ✅ Cria banco de dados se não existir
- ✅ Restaura dados do backup se o banco estiver vazio
- ✅ Pula restauração se banco já possui tabelas

### 9️⃣ **Limpeza**

- ✅ Remove imagens antigas (mantém 1 versão anterior)
- ✅ Remove imagens dangling
- ✅ Remove arquivos temporários

## 🔍 Monitoramento

Após o deploy, monitore os serviços:

```bash
# Ver status dos serviços
docker service ls

# Ver logs da API
docker service logs estacaoterapia_api -f

# Ver logs do Socket
docker service logs estacaoterapia_socket-server -f

# Ver logs do PostgreSQL
docker service logs estacaoterapia_postgres -f

# Ver logs do Redis
docker service logs estacaoterapia_redis -f

# Ver replicas detalhadas
docker service ps estacaoterapia_api
docker service ps estacaoterapia_socket-server
```

## ✅ Verificar Health Check

```bash
# Testar endpoint da API
curl http://localhost:3333/health

# Testar endpoint do Socket
curl http://localhost:3334/health

# Conectar ao PostgreSQL
docker exec -it $(docker ps -qf name=estacaoterapia_postgres) \
  psql -U estacaoterapia -d estacaoterapia -c "SELECT 1"
```

## ⏮️ Reverter Deploy

Se precisar reverter para a versão anterior:

```bash
# O script faz backup automático em docker-stack.yml.backup-{TIMESTAMP}
cp docker-stack.yml.backup-20260114140132 docker-stack.yml
docker stack deploy -c docker-stack.yml estacaoterapia
```

## 🐛 Troubleshooting

### Serviços não iniciam

```bash
# Verificar logs
docker service logs estacaoterapia_postgres
docker service logs estacaoterapia_redis

# Verificar saúde das replicas
docker service ps estacaoterapia_postgres
docker service ps estacaoterapia_redis
```

### Erro ao restaurar banco de dados

```bash
# Verificar se o container do PostgreSQL está rodando
docker ps | grep postgres

# Verificar conectividade
docker exec -it $(docker ps -qf name=estacaoterapia_postgres) psql -U estacaoterapia -c "SELECT 1"
```

### Secrets não aplicados

```bash
# Listar secrets criados
docker secret ls

# Verificar conteúdo de um secret
docker secret inspect postgres_user

# Remover e recriar
docker secret rm postgres_user
echo "estacaoterapia" | docker secret create postgres_user -
```

## 📝 Estrutura de Credenciais

### `secrets/postgres.env`

```
POSTGRES_USER=estacaoterapia
POSTGRES_PASSWORD=sua-senha-segura
POSTGRES_DB=estacaoterapia
```

### `secrets/estacao_api.env`

```
POSTGRES_USER=estacaoterapia
POSTGRES_PASSWORD=sua-senha-segura
POSTGRES_DB=estacaoterapia
REDIS_PASSWORD=sua-senha-redis
REDIS_URL=redis://:sua-senha-redis@redis:6379/1
JWT_SECRET=seu-jwt-secret
# ... outras variáveis
```

### `secrets/estacao_socket.env`

```
NODE_ENV=production
PORT=3334
SOCKET_SERVER=true
SERVER_TYPE=socket
# ... outras variáveis
```

## 🎯 Recursos

- 📦 **API**: Node.js + Express
- 🔌 **Socket**: Node.js + Socket.io
- 🗄️ **Banco**: PostgreSQL 16
- 💾 **Cache**: Redis 7
- 🎯 **Pool**: PgBouncer
- 🔄 **Orquestração**: Docker Swarm

## ✨ Melhorias Implementadas

- ✅ Validação completa de secrets antes do deploy
- ✅ Extração automática de credenciais
- ✅ Criação automática de volumes
- ✅ Criação automática de redes
- ✅ Restauração inteligente de banco (detecta se já tem dados)
- ✅ Monitoramento de saúde aprimorado
- ✅ Zero-downtime deployment com rolling update
- ✅ Limpeza automática de imagens antigas
- ✅ Backup automático da configuração
- ✅ Rollback automático em caso de falha
