#!/bin/sh
set -e

SERVER_TYPE="${SERVER_TYPE:-api}"

mkdir -p /tmp /run && chmod 1777 /tmp /run

# =========================
# Carregar secrets (.env)
# =========================
load_secrets() {
  file="$1"
  [ -z "$file" ] || [ ! -f "$file" ] && return 0

  echo "🔐 Carregando secrets: $file"

  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in ""|\#*) continue ;; esac
    key="${line%%=*}"
    value="${line#*=}"

    case "$key" in
      ''|*[!A-Za-z0-9_]*|[0-9]*) continue ;;
    esac

    [ -n "$value" ] && export "$key=$value"
  done < "$file"
}

# =========================
# Diagnóstico simples (não bloqueante)
# =========================
check_port() {
  host="$1"; port="$2"; name="$3"
  if timeout 2 nc -z "$host" "$port" 2>/dev/null; then
    echo "✅ $name acessível: $host:$port"
  else
    echo "⚠️  $name não respondeu (retry interno do app)"
  fi
}

# =========================
# API
# =========================
start_api() {
  echo "🚀 Iniciando API"

  load_secrets /run/secrets/estacao_api.env

  PG_HOST="${PG_HOST:-pgbouncer}"
  PG_PORT="${PG_PORT:-6432}"
  POSTGRES_DB="${POSTGRES_DB:-estacaoterapia}"
  REDIS_HOST="${REDIS_HOST:-estacaoterapia_redis}"
  REDIS_PORT="${REDIS_PORT:-6379}"
  REDIS_DB="${REDIS_DB:-1}"

  if [ -f /run/secrets/redis_password ]; then
    REDIS_PASSWORD="$(tr -d '\n\r' < /run/secrets/redis_password)"
  fi

  export NODE_ENV PORT \
    PG_HOST PG_PORT POSTGRES_DB \
    REDIS_HOST REDIS_PORT REDIS_DB REDIS_PASSWORD \
    POSTGRES_USER POSTGRES_PASSWORD

  if [ -n "$POSTGRES_USER" ] && [ -n "$POSTGRES_PASSWORD" ]; then
    export DATABASE_URL="${DATABASE_URL:-postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${PG_HOST}:${PG_PORT}/${POSTGRES_DB}?schema=public}"
  fi

  if [ -z "$REDIS_URL" ] && [ -n "$REDIS_PASSWORD" ]; then
    export REDIS_URL="redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}/${REDIS_DB}"
  fi

  echo "📋 Conexões:"
  echo "   PostgreSQL → $PG_HOST:$PG_PORT"
  echo "   Redis      → $REDIS_HOST:$REDIS_PORT (auth: ${REDIS_PASSWORD:+SIM}${REDIS_PASSWORD:+"NÃO"})"

  check_port "$REDIS_HOST" "$REDIS_PORT" "Redis"
  check_port "$PG_HOST" "$PG_PORT" "PgBouncer"

  exec "$@"
}

# =========================
# SOCKET
# =========================
start_socket() {
  echo "🚀 Iniciando Socket Server"

  load_secrets /run/secrets/estacao_socket.env

  PG_HOST="${PG_HOST:-pgbouncer}"
  PG_PORT="${PG_PORT:-6432}"
  POSTGRES_DB="${POSTGRES_DB:-estacaoterapia}"
  REDIS_HOST="${REDIS_HOST:-estacaoterapia_redis}"
  REDIS_PORT="${REDIS_PORT:-6379}"
  REDIS_DB="${REDIS_DB:-1}"
  API_BASE_URL="${API_BASE_URL:-http://estacaoterapia_api:3333}"

  if [ -f /run/secrets/redis_password ]; then
    REDIS_PASSWORD="$(tr -d '\n\r' < /run/secrets/redis_password)"
  fi

  export PG_HOST PG_PORT POSTGRES_DB \
    POSTGRES_USER POSTGRES_PASSWORD \
    REDIS_HOST REDIS_PORT REDIS_DB REDIS_PASSWORD \
    API_BASE_URL

  if [ -z "$DATABASE_URL" ] && [ -n "$POSTGRES_USER" ] && [ -n "$POSTGRES_PASSWORD" ]; then
    export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${PG_HOST}:${PG_PORT}/${POSTGRES_DB}?schema=public"
  fi

  if [ -z "$REDIS_URL" ] && [ -n "$REDIS_PASSWORD" ]; then
    export REDIS_URL="redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}/${REDIS_DB}"
  fi

  echo "📋 Conexões:"
  echo "   PostgreSQL → $PG_HOST:$PG_PORT"
  echo "   Redis      → $REDIS_HOST:$REDIS_PORT"
  echo "   API        → $API_BASE_URL"

  check_port "$REDIS_HOST" "$REDIS_PORT" "Redis"
  check_port "$PG_HOST" "$PG_PORT" "PgBouncer"

  API_HOST="$(echo "$API_BASE_URL" | sed 's|https\?://||' | cut -d: -f1)"
  API_PORT="$(echo "$API_BASE_URL" | awk -F: '{print $3}')"
  API_PORT="${API_PORT:-3333}"

  check_port "$API_HOST" "$API_PORT" "API"

  exec "$@"
}

# =========================
# Dispatcher
# =========================
case "$SERVER_TYPE" in
  socket) start_socket "$@" ;;
  *)      start_api "$@" ;;
esac
