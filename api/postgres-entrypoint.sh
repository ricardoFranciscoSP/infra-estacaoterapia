#!/bin/sh
set -e

echo "🔐 Carregando secrets do Postgres"

if [ -f /run/secrets/postgres.env ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      ""|\#*) continue ;;
    esac
    export "$line"
  done < /run/secrets/postgres.env
fi

# 🔎 DEBUG (não remove ainda)
echo "📋 Variáveis carregadas:"
env | grep -E 'POSTGRES_|PGDATA' || true

echo "🚀 Iniciando Postgres"
exec docker-entrypoint.sh postgres \
  -c max_connections=200 \
  -c shared_buffers=256MB \
  -c effective_cache_size=1GB \
  -c maintenance_work_mem=64MB \
  -c checkpoint_completion_target=0.9 \
  -c wal_buffers=16MB \
  -c default_statistics_target=100 \
  -c random_page_cost=1.1 \
  -c effective_io_concurrency=200 \
  -c work_mem=4MB \
  -c min_wal_size=1GB \
  -c max_wal_size=4GB \
  -c max_worker_processes=4 \
  -c max_parallel_workers_per_gather=2 \
  -c max_parallel_workers=4 \
  -c max_parallel_maintenance_workers=2
