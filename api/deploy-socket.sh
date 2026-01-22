#!/bin/bash
# Deploy individual do Socket Server no Swarm
set -euo pipefail
STACK_NAME="estacaoterapia-socket"
SERVICE="socket-server"
YML="$(dirname "$0")/docker-stack.socket.yml"

echo "[INFO] Fazendo deploy do serviço Socket Server..."
docker stack deploy -c "$YML" "$STACK_NAME"
echo "[INFO] Forçando update do serviço Socket Server..."
docker service update --force "${STACK_NAME}_${SERVICE}"
echo "[SUCCESS] Socket Server atualizado."
