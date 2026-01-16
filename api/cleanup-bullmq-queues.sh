#!/bin/bash
# Limpa e recria as filas BullMQ no build/deploy para evitar travamentos
# Uso: ./cleanup-bullmq-queues.sh

set -e

REDIS_HOST=${REDIS_HOST:-estacaoterapia_redis}
REDIS_PORT=${REDIS_PORT:-6379}
REDIS_DB=${REDIS_DB:-1}
REDIS_PASSWORD=${REDIS_PASSWORD:-}

# Lista de filas BullMQ a serem limpas
QUEUES=("delayedJobs" "databaseJobs" "notificationQueue" "consultationQueue" "agendaQueue" "webhookProcessor" "renovacaoQueue")

function redis_cli() {
  if [ -n "$REDIS_PASSWORD" ]; then
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -n "$REDIS_DB" -a "$REDIS_PASSWORD" "$@"
  else
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -n "$REDIS_DB" "$@"
  fi
}

echo "🧹 Limpando filas BullMQ no Redis $REDIS_HOST:$REDIS_PORT DB $REDIS_DB..."
for queue in "${QUEUES[@]}"; do
  echo "  → Limpando fila: $queue"
  # Remove todas as chaves relacionadas à fila
  KEYS=$(redis_cli keys "bull:$queue:*" | tr '\n' ' ')
  if [ -n "$KEYS" ]; then
    redis_cli del $KEYS
    echo "    • Chaves removidas: $KEYS"
  else
    echo "    • Nenhuma chave encontrada para $queue"
  fi
  # Remove event keys
  EVENTKEYS=$(redis_cli keys "$queue:events" | tr '\n' ' ')
  if [ -n "$EVENTKEYS" ]; then
    redis_cli del $EVENTKEYS
    echo "    • Chaves de eventos removidas: $EVENTKEYS"
  fi
  # Remove locks
  LOCKKEYS=$(redis_cli keys "bull:$queue:locks*" | tr '\n' ' ')
  if [ -n "$LOCKKEYS" ]; then
    redis_cli del $LOCKKEYS
    echo "    • Locks removidos: $LOCKKEYS"
  fi
  # Remove repeatable jobs
  REPEATKEYS=$(redis_cli keys "bull:$queue:repeat*" | tr '\n' ' ')
  if [ -n "$REPEATKEYS" ]; then
    redis_cli del $REPEATKEYS
    echo "    • Repeatables removidos: $REPEATKEYS"
  fi
  # Remove stalled jobs
  STALLEDKEYS=$(redis_cli keys "bull:$queue:stalled*" | tr '\n' ' ')
  if [ -n "$STALLEDKEYS" ]; then
    redis_cli del $STALLEDKEYS
    echo "    • Stalled removidos: $STALLEDKEYS"
  fi
  # Remove wait/active/completed/failed/delayed
  for suffix in wait active completed failed delayed; do
    KEY="bull:$queue:$suffix"
    redis_cli del "$KEY" 2>/dev/null || true
  done
done
echo "✅ Filas BullMQ limpas com sucesso."
