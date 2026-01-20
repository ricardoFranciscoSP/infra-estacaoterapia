#!/bin/bash
# Deploy individual da API no Swarm
set -euo pipefail
STACK_NAME="estacaoterapia_api"
SERVICE="api"
YML="$(dirname "$0")/docker-stack.yml"

echo "[INFO] Fazendo deploy do serviço API..."
docker stack deploy -c "$YML" "$STACK_NAME"
echo "[INFO] Forçando update do serviço API..."
docker service update --force "${STACK_NAME}_${SERVICE}"
echo "[SUCCESS] API atualizada."
