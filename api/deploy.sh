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
echo ""
echo "════════════════════════════════════════════════════════"
echo "📋 ETAPA 1/8 - VALIDAÇÃO DE PRÉ-REQUISITOS"
echo "════════════════════════════════════════════════════════"
echo "🔍 Verificando Docker, Swarm e arquivos necessários..."

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
# 1.5 VALIDAÇÃO DE VARIÁVEIS DE SECRET
# ==============================
echo ""
echo "════════════════════════════════════════════════════════"
echo "🧾 ETAPA 1.5/8 - VALIDAÇÃO DE VARIÁVEIS OBRIGATÓRIAS"
echo "════════════════════════════════════════════════════════"

validate_required_vars() {
  local name=$1 file=$2; shift 2
  local missing=()

  for var in "$@"; do
    local value
    value=$(grep -E "^${var}=" "$file" | sed 's/^[^=]*=//') || true

    if [ -z "$value" ]; then
      missing+=("${var}=<vazio>")
      continue
    fi

    if printf '%s' "$value" | grep -qiE '^(your-|changeme|example)'; then
      missing+=("${var}=<placeholder>")
    fi
  done

  if [ ${#missing[@]} -gt 0 ]; then
    echo "❌ $name com variáveis ausentes/placeholder: ${missing[*]}"
    echo "   Atualize $file antes de continuar."
    exit 1
  fi

  echo "✅ $name validado"
}

validate_required_vars "postgres.env" "$SECRETS_DIR/postgres.env" \
  POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB

validate_required_vars "estacao_api.env" "$SECRETS_DIR/estacao_api.env" \
  POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB REDIS_PASSWORD JWT_SECRET

validate_required_vars "estacao_socket.env" "$SECRETS_DIR/estacao_socket.env" \
  POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB REDIS_PASSWORD JWT_SECRET

# ==============================
# 2. CLEAN (opcional)
# ==============================
echo ""
echo "════════════════════════════════════════════════════════"
echo "🧹 ETAPA 2/8 - LIMPEZA (${CLEAN_DEPLOY:-false})"
echo "════════════════════════════════════════════════════════"
if [ "${CLEAN_DEPLOY:-false}" = true ]; then
  echo "🧹 Removendo stack e imagens antigas..."
  docker stack rm "$STACK_NAME" || true
  sleep 5
  docker system prune -af --volumes || true
fi

# ==============================
# 3. SECRETS
# ==============================
echo ""
echo "════════════════════════════════════════════════════════"
echo "🔐 ETAPA 3/8 - CONFIGURAÇÃO DE SECRETS"
echo "════════════════════════════════════════════════════════"
echo "🔐 Criando/verificando secrets do Docker Swarm..."

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
create_secret estacao_socket_env "$SECRETS_DIR/estacao_socket.env"

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
echo ""
echo "════════════════════════════════════════════════════════"
echo "💾 ETAPA 4/8 - VOLUMES E REDES"
echo "════════════════════════════════════════════════════════"
echo "💾 Criando volumes persistentes e rede overlay..."
for vol in postgres_data redis_data documentos_data; do
  docker volume create "$vol" 2>/dev/null || true
done

docker network create --driver overlay estacaoterapia_backend 2>/dev/null || true

echo "✅ Volumes e rede configurados"

# ==============================
# 5. BUILD IMAGENS
# ==============================
echo ""
echo "════════════════════════════════════════════════════════"
echo "🐳 ETAPA 5/8 - BUILD DE IMAGENS DOCKER"
echo "════════════════════════════════════════════════════════"
echo "🐳 Compilando imagens para tag: prd-$TAG"
echo ""

build_image() {
  local name=$1 dockerfile=$2
  echo "───────────────────────────────────────────────────────"
  echo "📦 Buildando [$name] prd-$TAG..."
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
build_image socket socket
build_image pgbouncer pgbouncer

echo ""
echo "✅ Todas as imagens compiladas com sucesso!"

# ==============================
# 6. DEPLOY
# ==============================
echo ""
echo "════════════════════════════════════════════════════════"
echo "📡 ETAPA 6/8 - DEPLOY NO SWARM"
echo "════════════════════════════════════════════════════════"
echo "📡 Preparando docker-stack.yml e fazendo deploy..."
cp docker-stack.yml "docker-stack-$TAG.yml"
sed -i "s/{{TAG}}/$TAG/g" "docker-stack-$TAG.yml"

echo "📡 [DEPLOY] $STACK_NAME..."
docker stack deploy \
  --compose-file "docker-stack-$TAG.yml" \
  --resolve-image always \
  "$STACK_NAME"

echo "✅ Stack deployed!"

# ==============================
# 7. MONITOR HEALTH
# ==============================
echo ""
echo "════════════════════════════════════════════════════════"
echo "⏳ ETAPA 7/8 - MONITORAMENTO DE SAÚDE"
echo "════════════════════════════════════════════════════════"
echo "⏳ Aguardando todos os serviços ficarem saudáveis..."
echo ""

services=(postgres pgbouncer redis api socket-server)

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

echo ""
echo "✅ Todos os serviços estão rodando!"

# ==============================
# 8. CLEANUP
# ==============================
echo ""
echo "════════════════════════════════════════════════════════"
echo "🧹 ETAPA 8/8 - LIMPEZA FINAL"
echo "════════════════════════════════════════════════════════"
echo "🧹 Removendo arquivos temporários e imagens antigas..."
rm "docker-stack-$TAG.yml"
docker image prune -f
docker system prune -f

echo ""
echo "🎉 [SUCESSO] Deploy $TAG concluído!"
echo "📊 docker service ls"
echo "🔍 docker service logs estacaoterapia_api -f"
docker service ls --filter "name=estacaoterapia"
