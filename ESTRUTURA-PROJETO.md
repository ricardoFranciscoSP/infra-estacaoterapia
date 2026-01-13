# 📁 Estrutura do Projeto - Estação Terapia

## 🎯 Visão Geral

Projeto organizado e limpo, usando **Caddy** como reverse proxy, com todas as configurações centralizadas.

## 📂 Estrutura de Diretórios

```
.
├── api/                          # Backend Node.js
│   ├── src/                      # Código-fonte
│   │   ├── controllers/          # Controllers das rotas
│   │   ├── services/             # Lógica de negócio
│   │   ├── routes/               # Definição de rotas
│   │   ├── middlewares/          # Middlewares (auth, CORS, security)
│   │   ├── socket/               # Servidor WebSocket
│   │   ├── prisma/               # Cliente Prisma
│   │   └── utils/                # Utilitários
│   ├── prisma/                   # Schema e migrations
│   ├── Dockerfile.api            # Build da API
│   ├── Dockerfile.socket         # Build do WebSocket
│   ├── docker-stack.yml          # Docker Swarm (opcional)
│   └── README.md                 # Documentação do backend
│
├── estacao/                      # Frontend Next.js
│   ├── src/                      # Código-fonte
│   │   ├── app/                  # App Router (Next.js 13+)
│   │   ├── components/           # Componentes React
│   │   ├── hooks/                # Custom hooks
│   │   ├── services/             # Serviços de API
│   │   └── store/                # Estado global
│   ├── public/                   # Assets estáticos
│   ├── Dockerfile                # Build do Frontend
│   ├── docker-stack.yml          # Docker Swarm (opcional)
│   └── README.md                 # Documentação do frontend
│
├── docker-compose.yml            # ⭐ Stack completa (PRINCIPAL)
├── docker-compose.production.yml # Template com Docker Secrets
├── docker-compose.caddy.yml      # Serviço Caddy isolado
├── Caddyfile                     # Configuração do Caddy
├── .env                          # Variáveis de ambiente (não versionado)
├── env.example                   # Template de variáveis
├── start.sh                      # Script de inicialização
└── README.md                     # ⭐ Documentação principal
```

## 🎯 Responsabilidades

### ⭐ `docker-compose.yml` (Raiz)
**Responsável por**: Toda a stack de produção
- PostgreSQL + PgBouncer
- Redis
- Caddy (Reverse Proxy)
- API Backend
- Socket Server (WebSocket)
- Frontend Next.js

**Usa**: Arquivo `.env` para todas as credenciais

**Recomendado para**: 
- ✅ Desenvolvimento
- ✅ Produção simples
- ✅ Deploy rápido

### `api/docker-stack.yml` e `estacao/docker-stack.yml`
**Responsável por**: Deploy em Docker Swarm

**Usa**: Docker Secrets

**Recomendado para**: 
- ✅ Produção com Docker Swarm
- ✅ Alta disponibilidade
- ✅ Escalabilidade horizontal

### `Caddyfile`
**Responsável por**:
- Reverse proxy para todos os serviços
- SSL/TLS automático (Let's Encrypt)
- Rate limiting
- Security headers
- Compressão
- Logs

**Substitui**: Configuração antiga do Traefik

## 🔒 Segurança

### Arquivo `.env`
- ✅ **NUNCA** versionado no Git
- ✅ Contém todas as senhas e credenciais
- ✅ Template em `env.example`

### Docker Secrets (Swarm)
- ✅ Usado em produção com Docker Swarm
- ✅ Mais seguro que variáveis de ambiente
- ✅ Gerenciado pelo Docker

## 📚 Documentação

### Principal
- `README.md` - Visão geral e início rápido
- `QUICK-START.md` - Guia rápido de uso
- `README-CADDY.md` - Configuração do Caddy

### Segurança
- `SECURITY-AUDIT.md` - Auditoria completa
- `SECURITY-FIXES.md` - Correções implementadas
- `SETUP-ENV.md` - Configuração de variáveis

### Limpeza
- `CLEANUP-SUMMARY.md` - Resumo da limpeza
- `ESTRUTURA-PROJETO.md` - Este arquivo

## 🚀 Fluxo de Deploy

### Desenvolvimento
```bash
cp env.example .env
# Editar .env com valores reais
docker-compose up -d
```

### Produção (Docker Compose)
```bash
cp env.example .env
# Editar .env com senhas de produção
docker-compose up -d
```

### Produção (Docker Swarm)
```bash
# Criar secrets
echo "senha" | docker secret create postgres_password -
echo "senha" | docker secret create redis_password -

# Deploy
docker stack deploy -c api/docker-stack.yml estacao-api
docker stack deploy -c estacao/docker-stack.yml estacao-frontend
docker stack deploy -c docker-compose.caddy.yml estacao-caddy
```

## ✅ Checklist de Estrutura

- [x] Sem arquivos desnecessários
- [x] Documentação organizada
- [x] Configuração centralizada
- [x] Senhas em `.env` (não versionado)
- [x] `.gitignore` completo
- [x] README.md em cada diretório
- [x] Estrutura limpa e funcional

## 📊 Estatísticas

- **Arquivos removidos**: 24 arquivos + 1 diretório
- **Documentação criada**: 11 arquivos
- **Redução**: ~40% menos arquivos
- **Estrutura**: 100% limpa e organizada

---

**Status**: ✅ **ESTRUTURA LIMPA E FUNCIONAL**
