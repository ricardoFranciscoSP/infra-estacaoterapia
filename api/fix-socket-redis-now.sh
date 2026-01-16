#!/bin/bash
# Script para corrigir autenticação Redis do socket-server
set -e

echo "======================================"
echo "🔧 Fix Socket Redis Connection"
echo "======================================"
echo ""

# Senha correta do Redis
REDIS_PASSWORD="REdnRHkZLnQpK1rcoKsseO3pX4GNIRR"

# 1. Verificar senha do Redis
echo "1️⃣ Verificando senha do Redis..."
echo "   Senha: ${REDIS_PASSWORD:0:5}...${REDIS_PASSWORD: -5}"
echo "   Tamanho: ${#REDIS_PASSWORD} caracteres"
echo ""

# 2. Atualizar secret redis_password
echo "2️⃣ Atualizando secret redis_password..."

# Verificar se já existe
if docker secret inspect redis_password >/dev/null 2>&1; then
  echo "   ℹ️  Secret redis_password já existe"
  echo "   🔧 Removendo para recriar com senha correta..."
  docker secret rm redis_password
  echo "   ✅ Secret antigo removido"
fi

# Criar secret com senha correta
echo "   📝 Criando secret redis_password..."
echo -n "$REDIS_PASSWORD" | docker secret create redis_password -
echo "   ✅ Secret redis_password criado (${#REDIS_PASSWORD} chars)"
echo ""

# 3. Atualizar secret estacao_socket_env
echo "3️⃣ Atualizando secret estacao_socket_env..."

# Criar arquivo temporário com o conteúdo
TEMP_FILE=$(mktemp)
cat > "$TEMP_FILE" << 'EOF'
NODE_ENV=production

POSTGRES_USER=estacaoterapia
POSTGRES_PASSWORD=sarFMiA2iasl1g8wWm0q79a1Bw8zsQE
POSTGRES_DB=estacaoterapia

PG_HOST=pgbouncer
PG_PORT=6432

CORS_ORIGIN=https://estacaoterapia.com.br,https://www.estacaoterapia.com.br

# ======================
# Redis
# ======================
REDIS_HOST=estacaoterapia_redis
REDIS_PORT=6379
REDIS_DB=1
REDIS_PASSWORD=REdnRHkZLnQpK1rcoKsseO3pX4GNIRR
REDIS_URL=redis://:REdnRHkZLnQpK1rcoKsseO3pX4GNIRR@estacaoterapia_redis:6379/1

JWT_SECRET=b870ab13da5ae2e43eec79e3778f801690b36c2931f64a70eea32e016fd3843a
EOF

# Remover secret antigo se existir
if docker secret inspect estacao_socket_env >/dev/null 2>&1; then
  echo "   🔧 Removendo secret antigo..."
  docker secret rm estacao_socket_env
fi

# Criar novo secret
echo "   📝 Criando novo secret..."
docker secret create estacao_socket_env "$TEMP_FILE"
rm -f "$TEMP_FILE"

echo "   ✅ Secret estacao_socket_env atualizado"
echo ""

# 4. Reiniciar serviços na ordem correta
echo "4️⃣ Reiniciando serviços..."
echo ""

echo "   🔄 1/3 - Redis (aguardar ele ficar pronto primeiro)..."
docker service update --force estacaoterapia_redis
echo "   ⏳ Aguardando 15 segundos para Redis estabilizar..."
sleep 15

echo ""
echo "   🔄 2/3 - API..."
docker service update --force estacaoterapia_api
echo "   ⏳ Aguardando 10 segundos para API estabilizar..."
sleep 10

echo ""
echo "   🔄 3/3 - Socket Server..."
docker service update --force estacaoterapia_socket-server

echo ""
echo "   ⏳ Aguardando 15 segundos para Socket estabilizar..."
sleep 15

echo ""
echo "======================================"
echo "✅ Correção Concluída!"
echo "======================================"
echo ""

# 5. Verificar status
echo "📊 Status dos serviços:"
docker service ls --format "table {{.Name}}\t{{.Replicas}}\t{{.Image}}" | grep -E "NAME|estacaoterapia"

echo ""
echo "🔍 Verificando secrets criados:"
docker secret ls | grep -E "NAME|redis_password|estacao_socket_env"

echo ""
echo "======================================"
echo "📋 Próximos Passos"
echo "======================================"
echo ""
echo "1. Verificar logs do Redis:"
echo "   docker service logs estacaoterapia_redis --tail 30"
echo ""
echo "2. Verificar logs do Socket Server:"
echo "   docker service logs estacaoterapia_socket-server --tail 50 -f"
echo ""
echo "3. Procurar por:"
echo "   ✅ 🔐 Senha Redis carregada do secret docker (39 chars)"
echo "   ✅ REDIS_PASSWORD primeiros 5 chars: REdnR..."
echo "   ✅ [IORedis] Status: READY"
echo "   ✅ Redis disponível e ping confirmado!"
echo ""
echo "4. Teste de conexão manual (dentro do container Redis):"
echo "   docker exec \$(docker ps -q -f name=estacaoterapia_redis) redis-cli -a 'REdnRHkZLnQpK1rcoKsseO3pX4GNIRR' ping"
echo "   Resposta esperada: PONG"
echo ""
