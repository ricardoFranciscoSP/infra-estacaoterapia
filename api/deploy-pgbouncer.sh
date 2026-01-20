#!/bin/bash
# Deploy individual do PgBouncer no Swarm
set -euo pipefail
STACK_NAME="estacaoterapia_api"
SERVICE="pgbouncer"
YML="$(dirname "$0")/docker-stack.yml"

echo "[INFO] Fazendo deploy do serviço PgBouncer..."
docker stack deploy -c "$YML" "$STACK_NAME"
echo "[INFO] Forçando update do serviço PgBouncer..."
docker service update --force "${STACK_NAME}_${SERVICE}"
echo "[SUCCESS] PgBouncer atualizado."
