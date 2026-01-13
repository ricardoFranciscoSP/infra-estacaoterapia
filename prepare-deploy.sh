#!/bin/bash
###############################################################################
# prepare-deploy.sh - Prepara ambiente para deploy
# Garante que todos os scripts tenham permissão de execução
###############################################################################

set -e

echo "🔧 Preparando ambiente para deploy..."

# Lista de scripts que devem ser executáveis
SCRIPTS=(
    "deploy-all.sh"
    "start.sh"
    "api/deploy.sh"
    "api/entrypoint.sh"
    "api/cleanup-old-replicas.sh"
    "estacao/deploy.sh"
    "estacao/deploy-stack.sh"
    "estacao/diagnose-service.sh"
    "estacao/diagnose-traefik.sh"
    "estacao/get-latest-tag.sh"
    "estacao/validate-deployment.sh"
)

# Contador
TOTAL=0
SUCCESS=0
NOTFOUND=0

echo ""
echo "📋 Verificando scripts..."

for script in "${SCRIPTS[@]}"; do
    TOTAL=$((TOTAL + 1))
    if [ -f "$script" ]; then
        chmod +x "$script" 2>/dev/null && {
            echo "  ✅ $script"
            SUCCESS=$((SUCCESS + 1))
        } || {
            echo "  ⚠️  $script (falha ao dar permissão)"
        }
    else
        echo "  ⏭️  $script (não encontrado)"
        NOTFOUND=$((NOTFOUND + 1))
    fi
done

echo ""
echo "📊 Resumo:"
echo "   Total verificados: $TOTAL"
echo "   Preparados: $SUCCESS"
echo "   Não encontrados: $NOTFOUND"

if [ "$SUCCESS" -gt 0 ]; then
    echo ""
    echo "✅ Ambiente preparado! Você pode executar:"
    echo "   ./deploy-all.sh"
fi
