
#!/bin/bash
set -euo pipefail
set -x

export LC_ALL=C.UTF-8
export LANG=C.UTF-8

# ==============================
# CONFIGURAÇÕES
# ==============================
FORCE_BUILD="${FORCE_BUILD:-false}"
UPDATE_STATEFUL="${UPDATE_STATEFUL:-false}"

SECRETS_DIR="/opt/secrets"
STACK_FILES=("docker-stack.redis.yml" "docker-stack.pgbouncer.yml" "docker-stack.api.yml" "docker-stack.socket.yml")
STACK_NAMES=("estacaoterapia-redis" "estacaoterapia-pgbouncer" "estacaoterapia-api" "estacaoterapia-socket")

KEEP_VERSIONS=2

# ==============================
# IDENTIDADE DA BUILD
# ==============================
TIMESTAMP="$(date +%Y%m%d%H%M%S)"
GIT_HASH="$(git rev-parse --short HEAD 2>/dev/null || echo local)"
TAG="${TIMESTAMP}-${GIT_HASH}"

echo ""
echo "=============================================="
echo "🚀 DEPLOY ESTACAOTERAPIA (SWARM)"
echo "🕒 $(date)"
echo "🏷️  TAG: $TAG"
echo "=============================================="

# ==============================
# PRÉ-REQUISITOS
# ==============================

command -v docker >/dev/null || { echo "❌ Docker não encontrado"; exit 1; }


SWARM_STATE="$(docker info --format '{{.Swarm.LocalNodeState}}')"
[ "$SWARM_STATE" = "active" ] || { echo "❌ Docker Swarm inativo"; exit 1; }


for f in "${STACK_FILES[@]}"; do
  [ -f "$f" ] || { echo "❌ Arquivo ausente: $f"; exit 1; }
done


for s in estacao_api.env estacao_socket.env; do
  [ -f "$SECRETS_DIR/$s" ] || { echo "❌ Secret ausente: $SECRETS_DIR/$s"; exit 1; }
done

echo "✅ Pré-requisitos OK"

# ==============================
# SECRETS
# ==============================
create_secret_if_missing() {
  local name="$1" file="$2"
  if docker secret inspect "$name" >/dev/null 2>&1; then
    return
  fi
  docker secret create "$name" "$file"
  echo "✅ Secret $name criado"
}

create_secret_if_missing estacao_api_env "$SECRETS_DIR/estacao_api.env"
create_secret_if_missing estacao_socket_env "$SECRETS_DIR/estacao_socket.env"
create_secret_if_missing pgbouncer.ini "$SECRETS_DIR/pgbouncer/pgbouncer.ini"
create_secret_if_missing userlist.txt "$SECRETS_DIR/pgbouncer/userlist.txt"

if ! docker secret inspect redis_password >/dev/null 2>&1; then
  REDIS_PASS="$(grep -E '^REDIS_PASSWORD=' "$SECRETS_DIR/estacao_api.env" | cut -d= -f2- | tr -d '\r')"
  [ -n "$REDIS_PASS" ] || { echo "❌ REDIS_PASSWORD vazio"; exit 1; }
  printf '%s' "$REDIS_PASS" | docker secret create redis_password -
  echo "✅ Secret redis_password criado"
fi

# ==============================
# VOLUMES E REDE
# ==============================

for v in redis_data documentos_data backups_data; do
  docker volume create "$v"
done


if ! docker network inspect estacaoterapia_backend >/dev/null 2>&1; then
  docker network create --driver overlay --attachable estacaoterapia_backend
fi

# ==============================
# BUILD IMAGENS (VERSIONADAS)
# ==============================
echo ""
echo "[BUILD] Construindo imagens versionadas"

docker build ${FORCE_BUILD:+--no-cache} \
  --platform linux/amd64 \
  -t estacaoterapia-api:${TAG} \
  -f Dockerfile.api . || exit 1

docker build ${FORCE_BUILD:+--no-cache} \
  --platform linux/amd64 \
  -t estacaoterapia-socket:${TAG} \
  -f Dockerfile.socket . || exit 1

docker tag estacaoterapia-api:${TAG} estacaoterapia-api:stable
docker tag estacaoterapia-socket:${TAG} estacaoterapia-socket:stable

if [ "$UPDATE_STATEFUL" = true ]; then
  docker build ${FORCE_BUILD:+--no-cache} \
    --platform linux/amd64 \
    -t estacaoterapia-redis:stable \
    -f Dockerfile.redis . || exit 1

  docker build ${FORCE_BUILD:+--no-cache} \
    --platform linux/amd64 \
    -t estacaoterapia-pgbouncer:stable \
    -f Dockerfile.pgbouncer . || exit 1
fi


# ==============================
# ATUALIZA TAG DA API NO YAML
# ==============================
echo ""
echo "[DEPLOY] Atualizando tag da API no docker-stack.api.yml"
cp docker-stack.api.yml docker-stack.api.yml.deploy
sed -i "s|estacaoterapia-api:.*|estacaoterapia-api:${TAG}|g" docker-stack.api.yml.deploy

# ==============================
# DEPLOY STACKS (SEM FORCE)
# ==============================
echo ""
echo "[DEPLOY] Aplicando stacks"

for i in "${!STACK_FILES[@]}"; do
  stack_file="${STACK_FILES[$i]}"
  # Usa o arquivo modificado para a API
  if [[ "$stack_file" == "docker-stack.api.yml" ]]; then
    stack_file="docker-stack.api.yml.deploy"
  fi
  docker stack deploy \
    --compose-file "$stack_file" \
    --resolve-image always \
    "${STACK_NAMES[$i]}"
done

# ==============================
# AGUARDAR SERVIÇOS
# ==============================
echo ""
echo "[HEALTH] Aguardando serviços ficarem prontos..."

for stack in "${STACK_NAMES[@]}"; do
  while read -r svc; do
    echo "⏳ $svc"
    for i in {1..30}; do
      replicas="$(docker service ls --filter name="$svc" --format '{{.Replicas}}')"
      [ -z "$replicas" ] && break
      running="${replicas%%/*}"
      desired="${replicas##*/}"
      [ "$running" = "$desired" ] && break
      sleep 2
    done
    echo "✅ $svc OK ($replicas)"
  done < <(docker service ls --filter name="$stack" --format '{{.Name}}')
done

# ==============================
# LIMPEZA DE IMAGENS ANTIGAS
# ==============================
echo ""
echo "[CLEANUP] Limpando imagens antigas"

declare -A RUNNING_IMAGES
while read -r img; do

  id="$(docker image inspect --format '{{.Id}}' "$img")"
  [ -n "$id" ] && RUNNING_IMAGES["$id"]=1
done < <(docker service inspect --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}' $(docker service ls -q))

for repo in estacaoterapia-api estacaoterapia-socket; do
  docker images "$repo" --format '{{.ID}} {{.CreatedAt}}' | \
  sort -r | awk "NR>${KEEP_VERSIONS} {print \$1}" | while read -r img; do
    [ -z "${RUNNING_IMAGES[$img]+x}" ] && docker image rm -f "$img"
  done
done

# ==============================
# RELATÓRIO FINAL
# ==============================
echo ""
echo "=============================================="
echo "🎉 DEPLOY CONCLUÍDO COM SUCESSO"
echo "=============================================="
echo ""
docker service ls --format "table {{.Name}}\t{{.Replicas}}\t{{.Image}}"

echo ""
echo "💡 DICAS:"
echo "  Logs API: docker service logs estacaoterapia-api_api -f"
echo "  Rollback:"
echo "    docker service update --image estacaoterapia-api:<TAG_ANTIGA> estacaoterapia-api_api"
echo ""
