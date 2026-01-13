#!/bin/bash
###############################################################################
# deploy.sh - Script wrapper otimizado para deploy na VPS
# Uso: ./deploy.sh [opções]
###############################################################################

set -euo pipefail

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configurações
PROJECT_DIR="${PROJECT_DIR:-/opt/projetos/estacao-front}"
DEPLOY_SCRIPT="deploy-stack.sh"

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }

# Verifica se está no diretório correto ou navega até ele
ensure_project_dir() {
  if [ ! -f "$DEPLOY_SCRIPT" ]; then
    if [ -d "$PROJECT_DIR" ]; then
      log_info "Navegando para diretório do projeto: $PROJECT_DIR"
      cd "$PROJECT_DIR" || {
        log_error "Não foi possível acessar $PROJECT_DIR"
        exit 1
      }
    else
      log_error "Diretório do projeto não encontrado: $PROJECT_DIR"
      log_info "Defina PROJECT_DIR ou execute no diretório do projeto"
      exit 1
    fi
  fi
}

# Atualiza código do Git
update_code() {
  log_info "Atualizando código do repositório..."
  
  # Verifica se é um repositório git
  if [ ! -d .git ]; then
    log_warning "Diretório não é um repositório Git, pulando atualização"
    return 0
  fi

  # Fetch e reset
  git fetch --all || {
    log_error "Falha ao fazer fetch do repositório"
    return 1
  }

  # Verifica se há mudanças locais
  if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    log_warning "Há mudanças locais não commitadas"
    read -p "Deseja descartar mudanças locais? (s/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
      git reset --hard HEAD
      git clean -fd
    else
      log_info "Mantendo mudanças locais"
    fi
  fi

  # Reset para origin/master (ou origin/main)
  local branch="master"
  if ! git show-ref --verify --quiet refs/remotes/origin/master; then
    branch="main"
  fi

  log_info "Atualizando para origin/$branch"
  git reset --hard "origin/$branch" || {
    log_error "Falha ao fazer reset para origin/$branch"
    return 1
  }

  log_success "Código atualizado"
}

# Garante permissões corretas
ensure_permissions() {
  log_info "Verificando permissões dos scripts..."
  
  if [ -f "$DEPLOY_SCRIPT" ]; then
    chmod +x "$DEPLOY_SCRIPT"
  fi

  # Dá permissão de execução para todos os scripts .sh
  find . -maxdepth 1 -name "*.sh" -type f -exec chmod +x {} \; 2>/dev/null || true

  log_success "Permissões verificadas"
}

# Executa o deploy
run_deploy() {
  log_info "Iniciando deploy..."
  
  if [ ! -f "$DEPLOY_SCRIPT" ]; then
    log_error "Script de deploy não encontrado: $DEPLOY_SCRIPT"
    exit 1
  fi

  # Executa o script de deploy
  ./"$DEPLOY_SCRIPT" "$@"
}

# Mostra ajuda
show_help() {
  cat << EOF
Uso: ./deploy.sh [opções]

Script wrapper otimizado para deploy do frontend na VPS.

OPÇÕES:
  --no-update      Não atualiza o código do Git
  --no-perms       Não verifica/ajusta permissões
  --help           Mostra esta ajuda

EXEMPLOS:
  ./deploy.sh                    # Deploy completo (atualiza código e faz deploy)
  ./deploy.sh --no-update        # Deploy sem atualizar código
  ./deploy.sh --build            # Deploy com build (passa --build para deploy-stack.sh)

VARIÁVEIS DE AMBIENTE:
  PROJECT_DIR                    Diretório do projeto (padrão: /opt/projetos/estacao-front)

EOF
}

# Main
main() {
  local update_code=true
  local check_perms=true
  local deploy_args=()

  # Processa argumentos
  while [[ $# -gt 0 ]]; do
    case $1 in
      --no-update)
        update_code=false
        shift
        ;;
      --no-perms)
        check_perms=false
        shift
        ;;
      --help|-h)
        show_help
        exit 0
        ;;
      *)
        deploy_args+=("$1")
        shift
        ;;
    esac
  done

  log_info "===================================="
  log_info "Deploy Otimizado - Frontend VPS"
  log_info "===================================="

  # Garante que está no diretório correto
  ensure_project_dir

  # Atualiza código (se solicitado)
  if [ "$update_code" = true ]; then
    update_code
  fi

  # Verifica permissões (se solicitado)
  if [ "$check_perms" = true ]; then
    ensure_permissions
  fi

  # Executa deploy
  run_deploy "${deploy_args[@]}"
}

main "$@"
