#!/bin/bash

###############################################################################
# 🔍 Diagnóstico de Rede Overlay Docker Swarm
# Verifica se a rede overlay estacaoterapia_backend está funcionando corretamente
###############################################################################

set -euo pipefail

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${SCRIPT_DIR}/network-diagnosis-$(date +%Y%m%d_%H%M%S).log"

###############################################################################
# Funções de Log
###############################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1" | tee -a "$LOG_FILE"
}

log_header() {
    echo -e "\n${CYAN}════════════════════════════════════════${NC}" | tee -a "$LOG_FILE"
    echo -e "${CYAN}$1${NC}" | tee -a "$LOG_FILE"
    echo -e "${CYAN}════════════════════════════════════════${NC}\n" | tee -a "$LOG_FILE"
}

###############################################################################
# 1. Verificar se Docker Swarm está ativo
###############################################################################

check_swarm() {
    log_header "🔍 Verificando Docker Swarm"
    
    if ! docker info &>/dev/null; then
        log_error "Docker não está acessível"
        return 1
    fi
    
    SWARM_STATE=$(docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null || echo "error")
    
    if [ "$SWARM_STATE" != "active" ]; then
        log_error "Docker Swarm não está ativo (estado: $SWARM_STATE)"
        log_info "Execute: docker swarm init"
        return 1
    fi
    
    log_success "Docker Swarm ativo"
    
    # Mostrar informações do nó
    NODE_NAME=$(docker node ls --format '{{.Hostname}}' 2>/dev/null | head -1)
    log_info "Nó manager: $NODE_NAME"
    
    return 0
}

###############################################################################
# 2. Verificar se a rede overlay existe
###############################################################################

check_network_exists() {
    log_header "🔍 Verificando Redes Overlay"
    
    if docker network ls --format '{{.Name}}' | grep -q "^estacaoterapia_backend$"; then
        log_success "Rede 'estacaoterapia_backend' existe"
    else
        log_warning "Rede 'estacaoterapia_backend' NÃO encontrada"
        log_info "Redes disponíveis:"
        docker network ls --format 'table {{.Name}}\t{{.Driver}}' | tee -a "$LOG_FILE"
        return 1
    fi
    
    # Mostrar informações da rede
    log_info "Detalhes da rede 'estacaoterapia_backend':"
    docker network inspect estacaoterapia_backend --format='
   - Driver: {{.Driver}}
   - Escopo: {{.Scope}}
   - IPAM Driver: {{index .IPAM.Config 0 "Gateway"}}
   - Subnet: {{index .IPAM.Config 0 "Subnet"}}' | tee -a "$LOG_FILE"
    
    return 0
}

###############################################################################
# 3. Verificar conectividade entre serviços
###############################################################################

check_service_connectivity() {
    log_header "🌐 Verificando Conectividade Entre Serviços"
    
    # Verificar se os serviços estão rodando
    SERVICES=("redis" "postgres" "api" "socket-server")
    RUNNING_SERVICES=()
    
    for service in "${SERVICES[@]}"; do
        # Procurar o serviço com prefixo estacaoterapia_
        FULL_SERVICE=$(docker service ls --format '{{.Name}}' 2>/dev/null | grep "_${service}$" | head -1)
        
        if [ -z "$FULL_SERVICE" ]; then
            log_warning "Serviço '${service}' não encontrado"
            continue
        fi
        
        # Obter container do serviço
        CONTAINER=$(docker ps --format '{{.Names}}' 2>/dev/null | grep "${FULL_SERVICE}" | head -1)
        
        if [ -z "$CONTAINER" ]; then
            log_warning "Nenhum container rodando para '${service}'"
            continue
        fi
        
        RUNNING_SERVICES+=("$service:$CONTAINER")
        log_success "Serviço '$service' rodando em container: $CONTAINER"
    done
    
    if [ ${#RUNNING_SERVICES[@]} -lt 2 ]; then
        log_warning "Menos de 2 serviços rodando - não é possível testar conectividade"
        return 1
    fi
    
    # Testar DNS entre serviços
    log_info "Testando resolução DNS entre serviços..."
    
    API_CONTAINER=$(docker ps --format '{{.Names}}' 2>/dev/null | grep "_api\." | head -1)
    if [ -n "$API_CONTAINER" ]; then
        log_info "Testando resolução de 'redis' do container da API..."
        
        if docker exec "$API_CONTAINER" nslookup redis >/dev/null 2>&1; then
            REDIS_IP=$(docker exec "$API_CONTAINER" nslookup redis 2>/dev/null | grep "Address:" | tail -1 | awk '{print $2}')
            log_success "Resolução DNS: redis → $REDIS_IP"
        else
            log_error "NÃO conseguiu resolver hostname 'redis' do container da API"
            log_info "Verificando /etc/resolv.conf no container..."
            docker exec "$API_CONTAINER" cat /etc/resolv.conf 2>/dev/null | tee -a "$LOG_FILE" || true
            return 1
        fi
        
        # Testar conectividade de rede
        log_info "Testando conectividade de rede redis:6379..."
        if docker exec "$API_CONTAINER" timeout 3 nc -z redis 6379 >/dev/null 2>&1; then
            log_success "Conectividade de rede OK: redis:6379 está acessível"
        else
            log_error "NÃO conseguiu alcançar redis:6379 do container da API"
            return 1
        fi
    fi
    
    return 0
}

###############################################################################
# 4. Verificar drivers de rede
###############################################################################

check_network_drivers() {
    log_header "🔧 Verificando Drivers e Plugins de Rede"
    
    log_info "Drivers de rede disponíveis:"
    docker plugin ls --format 'table {{.Name}}\t{{.Enabled}}' 2>/dev/null | tee -a "$LOG_FILE" || {
        log_warning "Não foi possível listar plugins"
    }
    
    # Verificar se driver overlay está disponível
    if docker plugin ls 2>/dev/null | grep -q "overlay"; then
        log_success "Driver overlay disponível"
    else
        log_warning "Driver overlay pode não estar disponível como plugin"
        log_info "Isso é OK - overlay é driver nativo do Docker"
    fi
    
    return 0
}

###############################################################################
# 5. Verificar bridge de rede overlay
###############################################################################

check_network_bridge() {
    log_header "🌉 Verificando Bridge de Rede Overlay"
    
    log_info "Interfaces de rede do host:"
    if command -v ip &>/dev/null; then
        ip link show | grep -E "br-|veth" | tee -a "$LOG_FILE" || true
    elif command -v ifconfig &>/dev/null; then
        ifconfig | grep -E "br|veth" | tee -a "$LOG_FILE" || true
    else
        log_warning "Ferramentas de rede não disponíveis"
    fi
    
    return 0
}

###############################################################################
# 6. Verificar health checks dos serviços
###############################################################################

check_service_health() {
    log_header "❤️  Verificando Health Status dos Serviços"
    
    log_info "Status dos serviços:"
    docker service ls --format 'table {{.Name}}\t{{.Replicas}}\t{{.Image}}' | tee -a "$LOG_FILE"
    
    # Detalhar serviços com problemas
    PROBLEM_SERVICES=$(docker service ls --format '{{.Name}} {{.Replicas}}' 2>/dev/null | grep -v " [0-9]/[0-9] " || true)
    
    if [ -n "$PROBLEM_SERVICES" ]; then
        log_warning "Serviços com possíveis problemas:"
        echo "$PROBLEM_SERVICES" | while read -r service replicas; do
            log_warning "  - $service (replicas: $replicas)"
            log_info "    Detalhes:"
            docker service ps "$service" --format 'table {{.Name}}\t{{.CurrentState}}\t{{.Error}}' 2>/dev/null | tee -a "$LOG_FILE" || true
        done
    else
        log_success "Todos os serviços com replicas esperadas"
    fi
    
    return 0
}

###############################################################################
# 7. Coletar logs relevantes
###############################################################################

collect_logs() {
    log_header "📋 Coletando Logs de Diagnóstico"
    
    # Logs do Docker daemon
    log_info "Últimas linhas de logs do Docker daemon:"
    if command -v journalctl &>/dev/null; then
        journalctl -u docker -n 20 --no-pager 2>/dev/null | tee -a "$LOG_FILE" || true
    fi
    
    # Logs de container da API (se existir)
    API_CONTAINER=$(docker ps --format '{{.Names}}' 2>/dev/null | grep "_api\." | head -1)
    if [ -n "$API_CONTAINER" ]; then
        log_info "Logs do container API (últimas 30 linhas):"
        docker logs --tail 30 "$API_CONTAINER" 2>/dev/null | tee -a "$LOG_FILE" || true
    fi
    
    return 0
}

###############################################################################
# 8. Gerar relatório final
###############################################################################

generate_report() {
    log_header "📊 Relatório de Diagnóstico"
    
    echo ""
    log_info "Relatório completo salvo em: $LOG_FILE"
    
    echo ""
    log_info "✅ Diagnóstico concluído em: $(date '+%d/%m/%Y %H:%M:%S')"
    
    # Resumo de problemas encontrados
    ERRORS=$(grep -c "^\[✗\]" "$LOG_FILE" || true)
    WARNINGS=$(grep -c "^\[⚠\]" "$LOG_FILE" || true)
    
    if [ "$ERRORS" -gt 0 ]; then
        log_error "Encontrados $ERRORS problema(s) crítico(s)"
        echo ""
        echo "Problemas encontrados:"
        grep "^\[✗\]" "$LOG_FILE" || true
        return 1
    elif [ "$WARNINGS" -gt 0 ]; then
        log_warning "Encontrados $WARNINGS aviso(s)"
        echo ""
        echo "Avisos:"
        grep "^\[⚠\]" "$LOG_FILE" || true
        return 0
    else
        log_success "Nenhum problema encontrado!"
        return 0
    fi
}

###############################################################################
# MAIN
###############################################################################

main() {
    echo ""
    log_header "🔍 DIAGNÓSTICO DE REDE OVERLAY DOCKER SWARM"
    log_info "Data: $(date '+%d/%m/%Y %H:%M:%S')"
    log_info "Log: $LOG_FILE"
    
    # Executar verificações
    check_swarm || exit 1
    check_network_exists || log_warning "Continuando com outras verificações..."
    check_network_drivers
    check_service_connectivity || log_warning "Alguns serviços podem não estar rodando..."
    check_network_bridge
    check_service_health
    collect_logs
    
    # Gerar relatório
    echo ""
    generate_report
    REPORT_EXIT=$?
    
    echo ""
    log_info "📄 Para ver o relatório completo: cat $LOG_FILE"
    
    return $REPORT_EXIT
}

# Executar main
main "$@"
