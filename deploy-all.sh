#!/bin/bash

###############################################################################
# 🚀 Deploy Completo - API + Frontend
# Deploy orquestrado com zero-downtime
###############################################################################

set -euo pipefail

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configurações
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$SCRIPT_DIR/api"
FRONTEND_DIR="$SCRIPT_DIR/estacao"
COROOT_DIR="$SCRIPT_DIR"
LOG_FILE="deploy-$(date +%Y%m%d_%H%M%S).log"

# Contadores
START_TIME=$(date +%s)
DEPLOY_API_SUCCESS=0
DEPLOY_FRONTEND_SUCCESS=0
DEPLOY_CADDY_SUCCESS=0

###############################################################################
# Funções de Log
###############################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[✓ SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[⚠ WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[✗ ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

log_header() {
    echo -e "\n${CYAN}======================================${NC}" | tee -a "$LOG_FILE"
    echo -e "${CYAN}$1${NC}" | tee -a "$LOG_FILE"
    echo -e "${CYAN}======================================${NC}\n" | tee -a "$LOG_FILE"
}

###############################################################################
# Funções de Validação
###############################################################################

check_prerequisites() {
    log_header "🔍 Validando Pré-requisitos"
    
    # Verificar Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker não está instalado!"
        exit 1
    fi
    log_success "Docker instalado: $(docker --version)"
    
    # Verificar Docker Swarm
    swarm_state=$(docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null || echo "error")
    if [ "$swarm_state" != "active" ]; then
        log_error "Docker Swarm não está ativo (estado atual: ${swarm_state:-desconhecido})"
        log_info "Execute: docker swarm init"
        exit 1
    fi
    log_success "Docker Swarm ativo"
    
    # Verificar diretórios
    if [ ! -d "$API_DIR" ]; then
        log_error "Diretório da API não encontrado: $API_DIR"
        exit 1
    fi
    log_success "Diretório da API encontrado"
    
    if [ ! -d "$FRONTEND_DIR" ]; then
        log_error "Diretório do Frontend não encontrado: $FRONTEND_DIR"
        exit 1
    fi
    log_success "Diretório do Frontend encontrado"
    
    # Verificar scripts de deploy
    if [ ! -f "$API_DIR/deploy.sh" ]; then
        log_error "Script de deploy da API não encontrado: $API_DIR/deploy.sh"
        exit 1
    fi
    log_success "Script de deploy da API encontrado"
    
    if [ ! -f "$FRONTEND_DIR/deploy-stack.sh" ]; then
        log_error "Script de deploy do Frontend não encontrado: $FRONTEND_DIR/deploy-stack.sh"
        exit 1
    fi
    log_success "Script de deploy do Frontend encontrado"
    
    if [ ! -f "$SCRIPT_DIR/deploy.sh" ]; then
        log_warning "Script de deploy do Caddy não encontrado: $SCRIPT_DIR/deploy.sh (Caddy não será deployado)"
    else
        log_success "Script de deploy do Caddy encontrado"
    fi

###############################################################################
# Funções de Git
###############################################################################

update_code() {
    log_header "📥 Atualizando Código do Repositório"
    
    if [ ! -d ".git" ]; then
        log_warning "Não é um repositório Git, pulando atualização"
        return 0
    fi
    
    log_info "Branch atual: $(git branch --show-current)"
    log_info "Último commit: $(git log -1 --oneline)"
    
    log_info "Executando git pull..."
    if git pull origin "$(git branch --show-current)" 2>&1 | tee -a "$LOG_FILE"; then
        log_success "Código atualizado com sucesso"
        log_info "Novo commit: $(git log -1 --oneline)"
    else
        log_error "Falha ao atualizar código do Git"
        exit 1
    fi
}

###############################################################################
# Funções de Backup
###############################################################################

create_backup() {
    log_header "💾 Criando Backup da Configuração Atual"
    
    BACKUP_DIR="$SCRIPT_DIR/backups"
    BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_PATH="$BACKUP_DIR/backup_$BACKUP_TIMESTAMP"
    
    mkdir -p "$BACKUP_PATH"
    
    log_info "Criando backup em: $BACKUP_PATH"
    
    # Backup das configurações da API
    if [ -f "$API_DIR/docker-stack.yml" ]; then
        cp "$API_DIR/docker-stack.yml" "$BACKUP_PATH/api-docker-stack.yml"
        log_success "Backup da configuração da API criado"
    fi
    
    # Backup das configurações do Frontend
    if [ -f "$FRONTEND_DIR/docker-stack.yml" ]; then
        cp "$FRONTEND_DIR/docker-stack.yml" "$BACKUP_PATH/frontend-docker-stack.yml"
        log_success "Backup da configuração do Frontend criado"
    fi
    
    # Salvar estado dos serviços
    docker service ls > "$BACKUP_PATH/services-before-deploy.txt" 2>&1 || true
    log_success "Backup do estado dos serviços criado"
    
    log_success "Backup completo criado em: $BACKUP_PATH"
}

###############################################################################
# Funções de Deploy
###############################################################################

deploy_api() {
    log_header "🔧 Deploy da API (Backend)"
    
    cd "$API_DIR"
    
    log_info "Diretório: $API_DIR"
    log_info "Iniciando deploy da API..."
    
    # Garantir permissões de execução
    chmod +x ./deploy.sh 2>/dev/null || true
    
    if ./deploy.sh 2>&1 | tee -a "../$LOG_FILE"; then
        log_success "Deploy da API concluído com sucesso"
        DEPLOY_API_SUCCESS=1
        return 0
    else
        log_error "Falha no deploy da API"
        return 1
    fi
}

deploy_frontend() {
    log_header "🎨 Deploy do Frontend"
    
    cd "$FRONTEND_DIR"
    
    log_info "Diretório: $FRONTEND_DIR"
    log_info "Iniciando deploy do Frontend..."
    
    # Garantir permissões de execução
    chmod +x ./deploy-stack.sh 2>/dev/null || true
    
    if ./deploy-stack.sh 2>&1 | tee -a "../$LOG_FILE"; then
        log_success "Deploy do Frontend concluído com sucesso"
        DEPLOY_FRONTEND_SUCCESS=1
        return 0
    else
        log_error "Falha no deploy do Frontend"
        return 1
    fi
}

deploy_caddy() {
    log_header "🔗 Deploy do Caddy (Reverse Proxy)"
    
    cd "$SCRIPT_DIR"
    
    # Verificar se script existe
    if [ ! -f "./deploy.sh" ]; then
        log_warning "Script de deploy do Caddy não encontrado, pulando..."
        return 0
    fi
    
    log_info "Diretório: $SCRIPT_DIR"
    log_info "Iniciando deploy do Caddy..."
    
    # Verificar se docker-stack.caddy.yml existe
    if [ ! -f "./docker-stack.caddy.yml" ]; then
        log_warning "Arquivo docker-stack.caddy.yml não encontrado, pulando Caddy..."
        return 0
    fi
    
    # Garantir permissões de execução
    chmod +x ./deploy.sh 2>/dev/null || true
    
    # Deploy do Caddy via docker stack deploy
    log_info "Deployando stack do Caddy..."
    
    if docker stack deploy -c docker-stack.caddy.yml caddy 2>&1 | tee -a "$LOG_FILE"; then
        log_success "Deploy do Caddy concluído com sucesso"
        DEPLOY_CADDY_SUCCESS=1
        
        # Aguardar o serviço iniciar
        log_info "Aguardando Caddy iniciar..."
        sleep 5
        
        # Verificar status
        docker service ls --filter "name=caddy_caddy" 2>&1 | tee -a "$LOG_FILE" || true
        
        return 0
    else
        log_error "Falha no deploy do Caddy"
        return 1
    fi

###############################################################################
# Função de Validação Final
###############################################################################

validate_deployment() {
    log_header "✅ Validando Deployment"
    
    cd "$SCRIPT_DIR"
    
    log_info "Listando serviços..."
    docker service ls | tee -a "$LOG_FILE"
    
    echo ""
    log_info "Verificando status dos serviços..."
    
    # Verificar serviços da API
    if [ $DEPLOY_API_SUCCESS -eq 1 ]; then
        log_info "Serviços da API (estacaoterapia):"
        docker service ps estacaoterapia_api --format "table {{.Name}}\t{{.CurrentState}}" 2>&1 | tee -a "$LOG_FILE" || true
        docker service ps estacaoterapia_socket-server --format "table {{.Name}}\t{{.CurrentState}}" 2>&1 | tee -a "$LOG_FILE" || true
    fi
    
    # Verificar serviços do Frontend
    if [ $DEPLOY_FRONTEND_SUCCESS -eq 1 ]; then
        log_info "Serviços do Frontend (estacao):"
        docker service ps estacao_next_prd --format "table {{.Name}}\t{{.CurrentState}}" 2>&1 | tee -a "$LOG_FILE" || true
    fi
    
    # Verificar serviços do Caddy
    if [ $DEPLOY_CADDY_SUCCESS -eq 1 ]; then
        log_info "Serviços do Caddy:"
        docker service ps caddy_caddy --format "table {{.Name}}\t{{.CurrentState}}" 2>&1 | tee -a "$LOG_FILE" || true
    fi
    
    echo ""
    log_success "Validação concluída"
}

###############################################################################
# Função de Resumo
###############################################################################

print_summary() {
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    MINUTES=$((DURATION / 60))
    SECONDS=$((DURATION % 60))
    
    log_header "📊 Resumo do Deploy"
    
    echo -e "${CYAN}Resultados:${NC}" | tee -a "$LOG_FILE"
    
    if [ $DEPLOY_API_SUCCESS -eq 1 ]; then
        echo -e "  ${GREEN}✓${NC} API: Sucesso" | tee -a "$LOG_FILE"
    else
        echo -e "  ${RED}✗${NC} API: Falha" | tee -a "$LOG_FILE"
    fi
    
    if [ $DEPLOY_FRONTEND_SUCCESS -eq 1 ]; then
        echo -e "  ${GREEN}✓${NC} Frontend: Sucesso" | tee -a "$LOG_FILE"
    else
        echo -e "  ${RED}✗${NC} Frontend: Falha" | tee -a "$LOG_FILE"
    fi
    
    if [ $DEPLOY_CADDY_SUCCESS -eq 1 ]; then
        echo -e "  ${GREEN}✓${NC} Caddy: Sucesso" | tee -a "$LOG_FILE"
    else
        echo -e "  ${RED}⚠${NC} Caddy: Não deployado" | tee -a "$LOG_FILE"
    fi
    
    echo "" | tee -a "$LOG_FILE"
    echo -e "${CYAN}Tempo total:${NC} ${MINUTES}m ${SECONDS}s" | tee -a "$LOG_FILE"
    echo -e "${CYAN}Log salvo em:${NC} $LOG_FILE" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"
    
    if [ $DEPLOY_API_SUCCESS -eq 1 ] && [ $DEPLOY_FRONTEND_SUCCESS -eq 1 ]; then
        log_success "🎉 Deploy completo realizado com sucesso!"
        return 0
    else
        log_error "❌ Deploy completo falhou. Verifique os logs acima."
        return 1
    fi
}

###############################################################################
# Função Principal
###############################################################################

main() {
    log_header "🚀 Deploy Completo - Estação Terapia"
    log_info "Iniciado em: $(date '+%d/%m/%Y %H:%M:%S')"
    log_info "Usuário: $(whoami)"
    log_info "Diretório: $SCRIPT_DIR"
    
    # Executar etapas
    check_prerequisites
    update_code
    create_backup
    
    # Deploy da API
    if ! deploy_api; then
        log_warning "Deploy da API falhou, mas continuando com Frontend..."
    fi
    
    cd "$SCRIPT_DIR"
    
    # Deploy do Frontend
    if ! deploy_frontend; then
        log_warning "Deploy do Frontend falhou"
    fi
    
    cd "$SCRIPT_DIR"
    
    # Deploy do Caddy
    if ! deploy_caddy; then
        log_warning "Deploy do Caddy falhou ou foi pulado"
    fi
    
    cd "$SCRIPT_DIR"
    
    # Validação final
    validate_deployment
    
    # Resumo
    print_summary
    
    exit_code=$?
    
    log_info "Finalizado em: $(date '+%d/%m/%Y %H:%M:%S')"
    
    exit $exit_code
}

###############################################################################
# Execução
###############################################################################

main "$@"