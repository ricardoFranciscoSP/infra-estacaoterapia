#!/bin/bash
###############################################################################
# cleanup-deploy.sh - Limpeza segura de disco pós-deploy
# Remove containers parados, redes órfãs, imagens dangling e cache de build.
###############################################################################

set -euo pipefail

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[CLEANUP]${NC} $1"; }
log_success() { echo -e "${GREEN}[CLEANUP]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[CLEANUP]${NC} $1"; }

log_info "Iniciando limpeza pós-deploy..."

if ! command -v docker >/dev/null 2>&1; then
  log_warning "Docker não encontrado, pulando limpeza"
  exit 0
fi

# Containers parados
log_info "Removendo containers parados..."
docker container prune -f >/dev/null 2>&1 || true

# Imagens dangling (órfãs)
log_info "Removendo imagens dangling..."
docker image prune -f --filter "until=24h" >/dev/null 2>&1 || true

# Cache de build antigo
log_info "Removendo cache de build antigo..."
docker builder prune -f --filter "until=24h" >/dev/null 2>&1 || true

# Redes órfãs
log_info "Removendo redes órfãs..."
docker network prune -f >/dev/null 2>&1 || true

log_success "Limpeza pós-deploy concluída"
