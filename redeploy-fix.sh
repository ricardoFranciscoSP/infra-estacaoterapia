#!/bin/bash
set -euo pipefail

echo "=================================="
echo "REDEPLOY COM HEALTHCHECKS CORRIGIDOS"
echo "=================================="
echo ""

# Parar os serviços antigos
echo "🛑 Removendo stack antiga..."
docker stack rm estacaoterapia || echo "Stack não encontrada, continuando..."

echo "⏳ Aguardando limpeza (30s)..."
sleep 30

# Verificar se limpou tudo
echo "🔍 Verificando serviços restantes..."
docker service ls --filter "label=com.docker.stack.namespace=estacaoterapia" || echo "✅ Stack limpa"

# Fazer o deploy novamente
echo ""
echo "🚀 Iniciando novo deploy..."
cd /opt/estacao/api  # Ajuste o caminho conforme necessário
bash deploy-fixed.sh

echo ""
echo "✅ Deploy finalizado!"
echo ""
echo "Próximos passos:"
echo "  1. Aguarde 3-5 minutos para os healthchecks passarem"
echo "  2. Monitore com: docker service ls"
echo "  3. Verifique status: docker service ps estacaoterapia_api"
echo "  4. Veja logs: docker service logs estacaoterapia_api -f"
