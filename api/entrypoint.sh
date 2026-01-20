#!/bin/sh
set -e

SERVER_TYPE="${SERVER_TYPE:-api}"

# Criar apenas se não existir (não tentar chmod)
mkdir -p /tmp /run 2>/dev/null || true
chmod 1777 /tmp /run 2>/dev/null || true  # Ignorar erro se falhar (usuário não-root)

# Diretório de backups (persistência de .sql)
BACKUP_DIR="${BACKUP_DIR:-/app/backups}"
mkdir -p "$BACKUP_DIR" 2>/dev/null || true
chmod 775 "$BACKUP_DIR" 2>/dev/null || true
if [ ! -w "$BACKUP_DIR" ]; then
  echo "⚠️  Diretório de backups sem permissão de escrita: $BACKUP_DIR"
fi

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
# Resolução DNS com fallback
# =========================
can_resolve() {
  host="$1"
  if command -v getent >/dev/null 2>&1; then
    getent hosts "$host" >/dev/null 2>&1
    return $?
  fi
  if command -v nslookup >/dev/null 2>&1; then
    nslookup "$host" >/dev/null 2>&1
    return $?
  fi
  if command -v ping >/dev/null 2>&1; then
    ping -c 1 -W 1 "$host" >/dev/null 2>&1
    return $?
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

  for attempt in $(seq 1 "$retries"); do
    for host in $candidates; do
      if can_resolve "$host"; then
        export "$var_name=$host"
        echo "✅ DNS $label resolvido: $host (tentativa $attempt/$retries)"
        return 0
      fi
    done
    echo "⏳ DNS $label não resolveu (tentativa $attempt/$retries). Aguardando ${delay}s..."
    sleep "$delay"
  done

  echo "⚠️  DNS $label não resolveu após ${retries} tentativas. Usando: $primary"
  export "$var_name=$primary"
  return 1
}

rewrite_url_host_port() {
  url="$1"
  new_host="$2"
  new_port="$3"

  if [ -z "$url" ]; then
    echo ""
    return 0
  fi

  # Substitui host e porta no padrão protocol://user:pass@host:port/...
  echo "$url" | sed -E "s#(@)[^:/]+#\\1${new_host}#; s#:([0-9]+)/#:${new_port}/#"
}

# =========================
# Utilitários (compatíveis com /bin/sh)
# =========================
mask_secret() {
  secret="$1"
  if [ -z "$secret" ]; then
    echo ""
    return 0
  fi

  prefix="$(printf "%s" "$secret" | cut -c1-5 2>/dev/null || true)"
  suffix="$(printf "%s" "$secret" | tail -c 3 2>/dev/null || true)"
  echo "${prefix}...${suffix}"
}

# =========================
# API
# =========================
start_api() {
  echo "🚀 Iniciando API"

  load_secrets /run/secrets/estacao_api.env

  NODE_ENV="${NODE_ENV:-production}"
  PG_HOST="${PG_HOST:-pgbouncer}"
  PG_PORT="${PG_PORT:-6432}"
  PG_HOST_DIRECT="${PG_HOST_DIRECT:-postgres}"
  PG_PORT_DIRECT="${PG_PORT_DIRECT:-5432}"
  POSTGRES_DB="${POSTGRES_DB:-estacaoterapia}"
  REDIS_HOST="${REDIS_HOST:-estacaoterapia_redis}"
  REDIS_PORT="${REDIS_PORT:-6379}"
  REDIS_DB="${REDIS_DB:-1}"
  PG_HOST_FALLBACK="${PG_HOST_FALLBACK:-}"
  REDIS_HOST_FALLBACK="${REDIS_HOST_FALLBACK:-}"

  # Prioridade de senha Redis:
  # 1. REDIS_PASSWORD do environment (docker-stack.yml)
  # 2. Secret redis_password
  # 3. Do arquivo .env
  if [ -z "$REDIS_PASSWORD" ]; then
    if [ -f /run/secrets/redis_password ]; then
      REDIS_PASSWORD_FROM_SECRET="$(tr -d '\n\r' < /run/secrets/redis_password)"
      if [ -n "$REDIS_PASSWORD_FROM_SECRET" ]; then
        export REDIS_PASSWORD="$REDIS_PASSWORD_FROM_SECRET"
        echo "🔐 Senha Redis carregada do secret docker (${#REDIS_PASSWORD} chars)"
      else
        echo "⚠️  Secret redis_password está vazio, usando do .env se existir"
      fi
    else
      echo "⚠️  Secret redis_password não encontrado, usando do .env"
    fi
  else
    echo "🔐 Senha Redis definida via environment variable (${#REDIS_PASSWORD} chars)"
  fi

  # Resolver DNS com fallback (evita ENOTFOUND no Swarm)
  resolve_host_with_fallback "PG_HOST" "$PG_HOST" "$PG_HOST_FALLBACK" "tasks.pgbouncer pgbouncer estacaoterapia_pgbouncer" "PgBouncer"
  resolve_host_with_fallback "REDIS_HOST" "$REDIS_HOST" "$REDIS_HOST_FALLBACK" "tasks.redis estacaoterapia_redis redis" "Redis"

  export NODE_ENV PORT \
    PG_HOST PG_PORT POSTGRES_DB \
    PG_HOST_DIRECT PG_PORT_DIRECT \
    POSTGRES_USER POSTGRES_PASSWORD \
    REDIS_HOST REDIS_PORT REDIS_DB REDIS_PASSWORD \
    JWT_SECRET CORS_ORIGIN

  # Remover espaços em branco acidentais
  POSTGRES_USER="$(echo -n "$POSTGRES_USER" | xargs)"
  POSTGRES_PASSWORD="$(echo -n "$POSTGRES_PASSWORD" | xargs)"
  if [ -n "$POSTGRES_USER" ] && [ -n "$POSTGRES_PASSWORD" ]; then
    export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${PG_HOST}:${PG_PORT}/${POSTGRES_DB}?schema=public"
    if [ -z "$BACKUP_DATABASE_URL" ]; then
      export BACKUP_DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${PG_HOST_DIRECT}:${PG_PORT_DIRECT}/${POSTGRES_DB}?schema=public"
    fi
  elif [ -n "$DATABASE_URL" ]; then
    export DATABASE_URL="$(rewrite_url_host_port "$DATABASE_URL" "$PG_HOST" "$PG_PORT")"
    if [ -z "$BACKUP_DATABASE_URL" ]; then
      export BACKUP_DATABASE_URL="$(rewrite_url_host_port "$DATABASE_URL" "$PG_HOST_DIRECT" "$PG_PORT_DIRECT")"
    fi
  fi

  if [ -n "$REDIS_URL" ]; then
    export REDIS_URL="$(rewrite_url_host_port "$REDIS_URL" "$REDIS_HOST" "$REDIS_PORT")"
  elif [ -n "$REDIS_PASSWORD" ]; then
    export REDIS_URL="redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}/${REDIS_DB}"
  fi

  echo "📋 Conexões:"
  echo "   PostgreSQL → $PG_HOST:$PG_PORT"
  echo "   Redis      → $REDIS_HOST:$REDIS_PORT (auth: ${REDIS_PASSWORD:+SIM (${#REDIS_PASSWORD} chars)}${REDIS_PASSWORD:-NÃO})"
  echo "📊 Debug Redis:"
  echo "   REDIS_HOST: ${REDIS_HOST}"
  echo "   REDIS_PORT: ${REDIS_PORT}"
  echo "   REDIS_DB: ${REDIS_DB}"
  REDIS_PASSWORD_MASKED="$(mask_secret "$REDIS_PASSWORD")"
  echo "   REDIS_PASSWORD mascara: ${REDIS_PASSWORD_MASKED}"

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

  NODE_ENV="${NODE_ENV:-production}"
  PG_HOST="${PG_HOST:-pgbouncer}"
  PG_PORT="${PG_PORT:-6432}"
  POSTGRES_DB="${POSTGRES_DB:-estacaoterapia}"
  REDIS_HOST="${REDIS_HOST:-estacaoterapia_redis}"
  REDIS_PORT="${REDIS_PORT:-6379}"
  REDIS_DB="${REDIS_DB:-1}"
  API_BASE_URL="${API_BASE_URL:-http://estacaoterapia_api:3333}"
  PG_HOST_FALLBACK="${PG_HOST_FALLBACK:-}"
  REDIS_HOST_FALLBACK="${REDIS_HOST_FALLBACK:-}"

  # Prioridade de senha Redis:
  # 1. REDIS_PASSWORD do environment (docker-stack.yml)
  # 2. Secret redis_password
  # 3. Do arquivo .env
  if [ -z "$REDIS_PASSWORD" ]; then
    if [ -f /run/secrets/redis_password ]; then
      REDIS_PASSWORD_FROM_SECRET="$(tr -d '\n\r' < /run/secrets/redis_password)"
      if [ -n "$REDIS_PASSWORD_FROM_SECRET" ]; then
        export REDIS_PASSWORD="$REDIS_PASSWORD_FROM_SECRET"
        echo "🔐 Senha Redis carregada do secret docker (${#REDIS_PASSWORD} chars)"
      else
        echo "⚠️  Secret redis_password está vazio, usando do .env se existir"
      fi
    else
      echo "⚠️  Secret redis_password não encontrado, usando do .env"
    fi
  else
    echo "🔐 Senha Redis definida via environment variable (${#REDIS_PASSWORD} chars)"
  fi

  # Resolver DNS com fallback (evita ENOTFOUND no Swarm)
  resolve_host_with_fallback "PG_HOST" "$PG_HOST" "$PG_HOST_FALLBACK" "tasks.pgbouncer pgbouncer estacaoterapia_pgbouncer" "PgBouncer"
  resolve_host_with_fallback "REDIS_HOST" "$REDIS_HOST" "$REDIS_HOST_FALLBACK" "tasks.redis estacaoterapia_redis redis" "Redis"

  # Exportar todas as variáveis necessárias
  export NODE_ENV PORT \
    PG_HOST PG_PORT POSTGRES_DB \
    POSTGRES_USER POSTGRES_PASSWORD \
    REDIS_HOST REDIS_PORT REDIS_DB REDIS_PASSWORD \
    JWT_SECRET CORS_ORIGIN \
    API_BASE_URL

  # Remover espaços em branco acidentais
  POSTGRES_USER="$(echo -n "$POSTGRES_USER" | xargs)"
  POSTGRES_PASSWORD="$(echo -n "$POSTGRES_PASSWORD" | xargs)"
  if [ -n "$POSTGRES_USER" ] && [ -n "$POSTGRES_PASSWORD" ]; then
    export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${PG_HOST}:${PG_PORT}/${POSTGRES_DB}?schema=public"
  elif [ -n "$DATABASE_URL" ]; then
    export DATABASE_URL="$(rewrite_url_host_port "$DATABASE_URL" "$PG_HOST" "$PG_PORT")"
  fi

  if [ -n "$REDIS_URL" ]; then
    export REDIS_URL="$(rewrite_url_host_port "$REDIS_URL" "$REDIS_HOST" "$REDIS_PORT")"
  elif [ -n "$REDIS_PASSWORD" ]; then
    export REDIS_URL="redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}/${REDIS_DB}"
  fi

  echo "📋 Conexões:"
  echo "   PostgreSQL → $PG_HOST:$PG_PORT"
  echo "   Redis      → $REDIS_HOST:$REDIS_PORT (auth: ${REDIS_PASSWORD:+SIM (${#REDIS_PASSWORD} chars)}${REDIS_PASSWORD:-NÃO})"
  echo "   API        → $API_BASE_URL"
  echo "📊 Debug Redis:"
  echo "   REDIS_HOST: ${REDIS_HOST}"
  echo "   REDIS_PORT: ${REDIS_PORT}"
  echo "   REDIS_DB: ${REDIS_DB}"
  REDIS_PASSWORD_MASKED="$(mask_secret "$REDIS_PASSWORD")"
  echo "   REDIS_PASSWORD mascara: ${REDIS_PASSWORD_MASKED}"

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
