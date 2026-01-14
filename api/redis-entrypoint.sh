#!/bin/sh
set -e

echo "🔐 Carregando configuração do Redis..."

# Carrega variáveis do arquivo estacao_api_env (Docker Swarm secret)
if [ -f /run/secrets/estacao_api_env ]; then
    echo "📄 Lendo /run/secrets/estacao_api_env..."
    set +e
    while IFS= read -r line; do
        # Pular linhas vazias e comentários
        case "$line" in
            ''|\#*) continue ;;
        esac
        # Exportar variável
        export "$line"
    done < /run/secrets/estacao_api_env
    set -e
    echo "✓ Variáveis carregadas do estacao_api_env"
else
    echo "❌ ERRO: /run/secrets/estacao_api_env não encontrado!"
    exit 1
fi

# Validar variável obrigatória
if [ -z "$REDIS_PASSWORD" ]; then
    echo "❌ ERRO: REDIS_PASSWORD não está definido!"
    exit 1
fi

echo ""
echo "📋 Configuração Redis verificada:"
echo "   • Porta: ${REDIS_PORT:-6379}"
echo "   • MaxMemory: ${REDIS_MAXMEMORY:-512mb}"
echo "   • Política: ${REDIS_MAXMEMORY_POLICY:-allkeys-lru}"
echo ""
echo "🚀 Iniciando Redis..."
echo ""

# Iniciar Redis com as configurações
exec redis-server \
  --requirepass "$REDIS_PASSWORD" \
  --appendonly yes \
  --maxmemory ${REDIS_MAXMEMORY:-512mb} \
  --maxmemory-policy ${REDIS_MAXMEMORY_POLICY:-allkeys-lru}
