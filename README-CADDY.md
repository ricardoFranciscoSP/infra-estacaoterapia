# Estação Terapia - Configuração com Caddy

Este projeto foi migrado para usar **Caddy** como reverse proxy, substituindo o Traefik. A configuração inclui PostgreSQL, Redis, WebSocket e todos os serviços necessários.

## 🏗️ Arquitetura

```
Internet
   ↓
Caddy (Reverse Proxy + SSL)
   ├──→ Frontend (Next.js) - estacaoterapia.com.br
   ├──→ API Backend - api-prd.estacaoterapia.com.br
   └──→ WebSocket Server - ws.prd.estacaoterapia.com.br
         ↓
   PostgreSQL (via PgBouncer)
   Redis
```

## 📋 Serviços

### 1. **PostgreSQL**
- **Imagem**: `postgres:16-alpine`
- **Usuário**: `estacaoterapia`
- **Senha**: Configurada via variável de ambiente
- **Database**: `estacaoterapia`
- **Porta interna**: `5432`
- **Connection Pooler**: PgBouncer na porta `6432`

### 2. **Redis**
- **Imagem**: `redis:7-alpine`
- **Senha**: Configurada via variável de ambiente
- **Porta**: `6379`
- **Persistência**: AOF habilitado
- **Max Memory**: 512MB

### 3. **PgBouncer**
- **Imagem**: `edoburu/pgbouncer:latest`
- **Porta**: `6432`
- **Pool Mode**: Transaction
- **Max Connections**: 1000

### 4. **Caddy**
- **Imagem**: `caddy:2-alpine`
- **Portas**: `80` (HTTP), `443` (HTTPS)
- **SSL**: Automático via Let's Encrypt
- **Configuração**: `Caddyfile`

### 5. **API Backend**
- **Porta interna**: `3333`
- **Health Check**: `/health`
- **Rate Limit**: 100 req/min

### 6. **Socket Server (WebSocket)**
- **Porta interna**: `3334`
- **Health Check**: `/health`
- **Rate Limit**: 500 req/min
- **Path**: `/socket.io`

### 7. **Frontend (Next.js)**
- **Porta interna**: `3001`
- **Health Check**: `/`

## 🚀 Como Usar

### Opção 1: Docker Compose (Recomendado)

```bash
# 1. Copie o arquivo de exemplo
cp .env.example .env

# 2. Ajuste as variáveis de ambiente se necessário
nano .env

# 3. Inicie todos os serviços
docker-compose up -d

# 4. Verifique os logs
docker-compose logs -f caddy
docker-compose logs -f api
docker-compose logs -f socket-server
docker-compose logs -f frontend
```

### Opção 2: Docker Swarm

```bash
# 1. Crie a rede
docker network create --driver overlay estacao-network

# 2. Crie os volumes
docker volume create caddy_data
docker volume create caddy_config

# 3. Deploy dos serviços
docker stack deploy -c api/docker-stack.yml estacao-api
docker stack deploy -c estacao/docker-stack.yml estacao-frontend
docker stack deploy -c docker-compose.caddy.yml estacao-caddy
```

## 🔒 Segurança

### Credenciais

As credenciais estão configuradas nos arquivos:
- **PostgreSQL**: `docker-compose.yml` (variáveis de ambiente)
- **Redis**: `docker-compose.yml` (variáveis de ambiente)

**⚠️ IMPORTANTE**: Em produção, use Docker Secrets ou variáveis de ambiente externas.

### Headers de Segurança

O Caddy configura automaticamente:
- `Strict-Transport-Security` (HSTS)
- `X-Content-Type-Options`
- `X-Frame-Options`
- `X-XSS-Protection`
- `Referrer-Policy`
- `Content-Security-Policy` (Frontend)

### SSL/TLS

O Caddy obtém certificados SSL automaticamente via Let's Encrypt:
- Renovação automática
- Suporte a HTTP/2 e HTTP/3
- Redirecionamento HTTP → HTTPS

## 📝 Configuração do Caddy

O arquivo `Caddyfile` contém toda a configuração do reverse proxy:

- **API**: `api-prd.estacaoterapia.com.br`
- **WebSocket**: `ws.prd.estacaoterapia.com.br`
- **Frontend**: `estacaoterapia.com.br`, `www.estacaoterapia.com.br`

### Recursos Configurados

- ✅ Rate Limiting
- ✅ Compressão (gzip, zstd)
- ✅ Health Checks
- ✅ WebSocket Support
- ✅ CORS
- ✅ Security Headers
- ✅ Logs rotativos

## 🔍 Monitoramento

### Health Checks

```bash
# API
curl https://api-prd.estacaoterapia.com.br/health

# WebSocket
curl https://ws.prd.estacaoterapia.com.br/health

# Frontend
curl https://estacaoterapia.com.br/
```

### Logs

```bash
# Caddy
docker-compose logs -f caddy

# Todos os serviços
docker-compose logs -f

# Serviço específico
docker-compose logs -f api
docker-compose logs -f socket-server
docker-compose logs -f frontend
```

## 🛠️ Troubleshooting

### Caddy não inicia

```bash
# Verifique a sintaxe do Caddyfile
docker run --rm -v $(pwd)/Caddyfile:/etc/caddy/Caddyfile caddy:2-alpine caddy validate --config /etc/caddy/Caddyfile
```

### Serviços não se comunicam

```bash
# Verifique a rede
docker network inspect estacao-network

# Teste conectividade
docker-compose exec api ping redis
docker-compose exec api ping postgres
```

### SSL não funciona

```bash
# Verifique os logs do Caddy
docker-compose logs caddy | grep -i certificate

# Verifique se as portas 80 e 443 estão abertas
sudo netstat -tulpn | grep -E ':(80|443)'
```

## 📚 Recursos

- [Caddy Documentation](https://caddyserver.com/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

## 🔄 Migração do Traefik

Se você estava usando Traefik anteriormente:

1. ✅ Remova os labels do Traefik dos `docker-stack.yml`
2. ✅ Configure o `Caddyfile` com os mesmos domínios
3. ✅ Certifique-se de que as portas 80 e 443 estão abertas
4. ✅ O Caddy obterá novos certificados SSL automaticamente

## 📞 Suporte

Para problemas ou dúvidas, consulte:
- Logs dos serviços: `docker-compose logs`
- Documentação do Caddy: https://caddyserver.com/docs/
- Issues do projeto
