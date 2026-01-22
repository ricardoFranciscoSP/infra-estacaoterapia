#!/bin/bash
# Deploy individual da API no Swarm
set -euo pipefail
STACK_NAME="estacaoterapia-api"
SERVICE="api"
YML="$(dirname "$0")/docker-stack.api.yml"
SCRIPT_DIR="$(dirname "$0")"

BUILD_IMAGE="${BUILD_IMAGE:-true}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
IMAGE_NAME="estacaoterapia-api:${IMAGE_TAG}"

if [ -f "$SCRIPT_DIR/fix-backup-volume-permissions.sh" ]; then
  echo "[INFO] Ajustando permissões do volume de backups..."
  chmod +x "$SCRIPT_DIR/fix-backup-volume-permissions.sh" 2>/dev/null || true
  "$SCRIPT_DIR/fix-backup-volume-permissions.sh" || echo "⚠️  Falha ao ajustar permissões (continuando)"
else
  echo "⚠️  Script fix-backup-volume-permissions.sh não encontrado (continuando)"
fi

if [ "$BUILD_IMAGE" = "true" ]; then
  echo "[INFO] Build da imagem da API..."
  docker build \
    --pull \
    --progress=plain \
    -t "$IMAGE_NAME" \
    -f "$SCRIPT_DIR/Dockerfile.api" \
    "$SCRIPT_DIR"
  echo "[INFO] Imagem gerada: $IMAGE_NAME"
else
  echo "⚠️  Build desativado (BUILD_IMAGE=false). Usando imagem existente: $IMAGE_NAME"
fi

echo "[INFO] Fazendo deploy do serviço API..."
docker stack deploy --resolve-image always -c "$YML" "$STACK_NAME"
echo "[INFO] Forçando update do serviço API..."
docker service update --force --image "$IMAGE_NAME" "${STACK_NAME}_${SERVICE}"

echo "[INFO] Verificando status do serviço..."
docker service ps "${STACK_NAME}_${SERVICE}" --no-trunc || true

echo "[SUCCESS] API atualizada."
