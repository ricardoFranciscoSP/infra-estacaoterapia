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

STACK_FILES=(
  "docker-stack.redis.yml"
  "docker-stack.pgbouncer.yml"
  "docker-stack.api.yml"
  "docker-stack.socket.yml"
)

STACK_NAMES=(
  "estacaoterapia-redis"
  "estacaoterapia-pgbouncer"
  "estacaoterapia-api"
  "estacaoterapia-socket"
)

KEEP_VERSIONS=2

# ==============================
# IDENTIDADE DA BUILD
# ==============================
TIMESTAMP="$(date +%Y%m%d%H%M%S)"
GIT_HASH="$(git rev-parse --short HEAD 2>/dev/null || echo local)"
TAG="${TIMESTAMP}-${GIT_HASH}"

echo ""
echo "=============================================="
echo "🚀 DEPLOY ESTACAOTERAPIA (DOCKER SWARM)"
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

for s in postgres.env pgbouncer/pgbouncer.ini pgbouncer/userlist.txt; do
  [ -f "$SECRETS_DIR/$s" ] || { echo "❌ Secret ausente: $SECRETS_DIR/$s"; exit 1; }
done

echo "✅ Pré-requisitos OK"

# ==============================
# LIMPEZA CONTAINERS FORA DO SWARM
# ==============================
echo ""
echo "[CLEANUP] Removendo containers fora do Swarm"

declare -A SWARM_CONTAINERS
while read -r c; do
  [ -n "$c" ] && SWARM_CONTAINERS["$c"]=1
done < <(docker ps -q --filter "label=com.docker.swarm.service.name")

while read -r c; do
  if [ -n "$c" ] && [ -z "${SWARM_CONTAINERS[$c]+x}" ]; then
    echo "🗑️ Removendo container standalone: $c"
    docker rm -f "$c"
  fi
done < <(docker ps -q)

# ==============================
# REMOVER STACKS ANTIGOS
# ==============================
echo ""
echo "[CLEANUP] Removendo stacks antigos (garantia de unicidade)"

for stack in "${STACK_NAMES[@]}"; do
  if docker stack ls --format '{{.Name}}' | grep -q "^$stack$"; then
    echo "🧹 Removendo stack: $stack"
    docker stack rm "$stack"
    sleep 12
  fi
done

# ==============================
# SECRETS
# ==============================
create_secret_if_missing() {
  local name="$1"
  local file="$2"

  if docker secret inspect "$name" >/dev/null 2>&1; then
    return
  fi

  docker secret create "$name" "$file"
  echo "✅ Secret $name criado"
}

create_secret_if_missing estacao_api_env "$SECRETS_DIR/estacao_api.env"
create_secret_if_missing estacao_socket_env "$SECRETS_DIR/estacao_socket.env"
create_secret_if_missing postgres_env "$SECRETS_DIR/postgres.env"
create_secret_if_missing pgbouncer.ini "$SECRETS_DIR/pgbouncer/pgbouncer.ini"
create_secret_if_missing userlist.txt "$SECRETS_DIR/pgbouncer/userlist.txt"

if ! docker secret inspect redis_password >/dev/null 2>&1; then
  REDIS_PASS="$(grep -E '^REDIS_PASSWORD=' "$SECRETS_DIR/estacao_api.env" | cut -d= -f2- | tr -d '\r')"
  [ -n "$REDIS_PASS" ] || { echo "❌ REDIS_PASSWORD vazio"; exit 1; }
  printf '%s' "$REDIS_PASS" | docker secret create redis_password -
  echo "✅ Secret redis_password criado"
fi

echo ""
echo "[SECRETS] Validando secrets no Swarm"
REQUIRED_SECRETS=(
  "estacao_api_env"
  "estacao_socket_env"
  "postgres_env"
  "pgbouncer.ini"
  "userlist.txt"
  "redis_password"
)

for s in "${REQUIRED_SECRETS[@]}"; do
  docker secret inspect "$s" >/dev/null 2>&1 || {
    echo "❌ Secret não encontrado no Swarm: $s"
    exit 1
  }
done
echo "✅ Todos os secrets disponíveis"

# ==============================
# VOLUMES E REDE
# ==============================
for v in redis_data documentos_data backups_data; do
  docker volume create "$v" >/dev/null
done

if ! docker network inspect estacaoterapia_backend >/dev/null 2>&1; then
  docker network create --driver overlay --attachable estacaoterapia_backend
fi

# ==============================
# BUILD IMAGENS
# ==============================
echo ""
echo "[BUILD] Construindo imagens"

docker build ${FORCE_BUILD:+--no-cache} \
  --platform linux/amd64 \
  -t estacaoterapia-api:${TAG} \
  -f Dockerfile.api .

docker build ${FORCE_BUILD:+--no-cache} \
  --platform linux/amd64 \
  -t estacaoterapia-socket:${TAG} \
  -f Dockerfile.socket .

docker tag estacaoterapia-api:${TAG} estacaoterapia-api:stable
docker tag estacaoterapia-socket:${TAG} estacaoterapia-socket:stable

if [ "$UPDATE_STATEFUL" = true ]; then
  docker build --platform linux/amd64 -t estacaoterapia-redis:stable -f Dockerfile.redis .
  docker build --platform linux/amd64 -t estacaoterapia-pgbouncer:stable -f Dockerfile.pgbouncer .
fi

# ==============================
# ATUALIZAR TAG DA API
# ==============================
echo ""
echo "[DEPLOY] Atualizando tag da API"

cp docker-stack.api.yml docker-stack.api.yml.deploy
sed -i "s|estacaoterapia-api:.*|estacaoterapia-api:${TAG}|g" docker-stack.api.yml.deploy

# ==============================
# DEPLOY STACKS
# ==============================
echo ""
echo "[DEPLOY] Aplicando stacks"

for i in "${!STACK_FILES[@]}"; do
  file="${STACK_FILES[$i]}"
  [ "$file" = "docker-stack.api.yml" ] && file="docker-stack.api.yml.deploy"

  docker stack deploy \
    --compose-file "$file" \
    --resolve-image always \
    "${STACK_NAMES[$i]}"
done

# ==============================
# AGUARDAR SERVIÇOS
# ==============================
echo ""
echo "[HEALTH] Aguardando serviços"

for stack in "${STACK_NAMES[@]}"; do
  while read -r svc; do
    for i in {1..30}; do
      replicas="$(docker service ls --filter name="$svc" --format '{{.Replicas}}')"
      [ -z "$replicas" ] && break
      [ "${replicas%%/*}" = "${replicas##*/}" ] && break
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
declare -A RUNNING_IMAGE_NAMES
while read -r img; do
  id="$(docker image inspect --format '{{.Id}}' "$img")"
  RUNNING_IMAGES["$id"]=1
  RUNNING_IMAGE_NAMES["$img"]=1
done < <(docker service inspect --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}' $(docker service ls -q))

while read -r img; do
  [ -z "$img" ] && continue
  id="$(docker image inspect --format '{{.Id}}' "$img")"
  RUNNING_IMAGES["$id"]=1
  RUNNING_IMAGE_NAMES["$img"]=1
done < <(docker ps --format '{{.Image}}')

if [ "${#RUNNING_IMAGE_NAMES[@]}" -gt 0 ]; then
  echo "🔒 Imagens em uso (preservadas):"
  for name in "${!RUNNING_IMAGE_NAMES[@]}"; do
    echo " - $name"
  done
fi

for repo in estacaoterapia-api estacaoterapia-socket; do
  docker images "$repo" --format '{{.ID}} {{.CreatedAt}}' \
  | sort -r \
  | awk "NR>${KEEP_VERSIONS} {print \$1}" \
  | while read -r img; do
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

docker service ls --format "table {{.Name}}\t{{.Replicas}}\t{{.Image}}"

echo ""
echo "📦 Containers ativos:"
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"

echo ""
echo "💡 Logs API:"
echo "docker service logs estacaoterapia-api_api -f"
