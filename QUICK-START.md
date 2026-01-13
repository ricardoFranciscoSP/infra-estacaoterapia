# 🚀 Guia Rápido - Estação Terapia com Caddy

## Início Rápido

### 1. Pré-requisitos

- Docker e Docker Compose instalados
- Portas 80 e 443 disponíveis
- Domínios apontando para o servidor (ou use hosts locais para testes)

### 2. Configuração Inicial

```bash
# Clone ou navegue até o diretório do projeto
cd /caminho/do/projeto

# Copie o arquivo de exemplo de variáveis de ambiente (opcional)
cp env.example .env

# Torne o script executável
chmod +x start.sh
```

### 3. Iniciar Serviços

```bash
# Opção 1: Usar o script de inicialização
./start.sh

# Opção 2: Usar Docker Compose diretamente
docker-compose up -d
```

### 4. Verificar Status

```bash
# Ver logs de todos os serviços
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f caddy
docker-compose logs -f api
docker-compose logs -f socket-server
docker-compose logs -f frontend

# Verificar status dos containers
docker-compose ps
```

## 🔧 Configuração

### Credenciais

As credenciais padrão estão configuradas no `docker-compose.yml`:

- **PostgreSQL**: 
  - Usuário: `estacaoterapia`
  - Senha: `sarFMiA2iasl1g8wWm0q79a1Bw8zsQE`
  - Database: `estacaoterapia`

- **Redis**: 
  - Senha: `REdnRHkZLnQpK1rcoKsseO3pX4GNIRR`

### Usar Docker Secrets (Recomendado para Produção)

```bash
# Criar secrets
echo "estacaoterapia" | docker secret create postgres_user -
echo "sarFMiA2iasl1g8wWm0q79a1Bw8zsQE" | docker secret create postgres_password -
echo "REdnRHkZLnQpK1rcoKsseO3pX4GNIRR" | docker secret create redis_password -

# Usar docker-compose.production.yml
docker stack deploy -c docker-compose.production.yml estacao
```

## 🌐 URLs e Portas

### Serviços Internos (Docker Network)

- **PostgreSQL**: `postgres:5432`
- **Redis**: `redis:6379`
- **PgBouncer**: `pgbouncer:6432`
- **API**: `api:3333`
- **Socket**: `socket-server:3334`
- **Frontend**: `frontend:3001`

### URLs Públicas (via Caddy)

- **Frontend**: `https://estacaoterapia.com.br`
- **API**: `https://api-prd.estacaoterapia.com.br`
- **WebSocket**: `https://ws.prd.estacaoterapia.com.br`

## 🔍 Troubleshooting

### Caddy não obtém certificado SSL

```bash
# Verifique os logs do Caddy
docker-compose logs caddy | grep -i certificate

# Verifique se as portas 80 e 443 estão abertas
sudo netstat -tulpn | grep -E ':(80|443)'

# Verifique se o domínio aponta para o servidor
nslookup estacaoterapia.com.br
```

### Serviços não se comunicam

```bash
# Verifique a rede Docker
docker network inspect estacao-network

# Teste conectividade entre containers
docker-compose exec api ping redis
docker-compose exec api ping postgres
```

### PostgreSQL não inicia

```bash
# Verifique os logs
docker-compose logs postgres

# Verifique permissões do volume
docker volume inspect postgres_data

# Remova e recrie o volume (CUIDADO: apaga dados!)
docker-compose down -v
docker volume rm postgres_data
```

### Redis não inicia

```bash
# Verifique os logs
docker-compose logs redis

# Teste conexão
docker-compose exec redis redis-cli -a REdnRHkZLnQpK1rcoKsseO3pX4GNIRR ping
```

## 🛑 Parar Serviços

```bash
# Parar todos os serviços
docker-compose down

# Parar e remover volumes (CUIDADO: apaga dados!)
docker-compose down -v
```

## 📊 Monitoramento

### Health Checks

```bash
# API
curl https://api-prd.estacaoterapia.com.br/health

# WebSocket
curl https://ws.prd.estacaoterapia.com.br/health

# Frontend
curl https://estacaoterapia.com.br/
```

### Métricas

```bash
# Uso de recursos
docker stats

# Espaço em disco
docker system df

# Logs do sistema
docker-compose logs --tail=100
```

## 🔄 Atualizar Serviços

```bash
# Rebuild e reiniciar um serviço específico
docker-compose up -d --build api

# Rebuild e reiniciar todos os serviços
docker-compose up -d --build

# Atualizar apenas imagens
docker-compose pull
docker-compose up -d
```

## 📚 Documentação Adicional

- [README-CADDY.md](./README-CADDY.md) - Documentação completa
- [Caddyfile](./Caddyfile) - Configuração do Caddy
- [docker-compose.yml](./docker-compose.yml) - Configuração dos serviços

## 🆘 Suporte

Para problemas ou dúvidas:
1. Verifique os logs: `docker-compose logs`
2. Consulte a documentação: [README-CADDY.md](./README-CADDY.md)
3. Verifique a configuração do Caddy: `docker-compose exec caddy caddy validate --config /etc/caddy/Caddyfile`
