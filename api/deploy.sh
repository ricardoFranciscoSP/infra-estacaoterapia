#!/bin/bash
set -euo pipefail

export LC_ALL=C.UTF-8
export LANG=C.UTF-8

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SECRETS_DIR="/opt/secrets"
STACK_NAME="estacaoterapia"

echo "🚀 [DEPLOY] Estação Terapia Swarm - $(date)"
echo "======================================"

# ==============================
# TAG
# ==============================
TIMESTAMP="$(date +%Y%m%d%H%M%S)"
GIT_HASH="$(git rev-parse --short HEAD 2>/dev/null || echo local)"
TAG="${TIMESTAMP}-${GIT_HASH}"

echo "📦 Tag: prd-$TAG | Clean: ${CLEAN_DEPLOY:-false} | Force build: ${FORCE_BUILD:-false}"

# ==============================
# 1. PRÉ-REQUISITOS
# ==============================
command -v docker >/dev/null || { echo "❌ Docker não encontrado"; exit 1; }

SWARM_STATE="$(docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null || echo inactive)"
[ "$SWARM_STATE" = "active" ] || { echo "❌ Docker Swarm inativo"; exit 1; }

[ -f docker-stack.yml ] || { echo "❌ docker-stack.yml não encontrado"; exit 1; }

for f in postgres.env estacao_api.env estacao_socket.env; do
  [ -f "$SECRETS_DIR/$f" ] || { echo "❌ Secret ausente: $SECRETS_DIR/$f"; exit 1; }
done

echo "✅ Pré-requisitos OK"

# ==============================
# 2. CLEAN (OPCIONAL)
# ==============================
if [ "${CLEAN_DEPLOY:-false}" = true ]; then
  echo "🧹 CLEAN_DEPLOY ativo — removendo stack"
  docker stack rm "$STACK_NAME" || true
  sleep 10
fi

# ==============================
# 3. SECRETS (PRODUÇÃO SAFE)
# ==============================
create_secret_if_missing() {
  local name="$1" file="$2"

  if docker secret inspect "$name" >/dev/null 2>&1; then
    echo "ℹ️  Secret $name já existe (mantido)"
    return
  fi

  docker secret create "$name" "$file"
  echo "✅ Secret $name criado"
}

create_secret_if_missing postgres_env "$SECRETS_DIR/postgres.env"
create_secret_if_missing estacao_api_env "$SECRETS_DIR/estacao_api.env"
create_secret_if_missing estacao_socket_env "$SECRETS_DIR/estacao_socket.env"
create_secret_if_missing pgbouncer.ini "/opt/secrets/pgbouncer/pgbouncer.ini"
create_secret_if_missing userlist.txt "/opt/secrets/pgbouncer/userlist.txt"

# ==============================
# Redis password (especial)
# ==============================
if ! docker secret inspect redis_password >/dev/null 2>&1; then
  REDIS_PASS="$(grep -E '^REDIS_PASSWORD=' "$SECRETS_DIR/estacao_api.env" | cut -d= -f2- | tr -d '\r')"

  if [ -z "$REDIS_PASS" ]; then
    echo "❌ REDIS_PASSWORD vazio em estacao_api.env"
    exit 1
  fi

  printf '%s' "$REDIS_PASS" | docker secret create redis_password -
  echo "✅ Secret redis_password criado"
else
  echo "ℹ️  Secret redis_password já existe (mantido)"
fi

# ==============================
# 4. VOLUMES + REDE
# ==============================
for v in postgres_data redis_data documentos_data; do
  docker volume create "$v" >/dev/null 2>&1 || true
done

docker network inspect estacaoterapia_backend >/dev/null 2>&1 || \
docker network create --driver overlay --attachable estacaoterapia_backend

echo "✅ Volumes e rede OK"

# ==============================
# 5. BUILD IMAGENS
# ==============================
build_image() {
  local name="$1"

  echo "📦 Build $name"
  docker build \
    ${FORCE_BUILD:+--no-cache} \
    --platform linux/amd64 \
    -t "$name:prd-$TAG" \
    -f "Dockerfile.$name" .
}

build_image redis
build_image api
build_image socket
build_image pgbouncer

# ==============================
# 6. DEPLOY
# ==============================
STACK_TMP="docker-stack-$TAG.yml"
cp docker-stack.yml "$STACK_TMP"
sed -i "s/{{TAG}}/$TAG/g" "$STACK_TMP"

echo "📡 Deploy stack $STACK_NAME"
docker stack deploy \
  --compose-file "$STACK_TMP" \
  --resolve-image always \
  "$STACK_NAME"

# ==============================
# 7. HEALTH CHECK
# ==============================
echo "⏳ Aguardando serviços..."

services=(postgres pgbouncer redis api socket-server)

for svc in "${services[@]}"; do
  full="${STACK_NAME}_${svc}"
  echo "🔄 $full"

  for i in {1..30}; do
    replicas="$(docker service ls --format '{{.Name}} {{.Replicas}}' | awk -v s="$full" '$1==s {print $2}')"
    running="${replicas%%/*}"
    desired="${replicas##*/}"

    [ "$running" = "$desired" ] && break
    sleep 2
  done

  echo "✅ $svc OK ($replicas)"
done

# ==============================
# 8. CLEANUP
# ==============================
rm -f "$STACK_TMP"
docker image prune -f --filter "until=72h"

echo ""
echo "🎉 DEPLOY CONCLUÍDO COM SUCESSO!"
docker service ls --filter name="$STACK_NAME"
