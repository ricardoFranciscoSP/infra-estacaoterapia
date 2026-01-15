#!/bin/bash
set -euo pipefail

echo "🐘 [PG] PostgreSQL Swarm EntryPoint"

# 🔧 Carrega secrets
if [ -f /run/secrets/postgres_env ]; then
  echo "🔐 Lendo secrets..."
  export $(xargs < /run/secrets/postgres_env)
else
  echo "❌ /run/secrets/postgres_env ausente"
  exit 1
fi

# 🔧 Valida vars
: "${POSTGRES_USER:?POSTGRES_USER requerido}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD requerido}"
: "${POSTGRES_DB:?POSTGRES_DB requerido}"

echo "👤 $POSTGRES_USER | $POSTGRES_DB | PGDATA=${PGDATA:-/var/lib/postgresql/data/pgdata}"

# 🔧 Cria DB se não existe
until PGPASSWORD="$POSTGRES_PASSWORD" createdb -U "$POSTGRES_USER" "$POSTGRES_DB" 2>/dev/null || true; do
  echo "⏳ Aguardando PG inicial..."
  sleep 2
done

echo "✅ DB '$POSTGRES_DB' pronto"

# 🔧 Performance VPS/Swarm (PgBouncer compatível)
exec docker-entrypoint.sh postgres \
  -c config_file=/etc/postgresql/postgresql.conf \
  -c max_connections=150 \
  -c shared_buffers=128MB \
  -c effective_cache_size=512MB \
  -c maintenance_work_mem=64MB \
  -c checkpoint_completion_target=0.9 \
  -c wal_buffers=-1 \
  -c default_statistics_target=100 \
  -c random_page_cost=1.1 \
  -c work_mem=2MB \
  -c min_wal_size=512MB \
  -c max_wal_size=2GB \
  -c max_worker_processes=3 \
  -c max_parallel_workers=3 \
  -c log_min_duration_statement=1000 \
  -c log_statement=all \
  -c log_destination=stderr
