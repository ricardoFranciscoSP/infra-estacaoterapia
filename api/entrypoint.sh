#!/bin/sh
set -e

# =====================================================
# Configuração básica
# =====================================================
SERVER_TYPE="${SERVER_TYPE:-api}"

# Garantir diretórios temporários
mkdir -p /tmp /run 2>/dev/null || true
chmod 1777 /tmp /run 2>/dev/null || true

# Diretório de backups
BACKUP_DIR="${BACKUP_DIR:-/app/backups}"
mkdir -p "$BACKUP_DIR" 2>/dev/null || true
chmod 775 "$BACKUP_DIR" 2>/dev/null || true
[ ! -w "$BACKUP_DIR" ] && echo "⚠️  Diretório de backups sem permissão de escrita: $BACKUP_DIR"

# =====================================================
# Funções utilitárias
# =====================================================
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

    export "$key=$value"
  done < "$file"
}

require_secret_file() {
  file="$1"
  name="$2"

  if [ -z "$file" ] || [ ! -f "$file" ]; then
    echo "❌ Secret obrigatório não encontrado: $name ($file)"
    exit 1
  fi

  if [ ! -r "$file" ]; then
    echo "❌ Sem permissão para ler secret: $name ($file)"
    exit 1
  fi
}

check_port() {
  host="$1"; port="$2"; name="$3"
  if timeout 2 nc -z "$host" "$port" 2>/dev/null; then
    echo "✅ $name acessível: $host:$port"
  else
    echo "⚠️  $name não respondeu (retry interno do app)"
  fi
}

can_resolve() {
  host="$1"
  getent hosts "$host" >/dev/null 2>&1 && return 0
  nslookup "$host" >/dev/null 2>&1 && return 0
  ping -c 1 -W 1 "$host" >/dev/null 2>&1 && return 0
  return 1
}

resolve_host_with_fallback() {
  var_name="$1"
  primary="$2"
  fallback_env="$3"
  defaults="$4"
  label="$5"
  retries="${DNS_RETRIES:-8}"
  delay="${DNS_RETRY_DELAY:-2}"

  candidates="$primary"
  [ -n "$fallback_env" ] && candidates="$candidates $fallback_env"
  [ -n "$defaults" ] && candidates="$candidates $defaults"

  for attempt in $(seq 1 "$retries"); do
    for host in $candidates; do
      if can_resolve "$host"; then
        export "$var_name=$host"
        echo "✅ DNS $label resolvido: $host ($attempt/$retries)"
        return 0
      fi
    done
    echo "⏳ DNS $label não resolveu ($attempt/$retries), aguardando ${delay}s..."
    sleep "$delay"
  done

  echo "⚠️  DNS $label não resolveu, usando fallback: $primary"
  export "$var_name=$primary"
  return 1
}

rewrite_url_host_port() {
  url="$1"
  new_host="$2"
  new_port="$3"

  [ -z "$url" ] && echo "" && return 0
  echo "$url" | sed -E "s#(@)[^:/]+#\\1${new_host}#; s#:([0-9]+)/#:${new_port}/#"
}

mask_secret() {
  secret="$1"
  [ -z "$secret" ] && echo "" && return 0
  printf "%s...%s" "$(printf "%s" "$secret" | cut -c1-4)" "$(printf "%s" "$secret" | tail -c 3)"
}

# =====================================================
# API
# =====================================================
start_api() {
  echo "🚀 Iniciando API"

  require_secret_file /run/secrets/estacao_api.env "estacao_api.env"
  require_secret_file /run/secrets/redis_password "redis_password"

  load_secrets /run/secrets/estacao_api.env

  # Defaults seguros
  export NODE_ENV="${NODE_ENV:-production}"
  export PORT="${PORT:-3333}"

  export PG_HOST="${PG_HOST:-pgbouncer}"
  export PG_PORT="${PG_PORT:-6432}"
  export PG_HOST_DIRECT="${PG_HOST_DIRECT:-postgres}"
  export PG_PORT_DIRECT="${PG_PORT_DIRECT:-5432}"
  export POSTGRES_DB="${POSTGRES_DB:-estacaoterapia}"

  export POSTGRES_USER="${POSTGRES_USER:-}"
  export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-}"

  export REDIS_HOST="${REDIS_HOST:-estacaoterapia_redis}"
  export REDIS_PORT="${REDIS_PORT:-6379}"
  export REDIS_DB="${REDIS_DB:-1}"
  export REDIS_PASSWORD="${REDIS_PASSWORD:-}"

  export JWT_SECRET="${JWT_SECRET:-}"
  export CORS_ORIGIN="${CORS_ORIGIN:-}"

  # Redis password via secret
  if [ -z "$REDIS_PASSWORD" ] && [ -f /run/secrets/redis_password ]; then
    REDIS_PASSWORD="$(tr -d '\n\r' < /run/secrets/redis_password)"
    export REDIS_PASSWORD
    echo "🔐 Senha Redis carregada do secret (${#REDIS_PASSWORD} chars)"
  fi

  # Resolver DNS
  resolve_host_with_fallback "PG_HOST" "$PG_HOST" "" "tasks.pgbouncer pgbouncer estacaoterapia_pgbouncer" "PgBouncer"
  resolve_host_with_fallback "REDIS_HOST" "$REDIS_HOST" "" "tasks.redis redis estacaoterapia_redis" "Redis"

  # DATABASE_URL
  if [ -n "$POSTGRES_USER" ] && [ -n "$POSTGRES_PASSWORD" ]; then
    export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${PG_HOST}:${PG_PORT}/${POSTGRES_DB}?schema=public"
    export BACKUP_DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${PG_HOST_DIRECT}:${PG_PORT_DIRECT}/${POSTGRES_DB}?schema=public"
  fi

  # REDIS_URL
  if [ -n "$REDIS_PASSWORD" ]; then
    export REDIS_URL="redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}/${REDIS_DB}"
  fi

  echo "📋 Conexões:"
  echo "   PostgreSQL → $PG_HOST:$PG_PORT"
  echo "   Redis      → $REDIS_HOST:$REDIS_PORT (auth: ${REDIS_PASSWORD:+SIM}${REDIS_PASSWORD:-NÃO})"

  check_port "$REDIS_HOST" "$REDIS_PORT" "Redis"
  check_port "$PG_HOST" "$PG_PORT" "PgBouncer"

  exec "$@"
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

  export PG_HOST="${PG_HOST:-pgbouncer}"
  export PG_PORT="${PG_PORT:-6432}"
  export POSTGRES_DB="${POSTGRES_DB:-estacaoterapia}"

  export POSTGRES_USER="${POSTGRES_USER:-}"
  export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-}"

  export REDIS_HOST="${REDIS_HOST:-estacaoterapia_redis}"
  export REDIS_PORT="${REDIS_PORT:-6379}"
  export REDIS_DB="${REDIS_DB:-1}"
  export REDIS_PASSWORD="${REDIS_PASSWORD:-}"

  export API_BASE_URL="${API_BASE_URL:-http://estacaoterapia_api:3333}"

  if [ -z "$REDIS_PASSWORD" ] && [ -f /run/secrets/redis_password ]; then
    REDIS_PASSWORD="$(tr -d '\n\r' < /run/secrets/redis_password)"
    export REDIS_PASSWORD
  fi

  resolve_host_with_fallback "PG_HOST" "$PG_HOST" "" "tasks.pgbouncer pgbouncer estacaoterapia_pgbouncer" "PgBouncer"
  resolve_host_with_fallback "REDIS_HOST" "$REDIS_HOST" "" "tasks.redis redis estacaoterapia_redis" "Redis"

  if [ -n "$POSTGRES_USER" ] && [ -n "$POSTGRES_PASSWORD" ]; then
    export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${PG_HOST}:${PG_PORT}/${POSTGRES_DB}?schema=public"
  fi

  if [ -n "$REDIS_PASSWORD" ]; then
    export REDIS_URL="redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}/${REDIS_DB}"
  fi

  echo "📋 Conexões:"
  echo "   PostgreSQL → $PG_HOST:$PG_PORT"
  echo "   Redis      → $REDIS_HOST:$REDIS_PORT"
  echo "   API        → $API_BASE_URL"

  exec "$@"
}

# =====================================================
# Dispatcher
# =====================================================
case "$SERVER_TYPE" in
  socket) start_socket "$@" ;;
  *)      start_api "$@" ;;
esac
