#!/bin/sh
set -e

echo "Carregando configuracao do Redis..."

# Ler senha do secret redis_password
if [ -f /run/secrets/redis_password ]; then
  REDIS_PASSWORD=$(cat /run/secrets/redis_password | tr -d '\n\r')
  echo "Senha carregada do secret redis_password"
else
  echo "AVISO: Secret redis_password nao encontrado, Redis sera iniciado sem senha"
  REDIS_PASSWORD=""
fi

# Configurar variaveis padrao
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_MAXMEMORY="${REDIS_MAXMEMORY:-512mb}"
REDIS_MAXMEMORY_POLICY="${REDIS_MAXMEMORY_POLICY:-allkeys-lru}"

echo ""
echo "Configuracao Redis verificada:"
echo "   - Porta: $REDIS_PORT"
echo "   - MaxMemory: $REDIS_MAXMEMORY"
echo "   - Politica: $REDIS_MAXMEMORY_POLICY"
if [ -n "$REDIS_PASSWORD" ]; then
  echo "   - Senha: definida ($(echo -n "$REDIS_PASSWORD" | wc -c) caracteres)"
else
  echo "   - Senha: nao definida"
fi
echo ""

# Tentar configurar vm.overcommit_memory (opcional)
if [ -w /proc/sys/vm/overcommit_memory ]; then
  echo 1 > /proc/sys/vm/overcommit_memory 2>/dev/null || true
  echo "vm.overcommit_memory configurado"
else
  echo "AVISO: Nao foi possivel configurar vm.overcommit_memory"
fi

echo "Iniciando Redis..."
echo ""

# Construir comando Redis
if [ -n "$REDIS_PASSWORD" ]; then
  exec redis-server \
    --port "$REDIS_PORT" \
    --requirepass "$REDIS_PASSWORD" \
    --appendonly yes \
    --appendfsync everysec \
    --maxmemory "$REDIS_MAXMEMORY" \
    --maxmemory-policy "$REDIS_MAXMEMORY_POLICY" \
    --save 900 1 \
    --save 300 10 \
    --save 60 10000 \
    --tcp-backlog 511 \
    --timeout 300 \
    --tcp-keepalive 300
else
  exec redis-server \
    --port "$REDIS_PORT" \
    --appendonly yes \
    --appendfsync everysec \
    --maxmemory "$REDIS_MAXMEMORY" \
    --maxmemory-policy "$REDIS_MAXMEMORY_POLICY" \
    --save 900 1 \
    --save 300 10 \
    --save 60 10000 \
    --tcp-backlog 511 \
    --timeout 300 \
    --tcp-keepalive 300
fi
