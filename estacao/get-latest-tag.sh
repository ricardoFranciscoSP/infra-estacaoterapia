#!/bin/bash
###############################################################################
# get-latest-tag.sh - Obtém a tag mais recente da imagem
###############################################################################

IMAGE_NAME="estacaoterapia-next-prd"

# Busca a tag mais recente (formato timestamp)
LATEST_TAG=$(docker images "${IMAGE_NAME}" --format "{{.Tag}}" 2>/dev/null | grep -E "^[0-9]{8}-[0-9]{6}$" | sort -r | head -1)

if [ -z "$LATEST_TAG" ]; then
    # Se não encontrar tag com timestamp, usa latest
    LATEST_TAG="latest"
    echo "${IMAGE_NAME}:${LATEST_TAG}"
    echo ""
    echo "⚠️  Nenhuma tag com timestamp encontrada, usando 'latest'"
else
    echo "${IMAGE_NAME}:${LATEST_TAG}"
    echo ""
    echo "✅ Tag mais recente encontrada: ${LATEST_TAG}"
fi

# Mostra todas as tags disponíveis
echo ""
echo "📋 Todas as tags disponíveis:"
docker images "${IMAGE_NAME}" --format "  - {{.Tag}} ({{.CreatedAt}})" 2>/dev/null | head -10
