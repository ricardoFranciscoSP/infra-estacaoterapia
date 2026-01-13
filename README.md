# 🏥 Estação Terapia

Sistema completo de gestão de terapia online com videochamadas, agendamento e pagamentos.

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────┐
│           Caddy (Reverse Proxy)        │
│         SSL Automático (Let's Encrypt)  │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
┌───▼───┐ ┌───▼───┐ ┌───▼──────┐
│Frontend│ │  API  │ │ WebSocket│
│Next.js │ │ Node  │ │ Socket.IO│
└───┬───┘ └───┬───┘ └───┬──────┘
    │          │          │
    └──────────┼──────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
┌───▼───┐ ┌───▼───┐ ┌───▼───┐
│PostgreSQL│ │ Redis │ │PgBouncer│
│   16    │ │   7   │ │ Pooler │
└─────────┘ └───────┘ └────────┘
```

## 🚀 Início Rápido

### Pré-requisitos

- Docker e Docker Compose instalados
- Portas 80 e 443 disponíveis
- Domínios configurados (ou use hosts locais para testes)

### Configuração

1. **Criar arquivo `.env`**:

```bash
cp env.example .env
```

2. **Editar `.env` com valores reais**:

```env
POSTGRES_PASSWORD=sua_senha_postgres
REDIS_PASSWORD=sua_senha_redis
```

3. **Iniciar serviços**:

```bash
docker-compose up -d
```

4. **Verificar status**:

```bash
docker-compose ps
docker-compose logs -f
```

## 📁 Estrutura do Projeto

```
.
├── api/                    # Backend Node.js + Express
│   ├── src/               # Código-fonte
│   ├── prisma/            # Schema do banco de dados
│   ├── Dockerfile.api     # Build da API
│   └── Dockerfile.socket  # Build do WebSocket
│
├── estacao/               # Frontend Next.js
│   ├── src/              # Código-fonte
│   ├── public/            # Assets estáticos
│   └── Dockerfile         # Build do Frontend
│
├── docker-compose.yml     # Stack completa (Docker Compose)
├── Caddyfile             # Configuração do Caddy
├── .env                  # Variáveis de ambiente (não versionado)
└── env.example           # Template de variáveis
```

## 🔧 Serviços

### Frontend (Next.js)
- **URL**: `https://estacaoterapia.com.br`
- **Porta interna**: `3001`
- **Health**: `https://estacaoterapia.com.br/`

### API Backend
- **URL**: `https://api-prd.estacaoterapia.com.br`
- **Porta interna**: `3333`
- **Health**: `https://api-prd.estacaoterapia.com.br/health`

### WebSocket Server
- **URL**: `https://ws.prd.estacaoterapia.com.br`
- **Porta interna**: `3334`
- **Health**: `https://ws.prd.estacaoterapia.com.br/health`

### PostgreSQL
- **Porta interna**: `5432`
- **Pooler**: PgBouncer na porta `6432`

### Redis
- **Porta interna**: `6379`
- **Autenticação**: Habilitada

## 🔒 Segurança

- ✅ SSL/TLS automático via Caddy
- ✅ Rate limiting configurado
- ✅ Security headers (Helmet.js)
- ✅ CORS restritivo
- ✅ Senhas em arquivo `.env` (não versionado)
- ✅ Validação de input (Zod)
- ✅ Logs seguros (sem exposição de senhas)

## 📚 Documentação

- [README-CADDY.md](./README-CADDY.md) - Configuração do Caddy
- [QUICK-START.md](./QUICK-START.md) - Guia rápido
- [SETUP-ENV.md](./SETUP-ENV.md) - Configuração de variáveis
- [SECURITY-AUDIT.md](./SECURITY-AUDIT.md) - Auditoria de segurança

## 🛠️ Comandos Úteis

```bash
# Iniciar todos os serviços
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar serviços
docker-compose down

# Rebuild e reiniciar
docker-compose up -d --build

# Verificar configuração
docker-compose config

# Acessar container
docker-compose exec api sh
docker-compose exec postgres psql -U estacaoterapia -d estacaoterapia
```

## 🔄 Deploy

### Docker Compose (Recomendado)

```bash
docker-compose up -d
```

### Docker Swarm

```bash
# Criar secrets
echo "senha" | docker secret create postgres_password -
echo "senha" | docker secret create redis_password -

# Deploy
docker stack deploy -c api/docker-stack.yml estacao-api
docker stack deploy -c estacao/docker-stack.yml estacao-frontend
docker stack deploy -c docker-compose.caddy.yml estacao-caddy
```

## 📝 Variáveis de Ambiente

Veja `env.example` para lista completa de variáveis necessárias.

**Importante**: Nunca commite o arquivo `.env` no Git!

## 🐛 Troubleshooting

### Serviços não iniciam

```bash
# Verificar logs
docker-compose logs

# Verificar variáveis
docker-compose config

# Verificar rede
docker network inspect estacao-network
```

### Caddy não obtém SSL

```bash
# Verificar logs do Caddy
docker-compose logs caddy

# Verificar portas
netstat -tulpn | grep -E ':(80|443)'
```

### Banco de dados não conecta

```bash
# Testar conexão
docker-compose exec api sh
# Dentro do container:
nc -z postgres 5432
nc -z pgbouncer 6432
```

## 📞 Suporte

Para problemas ou dúvidas:
1. Consulte a documentação em `./docs/`
2. Verifique os logs: `docker-compose logs`
3. Consulte `SECURITY-AUDIT.md` para questões de segurança

## 📄 Licença

MIT

---

**Versão**: 2.0  
**Última atualização**: 2024
