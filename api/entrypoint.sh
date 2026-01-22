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

ensure_dir() {
  dir="$1"
  perms="$2"

  mkdir -p "$dir" 2>/dev/null || true
  chmod "$perms" "$dir" 2>/dev/null || true
  [ ! -w "$dir" ] && echo "⚠️  Diretório sem permissão de escrita: $dir"
}

ensure_dir "$BACKUP_DIR" "775"
if [ ! -w "$BACKUP_DIR" ]; then
  BACKUP_FALLBACK_DIR="/app/documentos/backups"
  ensure_dir "$BACKUP_FALLBACK_DIR" "775"
  if [ -w "$BACKUP_FALLBACK_DIR" ]; then
    echo "⚠️  Usando fallback de backups em $BACKUP_FALLBACK_DIR"
    BACKUP_DIR="$BACKUP_FALLBACK_DIR"
    export BACKUP_DIR
  else
    echo "❌ Nenhum diretório de backups com permissão de escrita disponível"
  fi
fi

# Diretório temporário para restore de backups (admin)
BACKUP_TMP_DIR="${BACKUP_TMP_DIR:-/app/tmp/backups-restore}"
ensure_dir "$BACKUP_TMP_DIR" "775"

# =====================================================
# Funções utilitárias
# =====================================================
load_secrets() {
  file="$1"
  [ -z "$file" ] || [ ! -f "$file" ] && return 0

  echo "🔐 Carregando secrets: $file"

  while IFS= read -r line || [ -n "$line" ]; do
    line="$(printf "%s" "$line" | tr -d '\r')"
    case "$line" in ""|\#*) continue ;; esac

    line="${line#"${line%%[![:space:]]*}"}"
    case "$line" in "export "*) line="${line#export }" ;; esac

    key="${line%%=*}"
    value="${line#*=}"
    key="$(printf "%s" "$key" | sed -E 's/^[[:space:]]+|[[:space:]]+$//g')"
    value="$(printf "%s" "$value" | sed -E 's/^[[:space:]]+|[[:space:]]+$//g')"

    case "$value" in
      \"*\") value="${value#\"}"; value="${value%\"}" ;;
      \'*\') value="${value#\'}"; value="${value%\'}" ;;
    esac

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

require_env() {
  name="$1"
  value="$(printenv "$name" 2>/dev/null || true)"
  if [ -z "$value" ]; then
    echo "❌ Variável de ambiente obrigatória ausente: $name"
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
  if command -v getent >/dev/null 2>&1; then
    getent hosts "$host" >/dev/null 2>&1 && return 0
  fi
  if command -v nslookup >/dev/null 2>&1; then
    nslookup "$host" >/dev/null 2>&1 && return 0
  fi
  if command -v ping >/dev/null 2>&1; then
    ping -c 1 -W 1 "$host" >/dev/null 2>&1 && return 0
  fi
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

  attempt=1
  while [ "$attempt" -le "$retries" ]; do
    for host in $candidates; do
      if can_resolve "$host"; then
        export "$var_name=$host"
        echo "✅ DNS $label resolvido: $host ($attempt/$retries)"
        return 0
      fi
    done
    echo "⏳ DNS $label não resolveu ($attempt/$retries), aguardando ${delay}s..."
    sleep "$delay"
    attempt=$((attempt + 1))
  done

  echo "⚠️  DNS $label não resolveu, usando fallback: $primary"
  export "$var_name=$primary"
  return 0
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

url_encode() {
  value="$1"
  [ -z "$value" ] && echo "" && return 0
  if command -v node >/dev/null 2>&1; then
    node -e "process.stdout.write(encodeURIComponent(process.argv[1]))" "$value"
  else
    printf "%s" "$value"
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

  # Valida variáveis obrigatórias
  require_env POSTGRES_USER
  require_env POSTGRES_PASSWORD
  require_env POSTGRES_DB
  require_env REDIS_PASSWORD

  # Resolver DNS
  resolve_host_with_fallback "PG_HOST" "$PG_HOST" "" "tasks.pgbouncer pgbouncer estacaoterapia_pgbouncer" "PgBouncer"
  resolve_host_with_fallback "REDIS_HOST" "$REDIS_HOST" "" "tasks.redis redis estacaoterapia_redis" "Redis"

  # DATABASE_URL
  if [ -n "$POSTGRES_USER" ] && [ -n "$POSTGRES_PASSWORD" ]; then
    ENCODED_PG_PASSWORD="$(url_encode "$POSTGRES_PASSWORD")"
    export DATABASE_URL="postgresql://${POSTGRES_USER}:${ENCODED_PG_PASSWORD}@${PG_HOST}:${PG_PORT}/${POSTGRES_DB}?schema=public"
    export BACKUP_DATABASE_URL="postgresql://${POSTGRES_USER}:${ENCODED_PG_PASSWORD}@${PG_HOST_DIRECT}:${PG_PORT_DIRECT}/${POSTGRES_DB}?schema=public"
  fi

  # Migrations (opcional)
  RUN_MIGRATIONS="${RUN_MIGRATIONS:-true}"
  if [ "$RUN_MIGRATIONS" = "true" ]; then
    if [ -n "$BACKUP_DATABASE_URL" ]; then
      echo "🧱 Aplicando migrations (prisma migrate deploy)"
      DATABASE_URL="$BACKUP_DATABASE_URL" npx prisma migrate deploy || {
        echo "⚠️  Falha ao aplicar migrations. Continuando startup."
      }
    else
      echo "⚠️  BACKUP_DATABASE_URL vazio. Pulando migrations."
    fi
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

  require_env POSTGRES_USER
  require_env POSTGRES_PASSWORD
  require_env POSTGRES_DB
  require_env REDIS_PASSWORD
  require_env API_BASE_URL

  resolve_host_with_fallback "PG_HOST" "$PG_HOST" "" "tasks.pgbouncer pgbouncer estacaoterapia_pgbouncer" "PgBouncer"
  resolve_host_with_fallback "REDIS_HOST" "$REDIS_HOST" "" "tasks.redis redis estacaoterapia_redis" "Redis"

  if [ -n "$POSTGRES_USER" ] && [ -n "$POSTGRES_PASSWORD" ]; then
    ENCODED_PG_PASSWORD="$(url_encode "$POSTGRES_PASSWORD")"
    export DATABASE_URL="postgresql://${POSTGRES_USER}:${ENCODED_PG_PASSWORD}@${PG_HOST}:${PG_PORT}/${POSTGRES_DB}?schema=public"
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
