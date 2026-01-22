#!/bin/bash
# Deploy individual da API no Swarm
set -euo pipefail
STACK_NAME="estacaoterapia-api"
SERVICE="api"
YML="$(dirname "$0")/docker-stack.api.yml"

if [ -f "$(dirname "$0")/fix-backup-volume-permissions.sh" ]; then
  echo "[INFO] Ajustando permissões do volume de backups..."
  chmod +x "$(dirname "$0")/fix-backup-volume-permissions.sh" 2>/dev/null || true
  "$(dirname "$0")/fix-backup-volume-permissions.sh" || echo "⚠️  Falha ao ajustar permissões (continuando)"
else
  echo "⚠️  Script fix-backup-volume-permissions.sh não encontrado (continuando)"
fi

echo "[INFO] Fazendo deploy do serviço API..."
docker stack deploy -c "$YML" "$STACK_NAME"
echo "[INFO] Forçando update do serviço API..."
docker service update --force "${STACK_NAME}_${SERVICE}"
echo "[SUCCESS] API atualizada."
