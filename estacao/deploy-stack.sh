#!/bin/bash
###############################################################################
# deploy-stack.sh - Deploy Docker Swarm seguro (NUNCA ROOT)
###############################################################################

set -euo pipefail

# =========================
# SEGURANÇA CRÍTICA
# =========================
if [ "$EUID" -eq 0 ]; then
  echo "[FATAL] Este script NÃO pode ser executado como root ou sudo."
  echo "➡️  Execute como usuário: deploy"
  exit 1
fi

if [ "$(whoami)" != "deploy" ]; then
  echo "[FATAL] Usuário incorreto: $(whoami)"
  echo "➡️  Usuário esperado: deploy"
  exit 1
fi

if ! groups deploy | grep -q docker; then
  echo "[FATAL] Usuário deploy não pertence ao grupo docker"
  echo "➡️  Execute (como root, uma única vez):"
  echo "   usermod -aG docker deploy"
  exit 1
fi

# =========================
# CORES
# =========================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# =========================
# CONFIGURAÇÕES
# =========================
STACK_NAME="estacao"
SERVICE_NAME="estacao_next_prd"
IMAGE_NAME="estacaoterapia-next-prd"
# Gera tag única baseada em timestamp se não fornecida
if [ -z "${IMAGE_TAG:-}" ] || [ "${IMAGE_TAG:-}" = "latest" ]; then
  IMAGE_TAG="$(date +%Y%m%d-%H%M%S)"
fi
DOCKER_STACK_FILE="docker-stack.yml"
SECRETS_FILE="/opt/secrets/nextjs-prd.env"
MAX_HEALTH_CHECK_RETRIES=30
# Número de imagens antigas a manter (além da latest e da atual)
KEEP_OLD_IMAGES=5

# =========================
# LOGGING
# =========================
log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }

# =========================
# UID / GID DEPLOY
# =========================
DEPLOY_UID="$(id -u deploy)"
DEPLOY_GID="$(id -g deploy)"
DEPLOY_UID_GID="${DEPLOY_UID}:${DEPLOY_GID}"

# =========================
# PRÉ-REQUISITOS
# =========================
check_prerequisites() {
  log_info "Verificando pré-requisitos..."
  log_info "Diretório de trabalho: $(pwd)"

  command -v docker >/dev/null || {
    log_error "Docker não instalado"
    exit 1
  }

  docker info >/dev/null || {
    log_error "Docker não está acessível para o usuário deploy"
    exit 1
  }

  if ! docker info 2>/dev/null | grep -i "swarm" | grep -qi "active"; then
    log_error "Docker Swarm NÃO está ativo"
    log_info "➡️  Ative manualmente como root:"
    log_info "docker swarm init"
    exit 1
  fi

  [ -f "$DOCKER_STACK_FILE" ] || {
    log_error "Arquivo docker-stack.yml não encontrado no diretório atual: $(pwd)"
    log_error "Certifique-se de executar o script no diretório do projeto"
    exit 1
  }

  [ -f "$SECRETS_FILE" ] || {
    log_error "Secrets não encontrado: $SECRETS_FILE"
    exit 1
  }

  # Verificar e criar redes necessárias
  REQUIRED_NETWORKS=("estacao-network")
  
  for net in "${REQUIRED_NETWORKS[@]}"; do
    if ! docker network ls --format '{{.Name}}' | grep -q "^${net}$"; then
      log_warning "Rede Docker ausente: $net - Criando..."
      if docker network create --driver overlay "$net" 2>/dev/null; then
        log_success "Rede $net criada com sucesso"
      else
        log_error "Falha ao criar rede: $net"
        exit 1
      fi
    fi
  done

  log_success "Pré-requisitos OK"
}

# =========================
# VALIDAR ENV
# =========================
validate_env_vars() {
  log_info "Validando variáveis de ambiente..."

  set -a
  source "$SECRETS_FILE"
  set +a

  REQUIRED_VARS=(
    NEXT_PUBLIC_API_URL
    NEXT_PUBLIC_WEBSITE_URL
    NEXT_PUBLIC_SOCKET_URL
    NEXT_PUBLIC_VINDI_PUBLIC_KEY
    NEXT_PUBLIC_URL_VINDI_API
  )

  for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var:-}" ]; then
      log_error "Variável obrigatória ausente: $var"
      exit 1
    fi
  done

  log_success "Variáveis validadas"
}

# =========================
# BUILD IMAGEM
# =========================
build_image() {
  log_info "Build da imagem Docker com tag: ${IMAGE_TAG}"

  # Garantir que as variáveis estejam disponíveis
  set -a
  source "$SECRETS_FILE"
  set +a

  # Verificar se as variáveis foram carregadas
  if [ -z "${NEXT_PUBLIC_API_URL:-}" ] || [ -z "${NEXT_PUBLIC_VINDI_PUBLIC_KEY:-}" ]; then
    log_error "Variáveis de ambiente não foram carregadas corretamente"
    log_error "Verifique o arquivo: $SECRETS_FILE"
    exit 1
  fi

  log_info "Variáveis de ambiente carregadas com sucesso"

  # ⚠️ NUNCA usar cache - sempre fazer rebuild completo
  # Isso garante que todas as dependências e código sejam atualizados
  log_info "Iniciando build da imagem..."
  log_warning "🔴 Cache DESABILITADO - Será feito rebuild completo"
  log_info "Isso pode levar vários minutos..."
  log_info "Aguarde, o build está em andamento..."
  echo ""

  # Prepara os build args
  local build_args=(
    --no-cache
    --tag "${IMAGE_NAME}:${IMAGE_TAG}"
    --tag "${IMAGE_NAME}:latest"
    --build-arg "NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}"
    --build-arg "NEXT_PUBLIC_WEBSITE_URL=${NEXT_PUBLIC_WEBSITE_URL}"
    --build-arg "NEXT_PUBLIC_SOCKET_URL=${NEXT_PUBLIC_SOCKET_URL}"
    --build-arg "NEXT_PUBLIC_VINDI_PUBLIC_KEY=${NEXT_PUBLIC_VINDI_PUBLIC_KEY}"
    --build-arg "NEXT_PUBLIC_URL_VINDI_API=${NEXT_PUBLIC_URL_VINDI_API}"
  )

  # Adiciona --no-cache (sem cache args mais)
  # build_args já contém --no-cache no início

  # Verificar arquivos de lock antes do build
  log_info "Verificando gerenciador de pacotes..."
  if [ -f "yarn.lock" ]; then
    log_info "✓ yarn.lock encontrado - Usando Yarn"
  elif [ -f "package-lock.json" ]; then
    log_info "✓ package-lock.json encontrado - Usando NPM"
  else
    log_warning "Nenhum lock file encontrado - Usando NPM padrão"
  fi

  # Executa o build com progresso
  log_info "Executando docker build..."
  log_info "📁 Contexto: $(pwd)"
  log_info "📄 Dockerfile: ./Dockerfile"
  log_info "Build args: NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WEBSITE_URL, NEXT_PUBLIC_SOCKET_URL, NEXT_PUBLIC_VINDI_PUBLIC_KEY, NEXT_PUBLIC_URL_VINDI_API"
  log_info "📋 Arquivos disponíveis no contexto:"
  ls -la | grep -E "(package\.json|yarn\.lock|package-lock\.json|Dockerfile)" || true
  echo ""
  
  # Desabilita temporariamente o exit on error para capturar o código de retorno
  set +e
  docker build --progress=plain "${build_args[@]}" . 
  local build_exit_code=$?
  set -e
  
  echo ""

  if [ $build_exit_code -eq 0 ]; then
    log_success "Build concluído com sucesso!"
    log_success "Imagem criada: ${IMAGE_NAME}:${IMAGE_TAG}"
    
    # Verifica se a imagem foi realmente criada
    if docker images "${IMAGE_NAME}:${IMAGE_TAG}" --format "{{.Tag}}" 2>/dev/null | grep -q "^${IMAGE_TAG}$"; then
      log_success "Imagem verificada e pronta para deploy"
      docker images "${IMAGE_NAME}:${IMAGE_TAG}" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
    else
      log_error "Imagem não foi criada corretamente"
      log_error "Verifique os logs do Docker acima"
      exit 1
    fi
  else
    log_error "Falha no build da imagem Docker (código de saída: $build_exit_code)"
    log_error "Verifique os logs acima para mais detalhes"
    log_error ""
    log_error "📋 Debug - Arquivos no diretório:"
    ls -la | grep -E "(package\.json|yarn\.lock|package-lock\.json|Dockerfile)" || true
    log_error ""
    log_error "📋 Debug - Conteúdo do Dockerfile (primeiras 20 linhas):"
    head -20 Dockerfile || true
    exit 1
  fi
}

# =========================
# HEALTHCHECK SERVIÇO
# =========================
check_service_health() {
  local svc="$1"
  local retries=0

  while [ $retries -lt $MAX_HEALTH_CHECK_RETRIES ]; do
    local running
    running=$(docker service ps "$svc" --filter desired-state=running --format '{{.ID}}' | head -n1)

    if [ -n "$running" ]; then
      log_success "Serviço está rodando"
      return 0
    fi

    log_info "Aguardando serviço... ($retries/$MAX_HEALTH_CHECK_RETRIES)"
    sleep 5
    retries=$((retries + 1))
  done

  log_error "Timeout aguardando serviço"
  docker service ps "$svc" --no-trunc
  return 1
}

# =========================
# DEPLOY STACK
# =========================
deploy_stack() {
  log_info "Deploy do stack ${STACK_NAME}"
  export DEPLOY_UID_GID
  export IMAGE_TAG="${IMAGE_NAME}:${IMAGE_TAG}"

  docker stack deploy \
    -c "$DOCKER_STACK_FILE" \
    --with-registry-auth \
    "$STACK_NAME"

  sleep 15

  local svc="${STACK_NAME}_${SERVICE_NAME}"
  check_service_health "$svc"
}

# =========================
# LIMPAR IMAGENS ANTIGAS
# =========================
cleanup_old_images() {
  log_info "Limpando imagens antigas (mantendo últimas ${KEEP_OLD_IMAGES})..."

  # Lista todas as tags com timestamp (formato YYYYMMDD-HHMMSS)
  local old_tags
  old_tags=$(docker images "${IMAGE_NAME}" --format "{{.Tag}}" --filter "reference=${IMAGE_NAME}:*" | grep -E "^[0-9]{8}-[0-9]{6}$" | sort -r)

  if [ -z "$old_tags" ]; then
    log_info "Nenhuma imagem antiga encontrada"
    return 0
  fi

  # Conta quantas imagens existem
  local total_images
  if [ -n "$old_tags" ]; then
    total_images=$(echo "$old_tags" | wc -l | tr -d ' ')
  else
    total_images=0
  fi
  # Garantir que é um número válido
  total_images=${total_images:-0}

  # Se temos mais imagens do que queremos manter, remove as mais antigas
  if [ "$total_images" -gt "$KEEP_OLD_IMAGES" ] 2>/dev/null; then
    local to_remove
    to_remove=$(echo "$old_tags" | tail -n +$((KEEP_OLD_IMAGES + 1)))

    while IFS= read -r tag; do
      if [ "$tag" != "$IMAGE_TAG" ]; then
        log_info "Removendo imagem antiga: ${IMAGE_NAME}:${tag}"
        docker rmi "${IMAGE_NAME}:${tag}" 2>/dev/null || log_warning "Não foi possível remover ${IMAGE_NAME}:${tag} (pode estar em uso)"
      fi
    done <<< "$to_remove"

    log_success "Limpeza concluída"
  else
    log_info "Número de imagens dentro do limite (${total_images}/${KEEP_OLD_IMAGES})"
  fi

  # Limpar imagens dangling (órfãs)
  local dangling_images
  dangling_images=$(docker images -f "dangling=true" -q 2>/dev/null || echo "")
  
  if [ -n "$dangling_images" ]; then
    local dangling_count
    dangling_count=$(echo "$dangling_images" | wc -l | tr -d ' ')
    # Garantir que é um número válido
    dangling_count=${dangling_count:-0}
    
    if [ "$dangling_count" -gt 0 ] 2>/dev/null; then
      log_info "Removendo ${dangling_count} imagens dangling..."
      docker image prune -f >/dev/null 2>&1 || true
    fi
  fi
}

# =========================
# ROLLBACK
# =========================
rollback_stack() {
  log_warning "Rollback manual necessário"
  docker service ps "${STACK_NAME}_${SERVICE_NAME}"
}

# =========================
# TRATAMENTO DE PARÂMETROS
# =========================
handle_args() {
  while [[ $# -gt 0 ]]; do
    case $1 in
      --build|--rebuild)
        # Parâmetro aceito mas não necessário (sempre faz build)
        log_info "Build será executado"
        shift
        ;;
      *)
        log_warning "Parâmetro desconhecido ignorado: $1"
        shift
        ;;
    esac
  done
}

# =========================
# MAIN
# =========================
main() {
  log_info "===================================="
  log_info "Deploy seguro - usuário deploy"
  log_info "UID:GID ${DEPLOY_UID_GID}"
  log_info "===================================="

  check_prerequisites
  validate_env_vars
  build_image

  if deploy_stack; then
    log_success "DEPLOY FINALIZADO COM SUCESSO"
    docker stack services "$STACK_NAME"
    
    # Limpar imagens antigas após deploy bem-sucedido
    cleanup_old_images
  else
    log_error "DEPLOY FALHOU"
    rollback_stack
    exit 1
  fi
}

# Trata argumentos antes de executar main
handle_args "$@"
main
