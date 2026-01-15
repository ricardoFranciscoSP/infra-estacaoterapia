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
# Função retry com timeout
# =========================
retry() {
  local n=0
  local max="${RETRY_MAX_ATTEMPTS:-10}"
  local delay="${RETRY_DELAY:-1}"
  local timeout_cmd="${RETRY_TIMEOUT:-5}"

  until timeout "$timeout_cmd" "$@" >/dev/null 2>&1; do
    n=$((n + 1))
    if [ "$n" -ge "$max" ]; then
      echo "⚠️  Comando não respondeu após $max tentativas"
      return 0  # Não bloqueia - app faz retry interno
    fi
    sleep "$delay"
  done
  return 0
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

  # Exportar TODAS as variáveis do secret para o ambiente Node.js
  # Ambiente
  export NODE_ENV
  export PORT
  
  # Segurança
  export JWT_SECRET
  export REFRESH_SECRET
  export ENCRYPTION_KEY
  
  # URLs
  export URL_FRONT
  export FRONTEND_URL
  export BASE_URL
  export SOCKET_URL
  export CORS_ENV
  
  # Supabase
  export SUPABASE_URL
  export SUPABASE_ANON_KEY
  export SUPABASE_SERVICE_ROLE_KEY
  export SUPABASE_STORAGE_REGION
  export SUPABASE_BUCKET
  export SUPABASE_BUCKET_PUBLIC
  
  # Google OAuth
  export GOOGLE_CLIENT_ID
  
  # Agora (RTC/RTM)
  export AGORA_APP_ID
  export AGORA_APP_CERTIFICATE
  
  # Vindi
  export VINDI_API_KEY_PRIVADA
  export VINDI_API_KEY_PUBLICA
  export VINDI_API_URL
  
  # Email (Brevo)
  export BREVO_API_KEY
  export EMAIL_FROM
  export EMAIL_FROM_NAME
  
  # Integrações externas
  export TOKEN_INFO_SIMPLES_API_KEY
  
  # PostgreSQL (serão atualizados após resolução do host)
  export POSTGRES_USER
  export POSTGRES_PASSWORD
  export POSTGRES_DB

  echo "✅ Variáveis de secrets exportadas para Node.js"

  # Priorizar senha do secret redis_password se disponível
  if [ -f /run/secrets/redis_password ]; then
    REDIS_PASSWORD=$(cat /run/secrets/redis_password | tr -d '\n\r')
    echo "✅ REDIS_PASSWORD carregada do secret redis_password"
  fi

  # Log das variáveis de ambiente que importam
  echo "📋 Variáveis de Ambiente Carregadas:"
  echo "   • NODE_ENV: ${NODE_ENV:-não definido}"
  echo "   • PORT: ${PORT:-não definido}"
  echo "   • REDIS_HOST: ${REDIS_HOST:-não definido}"
  echo "   • REDIS_PORT: ${REDIS_PORT:-não definido}"
  echo "   • REDIS_DB: ${REDIS_DB:-não definido}"
  echo "   • REDIS_PASSWORD: ${REDIS_PASSWORD:+definido ($(echo -n "$REDIS_PASSWORD" | wc -c) chars)}"
  echo "   • REDIS_URL: ${REDIS_URL:-não definido}"
  echo "   • DATABASE_URL: ${DATABASE_URL:+definido}"
  echo "   • JWT_SECRET: ${JWT_SECRET:+definido}"
  echo "   • SUPABASE_URL: ${SUPABASE_URL:-não definido}"
  echo "   • VINDI_API_URL: ${VINDI_API_URL:-não definido}"

  # ⚠️ IMPORTANTE: Forçar uso das variáveis de ambiente do docker-stack.yml
  # Sobrescrever valores do secret com os do Swarm (se definidos)
  [ -n "$PG_HOST" ] || PG_HOST="pgbouncer"
  [ -n "$PG_PORT" ] || PG_PORT="6432"
  [ -n "$REDIS_HOST" ] || REDIS_HOST="estacaoterapia_redis"
  [ -n "$REDIS_PORT" ] || REDIS_PORT="6379"
  [ -n "$REDIS_DB" ] || REDIS_DB="1"
  [ -n "$POSTGRES_DB" ] || POSTGRES_DB="estacaoterapia"

  # Garantir que REDIS_HOST use o valor do docker-stack.yml (não do secret)
  # O docker-stack.yml define REDIS_HOST=estacaoterapia_redis
  echo "🔧 Validando REDIS_HOST do Swarm..."
  if [ "$REDIS_HOST" = "redis" ] || [ "$REDIS_HOST" = "localhost" ]; then
    echo "⚠️  REDIS_HOST=$REDIS_HOST detectado no secret - sobrescrevendo com nome Swarm"
    REDIS_HOST="estacaoterapia_redis"
  fi
  echo "✅ Usando REDIS_HOST: $REDIS_HOST"

  # Exportar variáveis do PostgreSQL e Redis ANTES de tentar conectar
  export PG_HOST
  export PG_PORT
  export POSTGRES_DB
  export REDIS_HOST
  export REDIS_PORT
  export REDIS_DB

  echo "📋 Variáveis de Conexão:"
  echo "   PostgreSQL → $PG_HOST:$PG_PORT"
  echo "   Redis      → $REDIS_HOST:$REDIS_PORT (db: $REDIS_DB)"

  # Diagnóstico rápido e não bloqueante
  echo "📡 Diagnóstico de rede (não bloqueante):"
  
  # Tentar resolver Redis via getent (mais simples e confiável)
  REDIS_IP=$(getent hosts "$REDIS_HOST" 2>/dev/null | awk '{print $1}' | head -1)
  if [ -n "$REDIS_IP" ]; then
    echo "✅ DNS resolvido: $REDIS_HOST → $REDIS_IP"
  else
    echo "ℹ️  DNS: $REDIS_HOST (ainda não resolvido, app fará retry)"
  fi
  
  # Mostrar nameservers se disponível
  if [ -f /etc/resolv.conf ]; then
    echo "   • DNS Servers: $(grep '^nameserver' /etc/resolv.conf | awk '{print $2}' | tr '\n' ',' | sed 's/,$//')"
  fi

  # Check não bloqueante: tenta conectar mas não bloqueia
  echo "🔎 Verificando conectividade (timeout 3s):"
  if timeout 3 nc -z "$REDIS_HOST" "$REDIS_PORT" 2>/dev/null; then
    echo "✅ Redis acessível: $REDIS_HOST:$REDIS_PORT"
  else
    echo "⚠️  Redis não respondeu (será reconectado pelo app automaticamente)"
  fi

  # Check PgBouncer não bloqueante
  if timeout 3 nc -z "$PG_HOST" "$PG_PORT" 2>/dev/null; then
    echo "✅ PgBouncer acessível: $PG_HOST:$PG_PORT"
  else
    echo "⚠️  PgBouncer não respondeu (será reconectado pelo app automaticamente)"
  fi

  # Exportar PG_HOST novamente após resolução
  export PG_HOST
  echo "✅ PG_HOST=$PG_HOST exportado"

  # Configurar DATABASE_URL
  if [ -n "$POSTGRES_USER" ] && [ -n "$POSTGRES_PASSWORD" ]; then
    DATABASE_URL="${DATABASE_URL:-postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${PG_HOST}:${PG_PORT}/${POSTGRES_DB}?schema=public}"
    export DATABASE_URL
    echo "✅ DATABASE_URL: postgresql://$POSTGRES_USER@$PG_HOST:$PG_PORT/$POSTGRES_DB"

    # Verificar se banco já foi restaurado (não bloqueante)
    if [ -n "$RESTORE_DB" ] && [ "$RESTORE_DB" = "true" ]; then
      if timeout 5 check_database_restored "$PG_HOST" "$PG_PORT" "$POSTGRES_DB" "$POSTGRES_USER" "$POSTGRES_PASSWORD" 2>/dev/null; then
        echo "⏭️  Banco de dados já restaurado"
      else
        echo "ℹ️  Restauração não necessária ou pendente"
      fi
    fi
  fi

  # Exportar as variáveis de Redis (crítico para Node.js)
  export REDIS_HOST
  export REDIS_PORT
  export REDIS_DB
  export REDIS_PASSWORD
  
  # Construir REDIS_URL se não existir
  if [ -z "$REDIS_URL" ] && [ -n "$REDIS_PASSWORD" ]; then
    REDIS_URL="redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}/${REDIS_DB:-1}"
  fi
  [ -n "$REDIS_URL" ] && export REDIS_URL
  
  echo "✅ Variáveis Redis exportadas para Node.js"
  echo "🚀 Iniciando aplicação Node.js (app fará retry interno em caso de indisponibilidade)"

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
  # Usar full service name do Swarm: estacaoterapia_redis
  REDIS_HOST="${REDIS_HOST:-estacaoterapia_redis}"
  REDIS_PORT="${REDIS_PORT:-6379}"
  if [ -n "${API_BASE_URL_OVERRIDE:-}" ]; then
    API_BASE_URL="$API_BASE_URL_OVERRIDE"
  fi
  API_BASE_URL="${API_BASE_URL:-http://estacaoterapia_api:3333}"

  # Exportar variáveis do PostgreSQL
  export PG_HOST
  export PG_PORT

  echo "📋 Conexões (finais):"
  echo "   PostgreSQL → $PG_HOST:$PG_PORT"
  echo "   Redis      → $REDIS_HOST:$REDIS_PORT (auth: ${REDIS_PASSWORD:+SIM}${REDIS_PASSWORD:-NÃO})"
  echo "   API        → $API_BASE_URL"

  # Diagnóstico rápido e não bloqueante
  echo "📡 Diagnóstico de rede (não bloqueante):"
  
  # Tentar resolver Redis via DNS Swarm direto @127.0.0.11
  if command -v dig >/dev/null 2>&1; then
    REDIS_IP=$(dig +short @127.0.0.11 "$REDIS_HOST" A 2>/dev/null | head -1)
    if [ -n "$REDIS_IP" ]; then
      echo "✅ DNS Swarm: $REDIS_HOST → $REDIS_IP"
    else
      echo "ℹ️  DNS Swarm: $REDIS_HOST (ainda não resolvido, app fará retry)"
    fi
  fi
  
  # Mostrar nameservers se disponível
  if [ -f /etc/resolv.conf ]; then
    echo "   • DNS Servers: $(grep '^nameserver' /etc/resolv.conf | awk '{print $2}' | tr '\n' ',' | sed 's/,$//')"
  fi

  # Checks não bloqueantes (timeout 2s)
  echo "🔎 Verificando conectividade (timeout 2s):"
  
  if timeout 2 nc -z "$REDIS_HOST" "$REDIS_PORT" 2>/dev/null; then
    echo "✅ Redis acessível: $REDIS_HOST:$REDIS_PORT"
  else
    echo "⚠️  Redis não respondeu (será reconectado pelo app automaticamente)"
  fi

  if timeout 2 nc -z "$PG_HOST" "$PG_PORT" 2>/dev/null; then
    echo "✅ PgBouncer acessível: $PG_HOST:$PG_PORT"
  else
    echo "⚠️  PgBouncer não respondeu (será reconectado pelo app automaticamente)"
  fi

  # Extrair host e porta da API_BASE_URL
  API_HOST=$(echo "$API_BASE_URL" | sed 's|http://||;s|https://||' | cut -d: -f1)
  API_PORT=$(echo "$API_BASE_URL" | cut -d: -f3)
  API_PORT="${API_PORT:-3333}"

  if timeout 2 nc -z "$API_HOST" "$API_PORT" 2>/dev/null; then
    echo "✅ API acessível: $API_BASE_URL"
  else
    echo "⚠️  API não respondeu (será reconectada pelo app automaticamente)"
  fi

  # Exportar as variáveis de Redis (crítico para Node.js)
  export REDIS_HOST
  export REDIS_PORT
  export REDIS_DB
  export REDIS_PASSWORD
  
  # Construir REDIS_URL se não existir
  if [ -z "$REDIS_URL" ] && [ -n "$REDIS_PASSWORD" ]; then
    REDIS_URL="redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}/${REDIS_DB:-1}"
  fi
  [ -n "$REDIS_URL" ] && export REDIS_URL
  
  # Exportar API_BASE_URL
  export API_BASE_URL
  
  echo "✅ Variáveis exportadas para Node.js"
  echo "🚀 Iniciando Socket Server (app fará retry interno em caso de indisponibilidade)"

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
