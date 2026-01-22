#!/bin/sh
set -e

# =====================================================
# Configuração básica
# =====================================================
SERVER_TYPE="${SERVER_TYPE:-api}"

echo "🧭 Entrypoint iniciado (SERVER_TYPE=$SERVER_TYPE)"

# Garantir diretórios temporários
mkdir -p /tmp /run || true
chmod 1777 /tmp /run || true

# =====================================================
# Diretórios de backup
# =====================================================
BACKUP_DIR="${BACKUP_DIR:-/app/backups}"

ensure_dir() {
  dir="$1"
  perms="$2"

  mkdir -p "$dir" || true
  chmod "$perms" "$dir" || true

  if [ ! -w "$dir" ]; then
    echo "⚠️  Diretório sem permissão de escrita: $dir"
  fi
}

ensure_dir "$BACKUP_DIR" "775"

if [ ! -w "$BACKUP_DIR" ]; then
  BACKUP_FALLBACK_DIR="/app/documentos/backups"
  ensure_dir "$BACKUP_FALLBACK_DIR" "775"

  if [ -w "$BACKUP_FALLBACK_DIR" ]; then
    echo "⚠️  Usando fallback de backups em $BACKUP_FALLBACK_DIR"
    export BACKUP_DIR="$BACKUP_FALLBACK_DIR"
  else
    echo "❌ Nenhum diretório de backups gravável disponível"
  fi
fi

# Restore temporário
BACKUP_TMP_DIR="${BACKUP_TMP_DIR:-/app/tmp/backups-restore}"
ensure_dir "$BACKUP_TMP_DIR" "775"

# =====================================================
# Funções utilitárias
# =====================================================
load_secrets() {
  file="$1"
  [ -f "$file" ] || return 0

  echo "🔐 Carregando secrets: $file"

  while IFS= read -r line || [ -n "$line" ]; do
    line="$(echo "$line" | tr -d '\r')"
    case "$line" in ''|\#*) continue ;; esac

    line="${line#export }"
    key="${line%%=*}"
    value="${line#*=}"

    case "$key" in
      ''|*[!A-Za-z0-9_]*|[0-9]*) continue ;;
    esac

    value="${value#\"}"
    value="${value%\"}"
    value="${value#\'}"
    value="${value%\'}"

    export "$key=$value"
  done < "$file"
}

require_secret_file() {
  [ -r "$1" ] || {
    echo "❌ Secret obrigatório ausente ou sem permissão: $2 ($1)"
    exit 1
  }
}

require_env() {
  [ -n "$(printenv "$1")" ] || {
    echo "❌ Variável obrigatória ausente: $1"
    exit 1
  }
}

exec_as_user() {
  if [ "$(id -u)" = "0" ] && command -v su-exec >/dev/null; then
    exec su-exec deploy "$@"
  fi
  exec "$@"
}

url_encode() {
  node -e "process.stdout.write(encodeURIComponent(process.argv[1]))" "$1"
}

can_resolve() {
  getent hosts "$1" >/dev/null 2>&1
}

resolve_host_with_fallback() {
  var="$1"
  hosts="$2 $3 $4"
  label="$5"

  for h in $hosts; do
    if can_resolve "$h"; then
      export "$var=$h"
      echo "✅ DNS $label resolvido: $h"
      return
    fi
  done

  echo "⚠️  DNS $label não resolveu, usando fallback: $2"
  export "$var=$2"
}

# =====================================================
# Cleanup BullMQ (RUNTIME)
# =====================================================
cleanup_bullmq() {
  if [ -x /app/scripts/cleanup-bullmq-queues.sh ]; then
    echo "🧹 Limpando filas BullMQ"
    /app/scripts/cleanup-bullmq-queues.sh || \
      echo "⚠️ Falha ao limpar filas BullMQ (ignorado)"
  fi
}

# =====================================================
# API
# =====================================================
start_api() {
  echo "🚀 Iniciando API"

  require_secret_file /run/secrets/estacao_api.env "estacao_api.env"
  require_secret_file /run/secrets/redis_password "redis_password"

  load_secrets /run/secrets/estacao_api.env

  export NODE_ENV="${NODE_ENV:-production}"
  export PORT="${PORT:-3333}"

  export PG_HOST="${PG_HOST:-pgbouncer}"
  export PG_PORT="${PG_PORT:-6432}"
  export PG_HOST_DIRECT="${PG_HOST_DIRECT:-postgres}"
  export PG_PORT_DIRECT="${PG_PORT_DIRECT:-5432}"
  export POSTGRES_DB="${POSTGRES_DB:-estacaoterapia}"

  export REDIS_HOST="${REDIS_HOST:-estacaoterapia_redis}"
  export REDIS_PORT="${REDIS_PORT:-6379}"
  export REDIS_DB="${REDIS_DB:-1}"

  export POSTGRES_USER
  export POSTGRES_PASSWORD
  export REDIS_PASSWORD="$(tr -d '\n\r' < /run/secrets/redis_password)"

  require_env POSTGRES_USER
  require_env POSTGRES_PASSWORD
  require_env POSTGRES_DB
  require_env REDIS_PASSWORD

  resolve_host_with_fallback PG_HOST "$PG_HOST" "" "tasks.pgbouncer pgbouncer" "PgBouncer"
  resolve_host_with_fallback REDIS_HOST "$REDIS_HOST" "" "tasks.redis redis" "Redis"

  ENCODED_PG_PASSWORD="$(url_encode "$POSTGRES_PASSWORD")"

  export DATABASE_URL="postgresql://${POSTGRES_USER}:${ENCODED_PG_PASSWORD}@${PG_HOST}:${PG_PORT}/${POSTGRES_DB}?schema=public"
  export BACKUP_DATABASE_URL="postgresql://${POSTGRES_USER}:${ENCODED_PG_PASSWORD}@${PG_HOST_DIRECT}:${PG_PORT_DIRECT}/${POSTGRES_DB}?schema=public"
  export REDIS_URL="redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}/${REDIS_DB}"

  cleanup_bullmq

  if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    echo "🧱 Executando migrations"
    DATABASE_URL="$BACKUP_DATABASE_URL" npx prisma migrate deploy || \
      echo "⚠️ Falha nas migrations (ignorado)"
  fi

  echo "📋 API pronta para iniciar"
  exec_as_user "$@"
}

# =====================================================
# SOCKET
# =====================================================
start_socket() {
  echo "🚀 Iniciando Socket Server"

  require_secret_file /run/secrets/estacao_socket.env "estacao_socket.env"
  require_secret_file /run/secrets/redis_password "redis_password"

  load_secrets /run/secrets/estacao_socket.env

  export NODE_ENV="${NODE_ENV:-production}"
  export PORT="${PORT:-3334}"
  export REDIS_PASSWORD="$(tr -d '\n\r' < /run/secrets/redis_password)"

  require_env REDIS_PASSWORD
  require_env API_BASE_URL

  cleanup_bullmq
  exec_as_user "$@"
}

# =====================================================
# Dispatcher
# =====================================================
case "$SERVER_TYPE" in
  socket) start_socket "$@" ;;
  *)      start_api "$@" ;;
esac
