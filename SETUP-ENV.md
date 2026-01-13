# 🔐 Configuração de Variáveis de Ambiente

## ⚠️ IMPORTANTE - Segurança

**NUNCA** commite o arquivo `.env` no Git! Ele contém senhas e credenciais sensíveis.

## 📋 Passo a Passo

### 1. Criar arquivo .env

```bash
# Copie o arquivo de exemplo
cp env.example .env

# Ou use o template
cp .env.template .env
```

### 2. Editar o arquivo .env

Abra o arquivo `.env` e preencha **TODAS** as variáveis com os valores reais:

```bash
# Use seu editor preferido
nano .env
# ou
code .env
# ou
notepad .env
```

### 3. Variáveis Obrigatórias

Certifique-se de preencher:

- ✅ `POSTGRES_PASSWORD` - Senha do PostgreSQL
- ✅ `REDIS_PASSWORD` - Senha do Redis
- ✅ `POSTGRES_USER` - Usuário do PostgreSQL (padrão: estacaoterapia)
- ✅ `POSTGRES_DB` - Nome do banco (padrão: estacaoterapia)

### 4. Verificar .gitignore

Certifique-se de que o arquivo `.gitignore` contém:

```
.env
.env.local
.env.production
.env.*.local
```

## 🔒 Valores de Produção

Para produção, use as senhas fornecidas:

```env
POSTGRES_USER=estacaoterapia
POSTGRES_PASSWORD=sarFMiA2iasl1g8wWm0q79a1Bw8zsQE
POSTGRES_DB=estacaoterapia

REDIS_PASSWORD=REdnRHkZLnQpK1rcoKsseO3pX4GNIRR
```

## 🐳 Docker Compose

O `docker-compose.yml` agora lê automaticamente do arquivo `.env`:

```bash
# Iniciar serviços (lê .env automaticamente)
docker-compose up -d
```

## 🐳 Docker Swarm

Para Docker Swarm, use Docker Secrets:

```bash
# Criar secrets
echo "sarFMiA2iasl1g8wWm0q79a1Bw8zsQE" | docker secret create postgres_password -
echo "REdnRHkZLnQpK1rcoKsseO3pX4GNIRR" | docker secret create redis_password -

# Deploy
docker stack deploy -c api/docker-stack.yml estacao-api
```

## ✅ Verificação

Após configurar, verifique se as variáveis estão sendo lidas:

```bash
# Verificar variáveis do .env
docker-compose config

# Testar conexão
docker-compose exec api env | grep -E "POSTGRES|REDIS"
```

## 🚨 Troubleshooting

### Erro: "Variable not set"

Se você ver erros sobre variáveis não definidas:

1. Verifique se o arquivo `.env` existe
2. Verifique se todas as variáveis obrigatórias estão preenchidas
3. Verifique se não há espaços extras nas linhas do `.env`

### Erro: "Permission denied"

```bash
# Dar permissão de leitura ao .env
chmod 600 .env
```

### Variáveis não estão sendo lidas

```bash
# Verificar se o arquivo está no diretório correto
ls -la .env

# Verificar sintaxe (sem espaços ao redor do =)
cat .env | grep -v "^#" | grep "="
```

## 📝 Exemplo Completo

```env
# PostgreSQL
POSTGRES_USER=estacaoterapia
POSTGRES_PASSWORD=sua_senha_segura_aqui
POSTGRES_DB=estacaoterapia
PG_HOST=pgbouncer
PG_PORT=6432

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=1
REDIS_PASSWORD=sua_senha_redis_aqui

# API
NODE_ENV=production
PORT=3333
API_BASE_URL=http://api:3333

# Socket
SOCKET_PORT=3334
CORS_ORIGIN=https://estacaoterapia.com.br,https://www.estacaoterapia.com.br

# Frontend
NEXT_PUBLIC_API_URL=https://api-prd.estacaoterapia.com.br
NEXT_PUBLIC_WEBSITE_URL=https://estacaoterapia.com.br
NEXT_PUBLIC_SOCKET_URL=https://ws.prd.estacaoterapia.com.br

# Caddy
CADDY_EMAIL=contato@estacaoterapia.com.br
```

## 🔄 Atualizar Senhas

Se precisar atualizar senhas:

1. Edite o arquivo `.env`
2. Reinicie os serviços:

```bash
docker-compose down
docker-compose up -d
```

## 📚 Referências

- [Docker Compose - Environment Variables](https://docs.docker.com/compose/environment-variables/)
- [Docker Secrets](https://docs.docker.com/engine/swarm/secrets/)
