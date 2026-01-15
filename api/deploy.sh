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

SWARM_STATE="$(docker info --format '{{.Swarm.LocalNodeState}}' || echo inactive)"
[ "$SWARM_STATE" = "active" ] || { echo "❌ Swarm inativo"; exit 1; }

[ -f docker-stack.yml ] || { echo "❌ docker-stack.yml não encontrado"; exit 1; }

for f in postgres.env estacao_api.env estacao_socket.env; do
  [ -f "$SECRETS_DIR/$f" ] || { echo "❌ Secret ausente: $SECRETS_DIR/$f"; exit 1; }
done

echo "✅ Pré-requisitos OK"

# ==============================
# 2. CLEAN OPCIONAL
# ==============================
if [ "${CLEAN_DEPLOY:-false}" = true ]; then
  echo "🧹 Limpando stack..."
  docker stack rm "$STACK_NAME" || true
  sleep 8
fi

# ==============================
# 3. SECRETS (IDEMPOTENTE)
# ==============================
update_secret() {
  local name="$1" file="$2"

  local new_hash
  new_hash="$(sha256sum "$file" | awk '{print $1}')"

  if docker secret inspect "$name" >/dev/null 2>&1; then
    local old_hash
    old_hash="$(docker secret inspect "$name" --format '{{.Spec.Labels.hash}}' || true)"

    if [ "$new_hash" = "$old_hash" ]; then
      echo "ℹ️  $name inalterado"
      return
    fi

    docker secret rm "$name"
  fi

  docker secret create \
    --label hash="$new_hash" \
    "$name" "$file"

  echo "✅ Secret $name atualizado"
}

update_secret postgres_env "$SECRETS_DIR/postgres.env"
update_secret estacao_api_env "$SECRETS_DIR/estacao_api.env"
update_secret estacao_socket_env "$SECRETS_DIR/estacao_socket.env"
update_secret pgbouncer.ini "/opt/secrets/pgbouncer/pgbouncer.ini"
update_secret userlist.txt "/opt/secrets/pgbouncer/userlist.txt"

REDIS_PASS="$(grep '^REDIS_PASSWORD=' "$SECRETS_DIR/estacao_api.env" | cut -d= -f2-)"
[ -n "$REDIS_PASS" ] && printf '%s' "$REDIS_PASS" | update_secret redis_password /dev/stdin

# ==============================
# 4. VOLUMES + REDE
# ==============================
for v in postgres_data redis_data documentos_data; do
  docker volume create "$v" >/dev/null 2>&1 || true
done

docker network inspect estacaoterapia_backend >/dev/null 2>&1 || \
docker network create --driver overlay --attachable estacaoterapia_backend

# ==============================
# 5. BUILD
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

docker stack deploy \
  --compose-file "$STACK_TMP" \
  --resolve-image always \
  "$STACK_NAME"

# ==============================
# 7. HEALTH
# ==============================
echo "⏳ Aguardando serviços..."
services=(postgres pgbouncer redis api socket-server)

for svc in "${services[@]}"; do
  full="${STACK_NAME}_${svc}"
  for i in {1..30}; do
    replicas="$(docker service ls --format '{{.Name}} {{.Replicas}}' | awk -v s="$full" '$1==s {print $2}')"
    [ "${replicas%%/*}" = "${replicas##*/}" ] && break
    sleep 2
  done
  echo "✅ $svc pronto ($replicas)"
done

# ==============================
# 8. CLEANUP
# ==============================
rm -f "$STACK_TMP"
docker image prune -f --filter "until=72h"

echo ""
echo "🎉 DEPLOY CONCLUÍDO: prd-$TAG"
docker service ls --filter name="$STACK_NAME"
