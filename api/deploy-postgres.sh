#!/bin/bash
# Deploy individual do Postgres no Swarm
set -euo pipefail
STACK_NAME="estacaoterapia_api"
SERVICE="postgres"
YML="$(dirname "$0")/docker-stack.yml"

echo "[INFO] Fazendo deploy do serviço Postgres..."
docker stack deploy -c "$YML" "$STACK_NAME"
echo "[INFO] Forçando update do serviço Postgres..."
docker service update --force "${STACK_NAME}_${SERVICE}"
echo "[SUCCESS] Postgres atualizado."
