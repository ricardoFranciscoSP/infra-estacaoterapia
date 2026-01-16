#!/bin/bash
set -e

echo "======================================"
echo "🔧 Fix Socket Server - Redis Password"
echo "======================================"
echo ""

# =========================
# Configuração
# =========================
SECRETS_DIR="/opt/secrets"
REDIS_PASSWORD="REdnRHkZLnQpK1rcoKsseO3pX4GNIRR"

# =========================
# 1. Verificar arquivos
# =========================
echo "📋 Verificando arquivos em $SECRETS_DIR..."

if [ ! -f "$SECRETS_DIR/estacao_api.env" ]; then
  echo "❌ Arquivo não encontrado: $SECRETS_DIR/estacao_api.env"
  exit 1
fi

echo "✅ estacao_api.env encontrado"

# =========================
# 2. Criar/Atualizar estacao_socket.env
# =========================
if [ ! -f "$SECRETS_DIR/estacao_socket.env" ]; then
  echo "⚠️  estacao_socket.env NÃO EXISTE, criando..."
  
  # Copiar do API como base
  cp "$SECRETS_DIR/estacao_api.env" "$SECRETS_DIR/estacao_socket.env"
  
  # Adicionar variáveis específicas do socket
  cat >> "$SECRETS_DIR/estacao_socket.env" << 'EOF'

# ======================
# Socket Server Specific
# ======================
PORT=3334
SOCKET_SERVER=true
SERVER_TYPE=socket
API_BASE_URL=http://estacaoterapia_api:3333
EOF
  
  echo "✅ estacao_socket.env criado"
else
  echo "✅ estacao_socket.env já existe"
fi

# =========================
# 3. Garantir senha correta nos arquivos
# =========================
echo ""
echo "🔐 Sincronizando senha do Redis..."

for file in estacao_api.env estacao_socket.env; do
  filepath="$SECRETS_DIR/$file"
  
  if ! grep -q "^REDIS_PASSWORD=" "$filepath"; then
    echo "   ➕ Adicionando REDIS_PASSWORD em $file"
    echo "REDIS_PASSWORD=$REDIS_PASSWORD" >> "$filepath"
  else
    echo "   🔄 Atualizando REDIS_PASSWORD em $file"
    sed -i "s|^REDIS_PASSWORD=.*|REDIS_PASSWORD=$REDIS_PASSWORD|" "$filepath"
  fi
  
  if ! grep -q "^REDIS_URL=" "$filepath"; then
    echo "   ➕ Adicionando REDIS_URL em $file"
    echo "REDIS_URL=redis://:${REDIS_PASSWORD}@estacaoterapia_redis:6379/1" >> "$filepath"
  else
    echo "   🔄 Atualizando REDIS_URL em $file"
    sed -i "s|^REDIS_URL=.*|REDIS_URL=redis://:${REDIS_PASSWORD}@estacaoterapia_redis:6379/1|" "$filepath"
  fi
done

echo "✅ Senha sincronizada nos arquivos"

# =========================
# 4. Recriar secrets no Docker Swarm
# =========================
echo ""
echo "🐳 Recriando secrets no Docker Swarm..."

# Remover secrets antigos
for secret in estacao_socket_env redis_password; do
  if docker secret inspect "$secret" >/dev/null 2>&1; then
    echo "   🗑️  Removendo secret: $secret"
    docker secret rm "$secret" || {
      echo "   ⚠️  Não foi possível remover $secret (pode estar em uso)"
      echo "   Será necessário parar os serviços primeiro"
    }
  fi
done

# Aguardar um momento
sleep 2

# Criar novos secrets
echo "   ➕ Criando secret: estacao_socket_env"
docker secret create estacao_socket_env "$SECRETS_DIR/estacao_socket.env"

echo "   ➕ Criando secret: redis_password"
echo -n "$REDIS_PASSWORD" | docker secret create redis_password -

echo "✅ Secrets recriados"

# =========================
# 5. Reiniciar serviços
# =========================
echo ""
echo "🔄 Reiniciando serviços..."
echo ""

services=(
  "estacaoterapia_redis"
  "estacaoterapia_api"
  "estacaoterapia_socket-server"
)

for service in "${services[@]}"; do
  if docker service ls --format '{{.Name}}' | grep -q "^$service$"; then
    echo "   🔄 Reiniciando: $service"
    docker service update --force "$service"
    
    echo "   ⏳ Aguardando 15 segundos..."
    sleep 15
    
    # Verificar status
    replicas=$(docker service ls --format '{{.Replicas}}' --filter name="$service")
    echo "   📊 Status: $replicas"
  else
    echo "   ⚠️  Serviço não encontrado: $service"
  fi
  echo ""
done

# =========================
# 6. Verificar logs
# =========================
echo ""
echo "======================================"
echo "✅ Correção Concluída"
echo "======================================"
echo ""
echo "📋 Verificando logs do Socket Server..."
echo ""

docker service logs estacaoterapia_socket-server --tail 30

echo ""
echo "======================================"
echo "🎯 Próximos Passos"
echo "======================================"
echo ""
echo "1. Verifique se o Socket Server conectou ao Redis:"
echo "   docker service logs estacaoterapia_socket-server --tail 50 | grep -i redis"
echo ""
echo "2. Verifique o status dos serviços:"
echo "   docker service ls"
echo ""
echo "3. Se ainda houver problemas, verifique os logs do Redis:"
echo "   docker service logs estacaoterapia_redis --tail 50"
echo ""
