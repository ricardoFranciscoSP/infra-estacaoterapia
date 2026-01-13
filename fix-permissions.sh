#!/bin/bash
###############################################################################
# fix-permissions.sh - Corrige permissões de todos os scripts
###############################################################################

set -e

echo "🔧 Corrigindo permissões dos scripts..."

# Scripts da raiz
chmod +x deploy-all.sh prepare-deploy.sh debug-deploy.sh start.sh 2>/dev/null || true

# Scripts da API
chmod +x api/deploy.sh api/cleanup-old-replicas.sh api/entrypoint.sh 2>/dev/null || true

# Scripts do Frontend
chmod +x estacao/deploy-stack.sh estacao/deploy.sh 2>/dev/null || true
chmod +x estacao/diagnose-service.sh estacao/diagnose-traefik.sh 2>/dev/null || true
chmod +x estacao/get-latest-tag.sh estacao/validate-deployment.sh 2>/dev/null || true

echo "✅ Permissões corrigidas com sucesso!"
echo ""
echo "📋 Verificando permissões dos scripts principais:"
ls -lh deploy-all.sh api/deploy.sh estacao/deploy-stack.sh 2>/dev/null | awk '{print $1, $9}'
