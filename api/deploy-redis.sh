#!/bin/bash
# Deploy individual do Redis no Swarm
set -euo pipefail
STACK_NAME="estacaoterapia_api"
SERVICE="redis"
YML="$(dirname "$0")/docker-stack.yml"

echo "[INFO] Fazendo deploy do serviço Redis..."
docker stack deploy -c "$YML" "$STACK_NAME"
echo "[INFO] Forçando update do serviço Redis..."
docker service update --force "${STACK_NAME}_${SERVICE}"
echo "[SUCCESS] Redis atualizado."
