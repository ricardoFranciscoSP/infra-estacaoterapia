#!/bin/bash
###############################################################################
# deploy-all.sh - Deploy Completo sem Downtime (API + Frontend)
# Orquestra o deploy de todos os serviços com zero-downtime
###############################################################################

set -euo pipefail

# =========================
# CORES
# =========================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# =========================
# CONFIGURAÇÕES
# =========================
API_DIR="api"
FRONTEND_DIR="estacao"
LOG_FILE="deploy-all-$(date +%Y%m%d-%H%M%S).log"
DEPLOY_TIMESTAMP=$(date +%Y%m%d-%H%M%S)
GIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# =========================
# LOGGING
# =========================
log_info()    { echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1" | tee -a "$LOG_FILE"; }
log_warning() { echo -e "${YELLOW}[⚠]${NC} $1" | tee -a "$LOG_FILE"; }
log_error()   { echo -e "${RED}[✗]${NC} $1" | tee -a "$LOG_FILE"; }
log_step()    { echo -e "${CYAN}[STEP]${NC} $1" | tee -a "$LOG_FILE"; }
log_section() { 
    echo -e "\n${MAGENTA}═══════════════════════════════════════════${NC}" | tee -a "$LOG_FILE"
    echo -e "${MAGENTA}$1${NC}" | tee -a "$LOG_FILE"
    echo -e "${MAGENTA}═══════════════════════════════════════════${NC}\n" | tee -a "$LOG_FILE"
}

# =========================
# BANNER
# =========================
show_banner() {
    cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║        🚀 DEPLOY COMPLETO - ESTAÇÃO TERAPIA 🚀          ║
║                                                           ║
║              Zero-Downtime Deployment                     ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
}

# =========================
# PRÉ-REQUISITOS
# =========================
check_prerequisites() {
    log_section "1️⃣  VERIFICANDO PRÉ-REQUISITOS"
    
    # Verifica Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker não encontrado!"
        exit 1
    fi
    log_success "Docker instalado"
    
    # Verifica Docker Swarm
    if ! docker info 2>/dev/null | grep -i "swarm" | grep -qi "active"; then
        log_error "Docker Swarm não está ativo!"
        log_info "Execute: docker swarm init"
        exit 1
    fi
    log_success "Docker Swarm ativo"
    
    # Verifica Git
    if ! command -v git &> /dev/null; then
        log_warning "Git não encontrado (opcional)"
    else
        log_success "Git instalado"
    fi
    
    # Verifica diretórios
    if [ ! -d "$API_DIR" ]; then
        log_error "Diretório API não encontrado: $API_DIR"
        exit 1
    fi
    log_success "Diretório API encontrado"
    
    if [ ! -d "$FRONTEND_DIR" ]; then
        log_error "Diretório Frontend não encontrado: $FRONTEND_DIR"
        exit 1
    fi
    log_success "Diretório Frontend encontrado"
    
    # Verifica e prepara scripts de deploy
    log_info "Verificando scripts de deploy..."
    
    # API
    if [ ! -f "$API_DIR/deploy.sh" ]; then
        log_error "Script de deploy da API não encontrado: $API_DIR/deploy.sh"
        log_info "Listando conteúdo de $API_DIR:"
        ls -la "$API_DIR" | grep -E '\.sh$' || true
        exit 1
    fi
    chmod +x "$API_DIR/deploy.sh" 2>/dev/null || {
        log_error "Não foi possível dar permissão ao script da API"
        exit 1
    }
    log_success "Script de deploy da API encontrado e executável"
    
    # Frontend
    if [ ! -f "$FRONTEND_DIR/deploy-stack.sh" ]; then
        log_error "Script de deploy do Frontend não encontrado: $FRONTEND_DIR/deploy-stack.sh"
        log_info "Listando conteúdo de $FRONTEND_DIR:"
        ls -la "$FRONTEND_DIR" | grep -E '\.sh$' || true
        exit 1
    fi
    chmod +x "$FRONTEND_DIR/deploy-stack.sh" 2>/dev/null || {
        log_error "Não foi possível dar permissão ao script do Frontend"
        exit 1
    }
    log_success "Script de deploy do Frontend encontrado e executável"
    
    # Scripts opcionais
    [ -f "$FRONTEND_DIR/deploy.sh" ] && chmod +x "$FRONTEND_DIR/deploy.sh" 2>/dev/null || true
}

# =========================
# ATUALIZAR CÓDIGO
# =========================
update_code() {
    log_section "2️⃣  ATUALIZANDO CÓDIGO DO REPOSITÓRIO"
    
    if [ ! -d .git ]; then
        log_warning "Não é um repositório Git, pulando atualização"
        return 0
    fi
    
    log_info "Branch atual: $(git branch --show-current)"
    
    # Verifica mudanças locais
    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
        log_warning "Há mudanças locais não commitadas"
        read -p "Deseja descartar mudanças locais? (s/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Ss]$ ]]; then
            git reset --hard HEAD
            git clean -fd
            log_success "Mudanças locais descartadas"
        else
            log_info "Mantendo mudanças locais"
        fi
    fi
    
    # Pull do repositório
    log_info "Fazendo pull do repositório..."
    if git pull origin master 2>&1 | tee -a "$LOG_FILE"; then
        log_success "Código atualizado"
    else
        log_warning "Falha ao fazer pull (continuando mesmo assim)"
    fi
}

# =========================
# BACKUP DA CONFIGURAÇÃO
# =========================
backup_configs() {
    log_section "3️⃣  CRIANDO BACKUP DAS CONFIGURAÇÕES"
    
    local backup_dir="backups/deploy-$DEPLOY_TIMESTAMP"
    mkdir -p "$backup_dir"
    
    # Backup API
    if [ -f "$API_DIR/docker-stack.yml" ]; then
        cp "$API_DIR/docker-stack.yml" "$backup_dir/api-docker-stack.yml.backup"
        log_success "Backup da configuração da API criado"
    fi
    
    # Backup Frontend
    if [ -f "$FRONTEND_DIR/docker-stack.yml" ]; then
        cp "$FRONTEND_DIR/docker-stack.yml" "$backup_dir/frontend-docker-stack.yml.backup"
        log_success "Backup da configuração do Frontend criado"
    fi
    
    log_info "Backups salvos em: $backup_dir"
}

# =========================
# DEPLOY DO BACKEND (API)
# =========================
deploy_api() {
    log_section "4️⃣  DEPLOY DO BACKEND (API + Socket)"
    
    log_info "Navegando para: $API_DIR"
    cd "$API_DIR"
    
    log_info "Iniciando deploy da API..."
    if ./deploy.sh 2>&1 | tee -a "../$LOG_FILE"; then
        log_success "Deploy da API concluído com sucesso!"
    else
        log_error "Falha no deploy da API!"
        cd ..
        exit 1
    fi
    
    cd ..
    
    # Aguarda estabilização
    log_info "Aguardando API estabilizar..."
    sleep 10
    
    # Verifica serviços
    log_info "Verificando serviços da API..."
    docker service ls --filter "label=com.docker.stack.namespace=estacaoterapia" | tee -a "$LOG_FILE" || true
}

# =========================
# DEPLOY DO FRONTEND
# =========================
deploy_frontend() {
    log_section "5️⃣  DEPLOY DO FRONTEND (Next.js)"
    
    log_info "Navegando para: $FRONTEND_DIR"
    cd "$FRONTEND_DIR"
    
    log_info "Iniciando deploy do Frontend..."
    if ./deploy-stack.sh 2>&1 | tee -a "../$LOG_FILE"; then
        log_success "Deploy do Frontend concluído com sucesso!"
    else
        log_error "Falha no deploy do Frontend!"
        cd ..
        exit 1
    fi
    
    cd ..
    
    # Aguarda estabilização
    log_info "Aguardando Frontend estabilizar..."
    sleep 10
    
    # Verifica serviços
    log_info "Verificando serviços do Frontend..."
    docker service ls --filter "label=com.docker.stack.namespace=estacao" | tee -a "$LOG_FILE" || true
}

# =========================
# VERIFICAÇÃO FINAL
# =========================
final_verification() {
    log_section "6️⃣  VERIFICAÇÃO FINAL"
    
    log_info "Listando todos os serviços..."
    docker service ls | tee -a "$LOG_FILE"
    
    echo ""
    log_info "Verificando saúde dos serviços..."
    
    # API
    log_step "Testando API..."
    if curl -f -s http://localhost:3333/health > /dev/null 2>&1; then
        log_success "API respondendo"
    else
        log_warning "API ainda não está respondendo (pode levar alguns minutos)"
    fi
    
    # Socket
    log_step "Testando Socket..."
    if curl -f -s http://localhost:3334/health > /dev/null 2>&1; then
        log_success "Socket respondendo"
    else
        log_warning "Socket ainda não está respondendo (pode levar alguns minutos)"
    fi
    
    # Frontend
    log_step "Testando Frontend..."
    if curl -f -s http://localhost:3001 > /dev/null 2>&1; then
        log_success "Frontend respondendo"
    else
        log_warning "Frontend ainda não está respondendo (pode levar alguns minutos)"
    fi
}

# =========================
# RESUMO FINAL
# =========================
show_summary() {
    log_section "✅ DEPLOY COMPLETO FINALIZADO"
    
    cat << EOF | tee -a "$LOG_FILE"

╔═══════════════════════════════════════════════════════════╗
║                   RESUMO DO DEPLOY                        ║
╚═══════════════════════════════════════════════════════════╝

📦 Informações:
   • Timestamp: $DEPLOY_TIMESTAMP
   • Git Hash: $GIT_HASH
   • Log: $LOG_FILE

🎯 Stacks Deployadas:
   • Backend (API + Socket): estacaoterapia
   • Frontend (Next.js): estacao

📊 Comandos Úteis:

   # Ver todos os serviços
   docker service ls

   # Ver logs da API
   docker service logs -f estacaoterapia_api

   # Ver logs do Socket
   docker service logs -f estacaoterapia_socket-server

   # Ver logs do Frontend
   docker service logs -f estacao_next_prd

   # Verificar réplicas
   docker service ps estacaoterapia_api
   docker service ps estacao_next_prd

🔗 URLs (quando DNS configurado):
   • Frontend: https://estacaoterapia.com.br
   • API: https://api-prd.estacaoterapia.com.br
   • Socket: https://ws.prd.estacaoterapia.com.br

⏮️  Para reverter (se necessário):
   cd api && cp backups/deploy-$DEPLOY_TIMESTAMP/api-docker-stack.yml.backup docker-stack.yml
   docker stack deploy -c docker-stack.yml estacaoterapia
   
   cd estacao && cp backups/deploy-$DEPLOY_TIMESTAMP/frontend-docker-stack.yml.backup docker-stack.yml
   docker stack deploy -c docker-stack.yml estacao

EOF
}

# =========================
# TRATAMENTO DE ERROS
# =========================
handle_error() {
    log_error "Deploy falhou na linha $1"
    log_info "Verifique o log: $LOG_FILE"
    exit 1
}

trap 'handle_error $LINENO' ERR

# =========================
# MAIN
# =========================
main() {
    clear
    show_banner
    
    echo ""
    log_info "Iniciando deploy completo em: $(date '+%d/%m/%Y %H:%M:%S')"
    log_info "Salvando logs em: $LOG_FILE"
    echo ""
    
    # Confirma deploy
    read -p "Deseja continuar com o deploy? (s/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        log_warning "Deploy cancelado pelo usuário"
        exit 0
    fi
    
    # Executa etapas
    check_prerequisites
    update_code
    backup_configs
    deploy_api
    deploy_frontend
    final_verification
    show_summary
    
    log_success "Deploy concluído com sucesso em: $(date '+%d/%m/%Y %H:%M:%S')"
}

# Executa
main "$@"
