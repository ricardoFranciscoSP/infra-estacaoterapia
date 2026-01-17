# API Backend - Estação Terapia

Backend Node.js com Express, Prisma, Redis e Socket.IO.

## 🏗️ Estrutura

```
api/
├── src/
│   ├── controllers/     # Controllers das rotas
│   ├── services/        # Lógica de negócio
│   ├── routes/          # Definição de rotas
│   ├── middlewares/      # Middlewares (auth, CORS, security)
│   ├── socket/          # Servidor WebSocket
│   ├── prisma/          # Cliente Prisma
│   └── utils/           # Utilitários
├── prisma/
│   └── schema.prisma    # Schema do banco de dados
├── Dockerfile.api        # Build da API
├── Dockerfile.socket     # Build do WebSocket
└── docker-stack.yml      # Configuração Docker Swarm
```

## 🚀 Desenvolvimento

```bash
# Instalar dependências
yarn install

# Executar migrations
yarn prisma migrate dev

# Desenvolvimento
yarn dev

# Build
yarn build

# Produção
yarn start
```

## 🔧 Variáveis de Ambiente

Veja `../env.example` para lista completa.

Principais:
- `POSTGRES_PASSWORD` - Senha do PostgreSQL
- `REDIS_PASSWORD` - Senha do Redis
- `NODE_ENV` - Ambiente (production/development)
- `RECAPTCHA_SECRET_KEY` - Secret key do reCAPTCHA

## 🐳 Docker

### Build

```bash
# API
docker build -f Dockerfile.api -t estacaoterapia-api:latest .

# Socket
docker build -f Dockerfile.socket -t estacaoterapia-socket:latest .
```

### Docker Compose

Use o `docker-compose.yml` na raiz do projeto.

### Docker Swarm

```bash
docker stack deploy -c docker-stack.yml estacao-api
```

## 📚 Documentação

- Prisma: `prisma/schema.prisma`
- Rotas: `src/routes/`
- Controllers: `src/controllers/`
