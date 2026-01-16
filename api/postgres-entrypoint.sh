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

# 🔁 Restauração automática se o banco estiver vazio
BACKUP_FILE="/backups/estacaoterapia_prd.sql"
if [ -f "$BACKUP_FILE" ]; then
  echo "🔎 Verificando conteúdo do banco '$POSTGRES_DB'..."
  TABLE_COUNT=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT count(*) FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema');" 2>/dev/null || echo 0)

  if [ "${TABLE_COUNT:-0}" -eq 0 ]; then
    echo "♻️  Banco está vazio. Restaurando backup inicial..."
    if PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$BACKUP_FILE"; then
      echo "✅ Restauração concluída a partir de $BACKUP_FILE"
    else
      echo "❌ Falha ao restaurar backup ($BACKUP_FILE)"; exit 1;
    fi
  else
    echo "✅ Banco já possui tabelas (${TABLE_COUNT}); nenhuma restauração necessária"
  fi
else
  echo "⚠️  Backup não encontrado em $BACKUP_FILE (pulei restauração)"
fi

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
