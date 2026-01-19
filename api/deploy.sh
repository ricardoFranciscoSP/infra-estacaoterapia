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
STACK_NAME="estacaoterapia"
KEEP_VERSIONS=1  # Manter última versão + 1 anterior (rollback)

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

echo "📦 Tag: prd-$TAG | Keep versions: $KEEP_VERSIONS"
echo "   Clean deploy: $CLEAN_DEPLOY | Force build: $FORCE_BUILD | Update stateful: $UPDATE_STATEFUL"

# ==============================
# 1. PRÉ-REQUISITOS
# ==============================
command -v docker >/dev/null || { echo "❌ Docker não encontrado"; exit 1; }

SWARM_STATE="$(docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null || echo inactive)"
[ "$SWARM_STATE" = "active" ] || { echo "❌ Docker Swarm inativo"; exit 1; }

[ -f docker-stack.yml ] || { echo "❌ docker-stack.yml não encontrado"; exit 1; }

for f in postgres.env estacao_api.env estacao_socket.env; do
  [ -f "$SECRETS_DIR/$f" ] || { echo "❌ Secret ausente: $SECRETS_DIR/$f"; exit 1; }
done

echo "✅ Pré-requisitos OK"

# ==============================
# 2. CLEAN DEPLOY (OPCIONAL)
# ==============================
if [ "$CLEAN_DEPLOY" = true ]; then
  echo "⚠️  CLEAN_DEPLOY=true pode causar downtime (stack será removida)"
  echo "🧹 Removendo stack anterior para deploy limpo..."
  docker stack rm "$STACK_NAME" || true
  sleep 10
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

  docker secret create "$name" "$file"
  echo "✅ Secret $name criado"
}

create_secret_if_missing postgres_env "$SECRETS_DIR/postgres.env"
create_secret_if_missing estacao_api_env "$SECRETS_DIR/estacao_api.env"
create_secret_if_missing estacao_socket_env "$SECRETS_DIR/estacao_socket.env"
create_secret_if_missing pgbouncer.ini "/opt/secrets/pgbouncer/pgbouncer.ini"
create_secret_if_missing userlist.txt "/opt/secrets/pgbouncer/userlist.txt"

# ==============================
# Redis password (especial)
# ==============================
if ! docker secret inspect redis_password >/dev/null 2>&1; then
  REDIS_PASS="$(grep -E '^REDIS_PASSWORD=' "$SECRETS_DIR/estacao_api.env" | cut -d= -f2- | tr -d '\r')"

  if [ -z "$REDIS_PASS" ]; then
    echo "❌ REDIS_PASSWORD vazio em estacao_api.env"
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
for v in postgres_data redis_data documentos_data; do
  docker volume create "$v" >/dev/null 2>&1 || true
done

docker network inspect estacaoterapia_backend >/dev/null 2>&1 || \
docker network create --driver overlay --attachable estacaoterapia_backend

echo "✅ Volumes e rede OK"

# ==============================
# 5. BUILD IMAGENS COM VERSIONAMENTO
# ==============================
echo ""
echo "[BUILD] Construindo imagens versionadas..."

build_image() {
  local name="$1"
  local extra_tag="${2:-}"
  local image_name="estacaoterapia-$name"
  
  echo "   📦 $image_name:prd-$TAG"
  docker build \
    ${FORCE_BUILD:+--no-cache} \
    --platform linux/amd64 \
    -t "$image_name:prd-$TAG" \
    -f "Dockerfile.$name" . || {
      echo "   ❌ Erro ao buildar $image_name"
      exit 1
    }
  
  # Tag como 'latest' também (para fácil referência)
  docker tag "$image_name:prd-$TAG" "$image_name:latest"
  if [ -n "$extra_tag" ]; then
    docker tag "$image_name:prd-$TAG" "$image_name:$extra_tag"
  fi
  echo "   ✅ $image_name:prd-$TAG (também tagged como latest)"
}

if [ "$UPDATE_STATEFUL" = true ]; then
  build_image redis stable
else
  if ! docker image inspect estacaoterapia-redis:stable >/dev/null 2>&1; then
    echo "⚠️  Imagem estacaoterapia-redis:stable não encontrada. Fazendo build inicial..."
    build_image redis stable
  else
    echo "ℹ️  UPDATE_STATEFUL=false: mantendo redis:stable"
  fi
fi
build_image api
build_image socket
if [ "$UPDATE_STATEFUL" = true ]; then
  build_image pgbouncer stable
else
  if ! docker image inspect estacaoterapia-pgbouncer:stable >/dev/null 2>&1; then
    echo "⚠️  Imagem estacaoterapia-pgbouncer:stable não encontrada. Fazendo build inicial..."
    build_image pgbouncer stable
  else
    echo "ℹ️  UPDATE_STATEFUL=false: mantendo pgbouncer:stable"
  fi
fi

# ==============================
# 5.1 LIMPEZA DE VERSÕES ANTIGAS
# ==============================
echo ""
echo "[CLEANUP] Removendo versões antigas (mantendo $KEEP_VERSIONS mais recentes)..."

cleanup_old_images() {
  local prefix="$1"
  local to_remove
  
  # Listar tags prd-* ordenadas, pegar as antigas (skip as KEEP_VERSIONS mais recentes)
  to_remove=$(docker images --format "{{.Repository}}:{{.Tag}}" | \
    grep "^$prefix:prd-" | \
    sort -r | \
    tail -n +$((KEEP_VERSIONS + 1)))
  
  if [ -z "$to_remove" ]; then
    echo "   ℹ️  Nenhuma versão antiga para remover ($prefix)"
    return
  fi
  
  echo "$to_remove" | while read -r image; do
    echo "   🗑️  Removendo $image"
    docker rmi "$image" 2>/dev/null || true
  done
}

for service in redis api socket pgbouncer; do
  cleanup_old_images "estacaoterapia-$service"
done

# Remove dangling images
echo "   🧹 Removendo imagens órfãs..."
docker image prune -f --filter "dangling=true" 2>/dev/null || true

# ==============================
# 6. DEPLOY
# ==============================
STACK_TMP="docker-stack-$TAG.yml"
cp docker-stack.yml "$STACK_TMP"
sed -i "s/{{TAG}}/$TAG/g" "$STACK_TMP"

echo "📡 Deploy stack $STACK_NAME"
docker stack deploy \
  --compose-file "$STACK_TMP" \
  --resolve-image always \
  "$STACK_NAME"

# ==============================
# 7. HEALTH CHECK
# ==============================
echo "⏳ Aguardando serviços..."

services=(postgres pgbouncer redis api socket-server)

for svc in "${services[@]}"; do
  full="${STACK_NAME}_${svc}"
  echo "🔄 $full"

  for i in {1..30}; do
    replicas="$(docker service ls --format '{{.Name}} {{.Replicas}}' | awk -v s="$full" '$1==s {print $2}')"
    running="${replicas%%/*}"
    desired="${replicas##*/}"

    [ "$running" = "$desired" ] && break
    sleep 2
  done

  echo "✅ $svc OK ($replicas)"
done

# ==============================
# 8. CLEANUP FINAL + RELATÓRIO
# ==============================
echo ""
echo "[CLEANUP] Finalizando..."
rm -f "$STACK_TMP"

# Mostrar versões ativas e disponíveis
echo ""
echo "📊 VERSÕES DISPONÍVEIS:"
for service in redis api socket pgbouncer; do
  versions=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep "^estacaoterapia-$service:prd-" | sort -r | head -5)
  if [ -n "$versions" ]; then
    echo ""
    echo "   estacaoterapia-$service:"
    echo "$versions" | sed 's/^/     /'
  fi
done

echo ""
echo "🎉 DEPLOY CONCLUÍDO COM SUCESSO!"
echo ""
echo "📡 SERVIÇOS EM EXECUÇÃO:"
docker service ls --filter name="$STACK_NAME" --format "table {{.Name}}\t{{.Replicas}}\t{{.Image}}"

echo ""
echo "💡 DICAS:"
echo "   - Ver logs:  docker service logs estacaoterapia_api -f"
echo "   - Revert:    docker service update --force --image estacaoterapia-api:prd-TAG estacaoterapia_api"
echo "   - Versões:   docker images | grep estacaoterapia"
