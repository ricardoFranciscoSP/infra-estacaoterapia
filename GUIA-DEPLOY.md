# 🚀 Guia Completo de Deploy - Estação Terapia

## 📋 Índice
1. [Deploy Local (Desenvolvimento)](#deploy-local)
2. [Deploy em Produção (Docker Swarm)](#deploy-producao)
3. [Comandos Úteis](#comandos-uteis)
4. [Troubleshooting](#troubleshooting)

---

## 🏠 Deploy Local (Desenvolvimento)

### Pré-requisitos
- Docker e Docker Compose instalados
- Portas 80, 443, 5432, 6379, 3001, 3333, 3334 disponíveis

### Passo a Passo

#### 1. Configurar Variáveis de Ambiente
```bash
# Copiar arquivo de exemplo
cp env.example .env

# Editar o arquivo .env com suas configurações
```

Variáveis mínimas necessárias no `.env`:
```env
# Database
POSTGRES_PASSWORD=senha_segura_postgres
DATABASE_URL="postgresql://estacaoterapia:senha_segura_postgres@postgres:5432/estacaoterapia"

# Redis
REDIS_PASSWORD=senha_segura_redis
REDIS_URL="redis://:senha_segura_redis@redis:6379/1"

# URLs
NEXT_PUBLIC_API_URL=http://localhost:3333
NEXT_PUBLIC_SOCKET_URL=http://localhost:3334

# Secrets
JWT_SECRET=seu_jwt_secret_aqui
NEXTAUTH_SECRET=seu_nextauth_secret_aqui
```

#### 2. Iniciar os Serviços
```bash
# Usar o script de inicialização
chmod +x start.sh
./start.sh
```

Ou manualmente:
```bash
# Criar rede
docker network create estacao-network

# Criar volumes
docker volume create postgres_data
docker volume create redis_data
docker volume create documentos_data
docker volume create caddy_data
docker volume create caddy_config

# Iniciar serviços
docker-compose up -d
```

#### 3. Verificar Status
```bash
# Ver todos os containers
docker-compose ps

# Ver logs
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f api
docker-compose logs -f frontend
docker-compose logs -f socket-server
```

#### 4. Acessar os Serviços
- Frontend: http://localhost:3000 ou https://estacaoterapia.localhost
- API: http://localhost:3333 ou https://api-prd.estacaoterapia.localhost
- Socket: http://localhost:3334 ou https://ws.prd.estacaoterapia.localhost

---

## 🏭 Deploy em Produção (Docker Swarm)

### Pré-requisitos
- Servidor Linux com Docker instalado
- Docker Swarm inicializado
- Domínios configurados no DNS
- Portas 80 e 443 liberadas no firewall

### Arquitetura
```
Frontend (estacao/) → Docker Swarm Stack
Backend API (api/) → Docker Swarm Stack
```

### Inicializar Docker Swarm
```bash
# Se ainda não inicializou o Swarm
docker swarm init

# Criar redes
docker network create --driver overlay estacao-network
docker network create --driver overlay estacao-backend-network

# Criar volumes
docker volume create postgres_data
docker volume create redis_data
docker volume create documentos_data
```

### Deploy do Backend (API)

#### 1. Navegar para a pasta da API
```bash
cd api/
```

#### 2. Configurar Secrets
```bash
# Criar arquivo de secrets (NÃO versionar!)
nano estacao_api.env

# Conteúdo do estacao_api.env:
NODE_ENV=production
DATABASE_URL=postgresql://usuario:senha@pgbouncer:6432/estacaoterapia
REDIS_PASSWORD=senha_segura_redis
REDIS_URL=redis://:senha_segura_redis@redis:6379/1
JWT_SECRET=seu_jwt_secret
# ... outras variáveis necessárias

# Criar secret no Docker Swarm
docker secret create estacao_api_env estacao_api.env

# Remover arquivo local (por segurança)
rm estacao_api.env
```

#### 3. Executar Deploy
```bash
# Dar permissão ao script
chmod +x deploy.sh

# Executar deploy
./deploy.sh
```

O script irá:
- ✅ Gerar uma tag única (timestamp + git hash)
- ✅ Fazer backup da configuração atual
- ✅ Construir novas imagens Docker
- ✅ Atualizar o docker-stack.yml com a nova tag
- ✅ Fazer deploy no Docker Swarm (zero-downtime)
- ✅ Limpar imagens antigas (opcional)

#### 4. Verificar Deploy
```bash
# Listar serviços
docker service ls

# Ver logs de um serviço
docker service logs -f estacao-backend_api
docker service logs -f estacao-backend_socket-server

# Ver réplicas e status
docker service ps estacao-backend_api
```

### Deploy do Frontend

#### 1. Navegar para a pasta do frontend
```bash
cd estacao/
```

#### 2. Atualizar código e fazer deploy
```bash
# Dar permissão ao script
chmod +x deploy.sh

# Executar deploy (inclui git pull)
./deploy.sh
```

Ou manualmente:
```bash
# Atualizar código
git pull origin master

# Dar permissão ao deploy-stack.sh
chmod +x deploy-stack.sh

# Executar deploy
./deploy-stack.sh
```

O script irá:
- ✅ Gerar tag única
- ✅ Construir nova imagem
- ✅ Fazer deploy no Swarm
- ✅ Validar deployment
- ✅ Limpar imagens antigas

#### 3. Verificar Deploy
```bash
# Ver serviços
docker service ls | grep estacao-front

# Ver logs
docker service logs -f estacao-front_app

# Ver réplicas
docker service ps estacao-front_app
```

---

## 🛠️ Comandos Úteis

### Docker Compose (Local)
```bash
# Iniciar todos os serviços
docker-compose up -d

# Parar todos os serviços
docker-compose down

# Parar e remover volumes
docker-compose down -v

# Reconstruir e iniciar
docker-compose up -d --build

# Ver logs em tempo real
docker-compose logs -f

# Reiniciar um serviço
docker-compose restart api

# Executar comando em um container
docker-compose exec api npm run prisma:migrate
```

### Docker Swarm (Produção)
```bash
# Listar todos os serviços
docker service ls

# Ver detalhes de um serviço
docker service inspect estacao-backend_api

# Ver réplicas de um serviço
docker service ps estacao-backend_api

# Escalar um serviço
docker service scale estacao-backend_api=3

# Atualizar um serviço
docker service update --force estacao-backend_api

# Ver logs
docker service logs -f estacao-backend_api

# Remover um stack
docker stack rm estacao-backend

# Remover um serviço
docker service rm estacao-backend_api
```

### Limpeza
```bash
# Remover containers parados
docker container prune -f

# Remover imagens não utilizadas
docker image prune -a -f

# Remover volumes não utilizados
docker volume prune -f

# Limpeza completa (CUIDADO!)
docker system prune -a -f --volumes
```

---

## 🔍 Troubleshooting

### Container não inicia
```bash
# Ver logs do container
docker-compose logs api

# Ou no Swarm
docker service logs estacao-backend_api

# Ver eventos do Swarm
docker events
```

### Verificar conectividade entre containers
```bash
# Entrar em um container
docker-compose exec api sh

# Testar conexão com PostgreSQL
nc -zv postgres 5432

# Testar conexão com Redis
nc -zv redis 6379

# Verificar DNS
nslookup postgres
```

### Problemas com Migrations
```bash
# Executar migrations manualmente
docker-compose exec api npm run prisma:migrate:deploy

# Ou no Swarm (encontre o container ID primeiro)
docker ps | grep api
docker exec <container_id> npm run prisma:migrate:deploy
```

### Verificar saúde dos serviços
```bash
# PostgreSQL
docker-compose exec postgres pg_isready -U estacaoterapia

# Redis
docker-compose exec redis redis-cli -a $REDIS_PASSWORD ping

# API
curl http://localhost:3333/health
```

### Recriar um serviço do zero
```bash
# Docker Compose
docker-compose stop api
docker-compose rm -f api
docker-compose up -d api

# Docker Swarm
docker service rm estacao-backend_api
# Depois fazer novo deploy
```

### Ver uso de recursos
```bash
# Docker Compose
docker-compose stats

# Docker Swarm
docker stats $(docker ps --format "{{.Names}}" | grep estacao)
```

### Backup do Banco de Dados
```bash
# Criar backup
docker-compose exec postgres pg_dump -U estacaoterapia estacaoterapia > backup_$(date +%Y%m%d).sql

# Restaurar backup
docker-compose exec -T postgres psql -U estacaoterapia estacaoterapia < backup.sql
```

---

## 🔐 Segurança

### Checklist de Segurança
- [ ] Variáveis sensíveis estão em `.env` ou Docker Secrets
- [ ] Arquivo `.env` está no `.gitignore`
- [ ] Senhas são fortes e únicas
- [ ] CORS está configurado corretamente
- [ ] SSL/TLS está ativo (Let's Encrypt via Caddy)
- [ ] Firewall está configurado (portas 80, 443)
- [ ] Backups automáticos estão configurados
- [ ] Logs estão sendo monitorados

---

## 📝 Notas Importantes

1. **Sempre teste localmente antes de fazer deploy em produção**
2. **Faça backup do banco de dados antes de grandes mudanças**
3. **Os scripts de deploy fazem backup automático das configs**
4. **Em produção, use Docker Secrets ao invés de variáveis de ambiente**
5. **Monitore os logs após cada deploy**
6. **Tags são geradas automaticamente com timestamp + git hash**

---

## 🆘 Suporte

- Documentação completa: `/README.md`
- Arquitetura: `/ESTRUTURA-PROJETO.md`
- Configuração Caddy: `/README-CADDY.md`
- Variáveis de ambiente: `/README-ENV.md`

---

**Última atualização: Janeiro 2026**
