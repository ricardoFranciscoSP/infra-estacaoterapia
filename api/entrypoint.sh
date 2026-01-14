#!/bin/sh
set -e

SERVER_TYPE="${SERVER_TYPE:-api}"

# =========================
# Função: carregar secrets
# =========================
load_secrets() {
  local secret_file="$1"
  [ -z "$secret_file" ] && return 0
  [ ! -f "$secret_file" ] && return 0

  echo "🔐 Carregando secrets: $secret_file"

  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      ""|\#*) continue ;;
    esac

    key="${line%%=*}"
    value="${line#*=}"

    case "$key" in
      ''|*[!A-Za-z0-9_]*|[0-9]*) continue ;;
    esac

    export "$key=$value"
  done < "$secret_file"
}

# =========================
# Função retry
# =========================
retry() {
  local n=0
  local max="${RETRY_MAX_ATTEMPTS:-30}"
  local delay="${RETRY_DELAY:-2}"

  until "$@"; do
    n=$((n + 1))
    if [ "$n" -ge "$max" ]; then
      echo "❌ Falha após $max tentativas"
      return 1
    fi
    echo "⏳ Retry $n/$max em ${delay}s..."
    sleep "$delay"
  done
}

# =========================
# Função: verificar se banco já foi restaurado
# =========================
check_database_restored() {
  local pg_host="$1"
  local pg_port="$2"
  local db_name="$3"
  local pg_user="$4"
  local pg_pass="$5"

  echo "🔍 Verificando se banco de dados já foi restaurado..."

  # Verifica se existem tabelas no banco (indicando que já foi restaurado)
  export PGPASSWORD="$pg_pass"
  local table_count=$(psql -h "$pg_host" -p "$pg_port" -U "$pg_user" -d "$db_name" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')

  if [ -n "$table_count" ] && [ "$table_count" -gt 0 ]; then
    echo "✅ Banco de dados já foi restaurado ($table_count tabela(s) encontrada(s))"
    return 0
  else
    echo "ℹ️  Banco de dados ainda não foi restaurado (nenhuma tabela encontrada)"
    return 1
  fi
}

# =========================
# API
# =========================
start_api() {
  echo "🚀 Iniciando API"

  load_secrets /run/secrets/estacao_api.env
  echo "✅ Secrets carregados para API"

  # Priorizar senha do secret redis_password se disponível
  if [ -f /run/secrets/redis_password ]; then
    REDIS_PASSWORD=$(cat /run/secrets/redis_password | tr -d '\n\r')
    echo "✅ REDIS_PASSWORD carregada do secret redis_password"
  fi

  # Log das variáveis de ambiente que importam
  echo "📋 Variáveis de Ambiente Carregadas:"
  echo "   • REDIS_HOST: ${REDIS_HOST:-não definido}"
  echo "   • REDIS_PORT: ${REDIS_PORT:-não definido}"
  echo "   • REDIS_DB: ${REDIS_DB:-não definido}"
  echo "   • REDIS_PASSWORD: ${REDIS_PASSWORD:+definido ($(echo -n "$REDIS_PASSWORD" | wc -c) chars)}"
  echo "   • REDIS_URL: ${REDIS_URL:-não definido}"

  PG_HOST="${PG_HOST:-pgbouncer}"
  PG_PORT="${PG_PORT:-6432}"
  REDIS_HOST="${REDIS_HOST:-redis}"
  REDIS_PORT="${REDIS_PORT:-6379}"
  POSTGRES_DB="${POSTGRES_DB:-estacaoterapia}"

  echo "📋 Conexões (finais):"
  echo "   PostgreSQL → $PG_HOST:$PG_PORT"
  echo "   Redis      → $REDIS_HOST:$REDIS_PORT (auth: ${REDIS_PASSWORD:+SIM}${REDIS_PASSWORD:-NÃO})"

  # Tentar resolver host de Redis com alternativas comuns no Swarm
  echo "🔎 Checando Redis..."
  for candidate in "$REDIS_HOST" "tasks.$REDIS_HOST" "estacaoterapia_redis" "tasks.estacaoterapia_redis"; do
    if retry nc -z "$candidate" "$REDIS_PORT" >/dev/null 2>&1; then
      REDIS_HOST="$candidate"
      echo "✅ Redis acessível via: $REDIS_HOST"
      break
    fi
  done
  retry nc -z "$REDIS_HOST" "$REDIS_PORT"

  # Tentar resolver host de PgBouncer com alternativas (VIP e tasks)
  echo "🔎 Checando PgBouncer..."
  for candidate in "$PG_HOST" "tasks.$PG_HOST" "estacaoterapia_pgbouncer" "tasks.estacaoterapia_pgbouncer"; do
    if retry nc -z "$candidate" "$PG_PORT" >/dev/null 2>&1; then
      PG_HOST="$candidate"
      echo "✅ PgBouncer acessível via: $PG_HOST"
      break
    fi
  done
  retry nc -z "$PG_HOST" "$PG_PORT"

  if [ -n "$POSTGRES_USER" ] && [ -n "$POSTGRES_PASSWORD" ]; then
    DATABASE_URL="${DATABASE_URL:-postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${PG_HOST}:${PG_PORT}/${POSTGRES_DB}?schema=public}"
    export DATABASE_URL
    echo "✅ DATABASE_URL configurada"

    # Verificar se banco já foi restaurado antes de tentar restaurar
    if [ -n "$RESTORE_DB" ] && [ "$RESTORE_DB" = "true" ]; then
      if check_database_restored "$PG_HOST" "$PG_PORT" "$POSTGRES_DB" "$POSTGRES_USER" "$POSTGRES_PASSWORD"; then
        echo "⏭️  Pulando restauração - banco já foi restaurado anteriormente"
      else
        echo "📦 Iniciando restauração do banco de dados..."
        # Aqui você pode adicionar a lógica de restauração se necessário
        # Exemplo: psql -h "$PG_HOST" -p "$PG_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" < /app/backups/estacaoterapia_prd.sql
      fi
    fi
  fi

  # CRÍTICO: Exportar as variáveis de Redis antes de iniciar Node.js
  export REDIS_HOST
  export REDIS_PORT
  export REDIS_DB
  export REDIS_PASSWORD
  export REDIS_URL
  echo "✅ Variáveis Redis exportadas para Node.js"

  exec "$@"
}

# =========================
# SOCKET SERVER
# =========================
start_socket() {
  echo "🚀 Iniciando Socket Server"

  load_secrets /run/secrets/estacao_socket.env
  echo "✅ Secrets carregados para Socket"

  # Priorizar senha do secret redis_password se disponível
  if [ -f /run/secrets/redis_password ]; then
    REDIS_PASSWORD=$(cat /run/secrets/redis_password | tr -d '\n\r')
    echo "✅ REDIS_PASSWORD carregada do secret redis_password"
  fi

  # Log das variáveis de ambiente que importam
  echo "📋 Variáveis de Ambiente Carregadas:"
  echo "   • REDIS_HOST: ${REDIS_HOST:-não definido}"
  echo "   • REDIS_PORT: ${REDIS_PORT:-não definido}"
  echo "   • REDIS_DB: ${REDIS_DB:-não definido}"
  echo "   • REDIS_PASSWORD: ${REDIS_PASSWORD:+definido ($(echo -n "$REDIS_PASSWORD" | wc -c) chars)}"
  echo "   • REDIS_URL: ${REDIS_URL:-não definido}"

  PG_HOST="${PG_HOST:-pgbouncer}"
  PG_PORT="${PG_PORT:-6432}"
  REDIS_HOST="${REDIS_HOST:-redis}"
  REDIS_PORT="${REDIS_PORT:-6379}"
  API_BASE_URL="${API_BASE_URL:-http://api:3333}"

  echo "📋 Conexões (finais):"
  echo "   PostgreSQL → $PG_HOST:$PG_PORT"
  echo "   Redis      → $REDIS_HOST:$REDIS_PORT (auth: ${REDIS_PASSWORD:+SIM}${REDIS_PASSWORD:-NÃO})"
  echo "   API        → $API_BASE_URL"

  echo "🔎 Checando Redis..."
  for candidate in "$REDIS_HOST" "tasks.$REDIS_HOST" "estacaoterapia_redis" "tasks.estacaoterapia_redis"; do
    if retry nc -z "$candidate" "$REDIS_PORT" >/dev/null 2>&1; then
      REDIS_HOST="$candidate"
      echo "✅ Redis acessível via: $REDIS_HOST"
      break
    fi
  done
  retry nc -z "$REDIS_HOST" "$REDIS_PORT"

  echo "🔎 Checando PgBouncer..."
  for candidate in "$PG_HOST" "tasks.$PG_HOST" "estacaoterapia_pgbouncer" "tasks.estacaoterapia_pgbouncer"; do
    if retry nc -z "$candidate" "$PG_PORT" >/dev/null 2>&1; then
      PG_HOST="$candidate"
      echo "✅ PgBouncer acessível via: $PG_HOST"
      break
    fi
  done
  retry nc -z "$PG_HOST" "$PG_PORT"

  API_HOST=$(echo "$API_BASE_URL" | sed 's|http://||;s|https://||' | cut -d: -f1)
  API_PORT=$(echo "$API_BASE_URL" | cut -d: -f3)

  echo "🔎 Checando API..."
  retry nc -z "$API_HOST" "${API_PORT:-3333}"

  # CRÍTICO: Exportar as variáveis de Redis antes de iniciar Node.js
  export REDIS_HOST
  export REDIS_PORT
  export REDIS_DB
  
  # Garantir que REDIS_PASSWORD está definida (pode estar vazia, mas deve estar exportada)
  if [ -z "$REDIS_PASSWORD" ]; then
    echo "⚠️  REDIS_PASSWORD não definida - Redis pode não estar configurado com senha"
  else
    echo "✅ REDIS_PASSWORD definida (${#REDIS_PASSWORD} caracteres)"
  fi
  export REDIS_PASSWORD
  
  # Construir REDIS_URL se não estiver definida e tiver senha
  if [ -z "$REDIS_URL" ] && [ -n "$REDIS_PASSWORD" ]; then
    REDIS_URL="redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}/${REDIS_DB:-1}"
    echo "✅ REDIS_URL construída automaticamente"
  fi
  export REDIS_URL
  
  echo "✅ Variáveis Redis exportadas para Node.js"

  exec "$@"
}

# =========================
# Dispatcher
# =========================
case "$SERVER_TYPE" in
  socket)
    start_socket "$@"
    ;;
  api|*)
    start_api "$@"
    ;;
esac
