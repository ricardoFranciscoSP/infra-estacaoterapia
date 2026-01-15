#!/bin/bash
set -euo pipefail

echo "======================================"
echo "🔐 Redis Swarm EntryPoint v2.0"
echo "======================================"

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

echo "📋 Config: Port=$REDIS_PORT | MaxMem=$REDIS_MAXMEMORY | Policy=$REDIS_MAXMEMORY_POLICY | Auth=$([ -n "$REDIS_PASSWORD" ] && echo "SIM" || echo "NÃO")"

# 🔧 overcommit para BullMQ (non-blocking)
if [ "$(id -u)" = '0' ]; then
  echo 1 >/proc/sys/vm/overcommit_memory || true
  sysctl vm.overcommit_memory=1 || true
  echo "✅ vm.overcommit configurado"
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
