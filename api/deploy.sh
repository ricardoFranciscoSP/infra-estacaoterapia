#!/bin/bash
set -euo pipefail

export LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SECRETS_DIR="/opt/secrets"
STACK_NAME="estacaoterapia"

echo "🚀 [DEPLOY] Estação Terapia Swarm - $(date)"
echo "======================================"

# ==============================
# CONFIG + TAG
# ==============================
TIMESTAMP=$(date +%Y%m%d%H%M%S)
GIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "local")
TAG="${TIMESTAMP}-${GIT_HASH}"
BACKUP_FILE="docker-stack.yml.backup-${TIMESTAMP}"

echo "📦 Tag: prd-$TAG | Git: $GIT_HASH | Clean: ${CLEAN_DEPLOY:-false}"

# ==============================
# 1. PREREQUISITOS
# ==============================
echo "🔍 [VALIDAÇÃO] Pre-requisitos..."

command -v docker >/dev/null || { echo "❌ Docker não encontrado"; exit 1; }

# Swarm check - melhorada para detectar corretamente
SWARM_STATUS=$(docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null || echo "inactive")
if [ "$SWARM_STATUS" != "active" ]; then
  echo "❌ Swarm inativo (Status: $SWARM_STATUS). Execute: docker swarm init"
  exit 1
fi
echo "✅ Swarm ativo"

[ -f "docker-stack.yml" ] || { echo "❌ docker-stack.yml não encontrado"; exit 1; }

# Secrets obrigatórios
for secret in postgres.env estacao_api.env estacao_socket.env; do
  [ -f "$SECRETS_DIR/$secret" ] || {
    echo "❌ $SECRETS_DIR/$secret ausente"
    echo "   cp $SECRETS_DIR/${secret}.example $SECRETS_DIR/$secret"
    exit 1
  }
done

# PgBouncer
[ -f "/opt/secrets/pgbouncer/pgbouncer.ini" ] && [ -f "/opt/secrets/pgbouncer/userlist.txt" ] ||
  { echo "❌ PgBouncer secrets ausentes"; exit 1; }

echo "✅ [OK] Pré-requisitos"

# ==============================
# 2. CLEAN (opcional)
# ==============================
if [ "${CLEAN_DEPLOY:-false}" = true ]; then
  echo "🧹 [CLEAN] Removendo stack..."
  docker stack rm "$STACK_NAME" || true
  sleep 5
  docker system prune -af --volumes || true
fi

# ==============================
# 3. SECRETS
# ==============================
echo "🔐 [SECRETS] Atualizando..."

create_secret() {
  local name=$1 file=$2
  
  # Verifica se o secret já existe
  if docker secret inspect "$name" &>/dev/null; then
    echo "ℹ️  $name já existe (mantendo)"
  else
    docker secret create "$name" "$file"
    echo "✅ $name criado"
  fi
}

create_secret postgres_env "$SECRETS_DIR/postgres.env"
create_secret estacao_api_env "$SECRETS_DIR/estacao_api.env"
create_secret estacao_socket_env "$SECRETS_DIR/estacao_socket_env"

# redis_password do api.env
REDIS_PASS=$(grep '^REDIS_PASSWORD=' "$SECRETS_DIR/estacao_api.env" | cut -d= -f2-)
[ -n "$REDIS_PASS" ] && {
  if docker secret inspect redis_password &>/dev/null; then
    echo "ℹ️  redis_password já existe (mantendo)"
  else
    printf '%s' "$REDIS_PASS" | docker secret create redis_password -
    echo "✅ redis_password criado"
  fi
}

create_secret pgbouncer.ini "/opt/secrets/pgbouncer/pgbouncer.ini"
create_secret userlist.txt "/opt/secrets/pgbouncer/userlist.txt"

# ==============================
# 4. VOLUMES/REDES
# ==============================
for vol in postgres_data redis_data documentos_data; do
  docker volume create "$vol" 2>/dev/null || true
done

docker network create --driver overlay estacaoterapia_backend 2>/dev/null || true

# ==============================
# 5. BUILD IMAGENS
# ==============================
build_image() {
  local name=$1 dockerfile=$2
  echo "🐳 [$name] prd-$TAG"
  docker build \
    --no-cache \
    --platform linux/amd64 \
    --progress=plain \
    -t "$name:prd-$TAG" \
    -f "Dockerfile.$name" \
    . || { echo "❌ Build $name falhou"; exit 1; }
}

build_image redis redis
build_image api api
build_image socket-server socket-server

echo "✅ Builds concluídos"

# ==============================
# 6. DEPLOY
# ==============================
cp docker-stack.yml "docker-stack-$TAG.yml"
sed -i "s/{{TAG}}/$TAG/g" "docker-stack-$TAG.yml"

echo "📡 [DEPLOY] $STACK_NAME..."
docker stack deploy \
  --compose-file "docker-stack-$TAG.yml" \
  --resolve-image always \
  "$STACK_NAME"

# ==============================
# 7. MONITOR HEALTH
# ==============================
echo "⏳ [HEALTH] Aguardando convergência..."

services=(redis postgres pgbouncer api socket-server)

for svc in "${services[@]}"; do
  echo "🔄 $svc..."
  for i in {1..30}; do
    if docker service ps "estacaoterapia_$svc" --format '{{.CurrentState}}' | grep -q '^Running '; then
      echo "✅ $svc OK ($i/30s)"
      break
    fi
    [ $i -eq 30 ] && { echo "❌ $svc timeout"; docker service logs "estacaoterapia_$svc" --tail 10; }
    sleep 2
  done
done

# ==============================
# 8. CLEANUP
# ==============================
rm "docker-stack-$TAG.yml"
docker image prune -f
docker system prune -f

echo ""
echo "🎉 [SUCESSO] Deploy $TAG concluído!"
echo "📊 docker service ls"
echo "🔍 docker service logs estacaoterapia_api -f"
docker service ls --filter "name=estacaoterapia"
