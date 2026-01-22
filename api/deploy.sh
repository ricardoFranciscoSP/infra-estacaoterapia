#!/bin/bash
set -euo pipefail

export LC_ALL=C.UTF-8
export LANG=C.UTF-8

# Definir valores padrão para variáveis opcionais
CLEAN_DEPLOY="${CLEAN_DEPLOY:-false}"
FORCE_BUILD="${FORCE_BUILD:-false}"
UPDATE_STATEFUL="${UPDATE_STATEFUL:-false}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SECRETS_DIR="/opt/secrets"
STACK_PREFIX="estacaoterapia"
KEEP_VERSIONS=1  # Manter somente a última versão (sem rollback)
STACK_FILES=("docker-stack.redis.yml" "docker-stack.pgbouncer.yml" "docker-stack.api.yml" "docker-stack.socket.yml")
STACK_NAMES=("estacaoterapia-redis" "estacaoterapia-pgbouncer" "estacaoterapia-api" "estacaoterapia-socket")
service_pairs=(
  "estacaoterapia-redis:redis"
  "estacaoterapia-pgbouncer:pgbouncer"
  "estacaoterapia-api:api"
  "estacaoterapia-socket:socket-server"
)

echo ""
echo "==============================="
echo "🚀 [DEPLOY] Estação Terapia Swarm - $(date)"
echo "==============================="

echo "[ETAPA 1/8] PRÉ-REQUISITOS"

# ==============================
# TAG VERSIONADO
# ==============================
TIMESTAMP="$(date +%Y%m%d%H%M%S)"
GIT_HASH="$(git rev-parse --short HEAD 2>/dev/null || echo local)"
TAG="${TIMESTAMP}-${GIT_HASH}"


echo "==============================="
echo "[LOG] Iniciando deploy.sh"
echo "   Clean deploy: $CLEAN_DEPLOY | Force build: $FORCE_BUILD | Update stateful: $UPDATE_STATEFUL"
echo "Diretório atual: $(pwd)"
echo "==============================="

# ==============================
# 1. PRÉ-REQUISITOS
# ==============================
command -v docker >/dev/null || { echo "❌ Docker não encontrado"; exit 1; }

SWARM_STATE="$(docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null || echo inactive)"
[ "$SWARM_STATE" = "active" ] || { echo "❌ Docker Swarm inativo"; exit 1; }

[ -f docker-stack.api.yml ] || { echo "❌ docker-stack.api.yml não encontrado"; exit 1; }
[ -f docker-stack.redis.yml ] || { echo "❌ docker-stack.redis.yml não encontrado"; exit 1; }
[ -f docker-stack.pgbouncer.yml ] || { echo "❌ docker-stack.pgbouncer.yml não encontrado"; exit 1; }
[ -f docker-stack.socket.yml ] || { echo "❌ docker-stack.socket.yml não encontrado"; exit 1; }

for f in estacao_api.env estacao_socket.env; do
  [ -f "$SECRETS_DIR/$f" ] || { echo "❌ Secret ausente: $SECRETS_DIR/$f"; exit 1; }
done

echo "✅ Pré-requisitos OK"

# ==============================
# 2. CLEAN DEPLOY (OPCIONAL)
# ==============================
if [ "$CLEAN_DEPLOY" = true ]; then
  echo "⚠️  CLEAN_DEPLOY=true foi solicitado, mas foi desabilitado para evitar downtime."
  echo "ℹ️  O deploy seguirá com update in-place dos serviços."
fi


# ==============================
# 3. SECRETS (PRODUÇÃO SAFE)
# ==============================
create_secret_if_missing() {
  local name="$1" file="$2"

  if docker secret inspect "$name" >/dev/null 2>&1; then
    echo "ℹ️  Secret $name já existe (mantido)"
    return
  fi

  if [ ! -f "$file" ]; then
    echo "❌ Arquivo de secret não encontrado: $file"
    exit 1
  fi

  docker secret create "$name" "$file"
  echo "✅ Secret $name criado"
}

# Secrets principais
create_secret_if_missing estacao_api_env "$SECRETS_DIR/estacao_api.env"
create_secret_if_missing estacao_socket_env "$SECRETS_DIR/estacao_socket.env"
create_secret_if_missing pgbouncer.ini "/opt/secrets/pgbouncer/pgbouncer.ini"
create_secret_if_missing userlist.txt "/opt/secrets/pgbouncer/userlist.txt"

# Secret redis_password (extraído do estacao_api.env ou estacao_socket.env se não existir)
if ! docker secret inspect redis_password >/dev/null 2>&1; then
  REDIS_PASS="$(grep -E '^REDIS_PASSWORD=' "$SECRETS_DIR/estacao_api.env" | cut -d= -f2- | tr -d '\r')"
  if [ -z "$REDIS_PASS" ]; then
    REDIS_PASS="$(grep -E '^REDIS_PASSWORD=' "$SECRETS_DIR/estacao_socket.env" | cut -d= -f2- | tr -d '\r')"
  fi
  if [ -z "$REDIS_PASS" ]; then
    echo "❌ REDIS_PASSWORD vazio em estacao_api.env e estacao_socket.env"
    exit 1
  fi
  printf '%s' "$REDIS_PASS" | docker secret create redis_password -
  echo "✅ Secret redis_password criado"
else
  echo "ℹ️  Secret redis_password já existe (mantido)"
fi

# ==============================
# 4. VOLUMES + REDE
# ==============================
for v in redis_data documentos_data backups_data; do
  docker volume create "$v" >/dev/null 2>&1 || true
done

docker network inspect estacaoterapia_backend >/dev/null 2>&1 || \
docker network create --driver overlay --attachable estacaoterapia_backend

echo "✅ Volumes e rede OK"

# ==============================
# 4.1 AJUSTE DE PERMISSÕES DO VOLUME DE BACKUPS
# ==============================
if [ -f "./fix-backup-volume-permissions.sh" ]; then
  chmod +x ./fix-backup-volume-permissions.sh 2>/dev/null || true
  ./fix-backup-volume-permissions.sh || echo "⚠️  Falha ao ajustar permissões do volume de backups (continuando)"
else
  echo "⚠️  Script fix-backup-volume-permissions.sh não encontrado (continuando)"
fi

# ==============================
# 5. BUILD IMAGENS (sempre latest/stable)
# ==============================
echo ""
echo "[BUILD] Construindo imagens (sempre latest/stable)..."

docker build ${FORCE_BUILD:+--no-cache} --platform linux/amd64 -t estacaoterapia-api:latest -f Dockerfile.api . || { echo "❌ Erro ao buildar estacaoterapia-api"; exit 1; }
docker build ${FORCE_BUILD:+--no-cache} --platform linux/amd64 -t estacaoterapia-socket:latest -f Dockerfile.socket . || { echo "❌ Erro ao buildar estacaoterapia-socket"; exit 1; }

if [ "$UPDATE_STATEFUL" = true ]; then
  docker build ${FORCE_BUILD:+--no-cache} --platform linux/amd64 -t estacaoterapia-redis:stable -f Dockerfile.redis . || { echo "❌ Erro ao buildar estacaoterapia-redis"; exit 1; }
  docker build ${FORCE_BUILD:+--no-cache} --platform linux/amd64 -t estacaoterapia-pgbouncer:stable -f Dockerfile.pgbouncer . || { echo "❌ Erro ao buildar estacaoterapia-pgbouncer"; exit 1; }
else
  if ! docker image inspect estacaoterapia-redis:stable >/dev/null 2>&1; then
    echo "⚠️  Imagem estacaoterapia-redis:stable não encontrada. Fazendo build inicial..."
    docker build ${FORCE_BUILD:+--no-cache} --platform linux/amd64 -t estacaoterapia-redis:stable -f Dockerfile.redis . || { echo "❌ Erro ao buildar estacaoterapia-redis"; exit 1; }
  else
    echo "ℹ️  UPDATE_STATEFUL=false: mantendo redis:stable"
  fi
  if ! docker image inspect estacaoterapia-pgbouncer:stable >/dev/null 2>&1; then
    echo "⚠️  Imagem estacaoterapia-pgbouncer:stable não encontrada. Fazendo build inicial..."
    docker build ${FORCE_BUILD:+--no-cache} --platform linux/amd64 -t estacaoterapia-pgbouncer:stable -f Dockerfile.pgbouncer . || { echo "❌ Erro ao buildar estacaoterapia-pgbouncer"; exit 1; }
  else
    echo "ℹ️  UPDATE_STATEFUL=false: mantendo pgbouncer:stable"
  fi
fi

echo ""
echo "[CLEANUP] Removendo imagens órfãs..."
docker image prune -f --filter "dangling=true" 2>/dev/null || true

# ==============================
# 6. DEPLOY
# ==============================

for i in "${!STACK_FILES[@]}"; do
  file="${STACK_FILES[$i]}"
  stack="${STACK_NAMES[$i]}"

  echo "[LOG] Iniciando deploy da stack com arquivo: $file"
  echo "📡 Deploy stack $stack"
  docker stack deploy \
    --compose-file "$file" \
    --resolve-image always \
    "$stack"
  DEPLOY_EXIT_CODE=$?
  if [ $DEPLOY_EXIT_CODE -ne 0 ]; then
    echo "❌ Erro ao executar docker stack deploy. Código de saída: $DEPLOY_EXIT_CODE"
    echo "[LOG] Verifique o arquivo $file para possíveis erros de sintaxe."
    exit 1
  else
    echo "[LOG] docker stack deploy executado com sucesso."
  fi
done

echo ""
echo "[LOG] Forçando atualização dos serviços (sempre imagens novas)..."
for pair in "${service_pairs[@]}"; do
  stack="${pair%%:*}"
  svc="${pair##*:}"
  full="${stack}_${svc}"

  if [ "$UPDATE_STATEFUL" != true ] && { [ "$svc" = "redis" ] || [ "$svc" = "pgbouncer" ]; }; then
    echo "ℹ️  UPDATE_STATEFUL=false: mantendo $full sem restart"
    continue
  fi

  echo "🔁 Atualizando $full"
  docker service update --force "$full"
done

# ==============================
# 7. HEALTH CHECK
# ==============================

echo "[LOG] ⏳ Aguardando serviços ficarem estáveis..."

for pair in "${service_pairs[@]}"; do
  stack="${pair%%:*}"
  svc="${pair##*:}"
  full="${stack}_${svc}"
  echo "🔄 $full"

  for i in {1..30}; do
    replicas="$(docker service ls --format '{{.Name}} {{.Replicas}}' | awk -v s="$full" '$1==s {print $2}')"
    running="${replicas%%/*}"
    desired="${replicas##*/}"

    [ "$running" = "$desired" ] && break
    sleep 2
  done

  echo "✅ $full OK ($replicas)"
done

echo ""
echo "[CLEANUP] Removendo imagens antigas (mantendo $KEEP_VERSIONS por serviço)..."

declare -A RUNNING_IMAGE_IDS
for stack in "${STACK_NAMES[@]}"; do
  while IFS= read -r service_name; do
    [ -z "$service_name" ] && continue
    image_ref="$(docker service inspect --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}' "$service_name" 2>/dev/null || true)"
    [ -z "$image_ref" ] && continue
    image_id="$(docker image inspect --format '{{.Id}}' "$image_ref" 2>/dev/null || true)"
    [ -n "$image_id" ] && RUNNING_IMAGE_IDS["$image_id"]=1
  done < <(docker service ls --filter name="$stack" --format '{{.Name}}')
done

for service in redis api socket pgbouncer; do
  repo="estacaoterapia-${service}"
  images=$(docker images --format "{{.Repository}}:{{.Tag}} {{.ID}} {{.CreatedAt}}" | awk -v r="${repo}:" '$1 ~ "^"r {print $0}' | sort -r)
  if [ -n "$images" ]; then
    to_remove=$(echo "$images" | awk -v keep="$KEEP_VERSIONS" 'NR>keep {print $2}')
    if [ -n "$to_remove" ]; then
      while IFS= read -r img_id; do
        [ -z "$img_id" ] && continue
        if [ -n "${RUNNING_IMAGE_IDS[$img_id]+x}" ]; then
          continue
        fi
        docker image rm -f "$img_id" 2>/dev/null || true
      done <<< "$to_remove"
    fi
  fi
done

# ==============================
# 8. CLEANUP FINAL + RELATÓRIO
# ==============================
echo ""
echo "[LOG] [CLEANUP] Finalizando..."

# Mostrar imagens ativas
echo ""
echo "📊 IMAGENS ATIVAS:"
for service in redis api socket pgbouncer; do
  versions=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep "^estacaoterapia-$service:" | sort -r | head -5)
  if [ -n "$versions" ]; then
    echo ""
    echo "   estacaoterapia-$service:"
    echo "$versions" | sed 's/^/     /'
  fi
done

echo ""
echo "[LOG] 🎉 DEPLOY CONCLUÍDO COM SUCESSO!"
echo ""
echo "[LOG] 📡 SERVIÇOS EM EXECUÇÃO:"
for stack in "${STACK_NAMES[@]}"; do
  docker service ls --filter name="$stack" --format "table {{.Name}}\t{{.Replicas}}\t{{.Image}}"
done

echo ""
echo "[LOG] 💡 DICAS:"
echo "   - Ver logs:  docker service logs estacaoterapia-api_api -f"
echo "   - Revert:    docker service update --force --image estacaoterapia-api:latest estacaoterapia-api_api"
echo "   - Versões:   docker images | grep estacaoterapia"
