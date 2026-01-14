#!/bin/sh
set -e

echo "======================================"
echo "🔐 Carregando configuração do Redis..."
echo "======================================"

# Ler senha do secret redis_password
if [ -f /run/secrets/redis_password ]; then
  REDIS_PASSWORD=$(cat /run/secrets/redis_password | tr -d '\n\r')
  echo "✅ Secret redis_password encontrado"
  echo "   🔍 Tamanho da senha: $(echo -n "$REDIS_PASSWORD" | wc -c) caracteres"
  if [ -z "$REDIS_PASSWORD" ]; then
    echo "   ⚠️  AVISO: Secret existe mas está vazio!"
    REDIS_PASSWORD=""
  else
    echo "   ✅ Senha carregada com sucesso"
    # Exportar para uso no healthcheck
    export REDIS_PASSWORD
  fi
else
  echo "⚠️  AVISO: Secret redis_password NÃO encontrado em /run/secrets/redis_password"
  echo "   📂 Verificando conteúdo de /run/secrets/..."
  ls -la /run/secrets/ 2>/dev/null || echo "   ❌ Diretório /run/secrets/ não existe!"
  REDIS_PASSWORD=""
fi

# Configurar variáveis padrão
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_MAXMEMORY="${REDIS_MAXMEMORY:-512mb}"
# IMPORTANTE: BullMQ requer 'noeviction' para funcionar corretamente
# 'allkeys-lru' pode causar perda de dados de jobs em filas
REDIS_MAXMEMORY_POLICY="${REDIS_MAXMEMORY_POLICY:-noeviction}"

echo ""
echo "📋 Configuração Redis verificada:"
echo "   • Porta: $REDIS_PORT"
echo "   • MaxMemory: $REDIS_MAXMEMORY"
echo "   • Política: $REDIS_MAXMEMORY_POLICY"
if [ -n "$REDIS_PASSWORD" ]; then
  echo "   • Senha: ✅ definida ($(echo -n "$REDIS_PASSWORD" | wc -c) caracteres)"
else
  echo "   • Senha: ❌ não definida"
fi
echo ""

# Tentar configurar vm.overcommit_memory (opcional)
if [ -w /proc/sys/vm/overcommit_memory ]; then
  if echo 1 > /proc/sys/vm/overcommit_memory 2>/dev/null; then
    echo "✅ vm.overcommit_memory configurado"
  fi
else
  echo "⚠️  AVISO: Não foi possível configurar vm.overcommit_memory (requer privilégios)"
fi

echo ""
echo "🚀 Iniciando Redis..."
echo ""

# Construir comando Redis
if [ -n "$REDIS_PASSWORD" ]; then
  echo "🔐 Redis será iniciado COM autenticação"
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
  echo "⚠️  Redis será iniciado SEM autenticação"
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
