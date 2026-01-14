#!/bin/sh
set -e

echo "🔐 Carregando secrets do PostgreSQL..."

# Carrega variáveis das secrets (Docker Swarm)
if [ -f /run/secrets/postgres_user ]; then
    export POSTGRES_USER=$(cat /run/secrets/postgres_user)
    echo "✓ POSTGRES_USER carregado do secret"
fi

if [ -f /run/secrets/postgres_password ]; then
    export POSTGRES_PASSWORD=$(cat /run/secrets/postgres_password)
    echo "✓ POSTGRES_PASSWORD carregado do secret"
fi

if [ -f /run/secrets/postgres_db ]; then
    export POSTGRES_DB=$(cat /run/secrets/postgres_db)
    echo "✓ POSTGRES_DB carregado do secret"
fi

# Validar variáveis obrigatórias
if [ -z "$POSTGRES_USER" ]; then
    echo "❌ ERRO: POSTGRES_USER não está definido!"
    exit 1
fi

if [ -z "$POSTGRES_PASSWORD" ]; then
    echo "❌ ERRO: POSTGRES_PASSWORD não está definido!"
    exit 1
fi

if [ -z "$POSTGRES_DB" ]; then
    echo "❌ ERRO: POSTGRES_DB não está definido!"
    exit 1
fi

echo ""
echo "📋 Credenciais verificadas:"
echo "   • Usuário: $POSTGRES_USER"
echo "   • Banco: $POSTGRES_DB"
echo "   • PGDATA: ${PGDATA:-/var/lib/postgresql/data/pgdata}"
echo ""
echo "🚀 Iniciando PostgreSQL..."
echo ""

# Executar comando original do postgres com argumentos de performance
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
