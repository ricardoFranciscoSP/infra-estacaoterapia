#!/bin/bash
set -euo pipefail

echo "======================================"
echo "🔐 Redis Swarm EntryPoint v2.0"
echo "======================================"

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

# 🔧 Carregar secrets em formato .env (se existir)
load_secrets /run/secrets/redis_env

# 🔧 Ler secret com retry (Swarm mount timing)
for i in {1..5}; do
  if [ -f /run/secrets/redis_password ]; then
    REDIS_PASSWORD=$(cat /run/secrets/redis_password | tr -d '\n\r ')
    echo "✅ Secret carregado (${#REDIS_PASSWORD} chars)"
    break
  fi
  echo "⏳ Tentativa $i/5: aguardando secret..."
  sleep 1
done || {
  echo "⚠️ Secret NÃO encontrado - Redis sem auth"
  REDIS_PASSWORD=""
}

# 🔧 Configs production
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_MAXMEMORY="${REDIS_MAXMEMORY:-400mb}"  # 🔧 Sync com resources 512M limit
REDIS_MAXMEMORY_POLICY="${REDIS_MAXMEMORY_POLICY:-noeviction}"  # 🔧 BullMQ safe

# 🔧 Exportar variáveis para o runtime
export REDIS_PASSWORD
export REDIS_PORT
export REDIS_MAXMEMORY
export REDIS_MAXMEMORY_POLICY

if [ -z "${REDIS_URL:-}" ] && [ -n "${REDIS_PASSWORD:-}" ]; then
  REDIS_URL="redis://:${REDIS_PASSWORD}@127.0.0.1:${REDIS_PORT}/0"
fi
export REDIS_URL

echo "📋 Config: Port=$REDIS_PORT | MaxMem=$REDIS_MAXMEMORY | Policy=$REDIS_MAXMEMORY_POLICY | Auth=$([ -n "$REDIS_PASSWORD" ] && echo "SIM" || echo "NÃO")"

# 🔧 overcommit para BullMQ (non-blocking)
if [ "$(id -u)" = '0' ]; then
  echo 1 >/proc/sys/vm/overcommit_memory || true
  sysctl vm.overcommit_memory=1 || true
  echo "✅ vm.overcommit configurado"
fi

# 🔧 Evitar duplicar "redis-server" vindo do CMD
if [ "${1:-}" = "redis-server" ]; then
  shift
fi

# 🔧 Redis command otimizado Swarm
exec redis-server \
  --port "$REDIS_PORT" \
  $( [ -n "$REDIS_PASSWORD" ] && echo "--requirepass '$REDIS_PASSWORD'" ) \
  --appendonly yes \
  --appendfsync everysec \
  --maxmemory "$REDIS_MAXMEMORY" \
  --maxmemory-policy "$REDIS_MAXMEMORY_POLICY" \
  --save 900 1 \
  --save 300 10 \
  --save 60 10000 \
  --tcp-backlog 511 \
  --timeout 0 \
  --tcp-keepalive 60 \
  --protected-mode no \
  --supervised systemd \
  --daemonize no \
  "$@"
