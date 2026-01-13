#!/bin/bash
###############################################################################
# diagnose-service.sh - Diagnóstico do serviço que não inicia
###############################################################################

set -euo pipefail

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

STACK_NAME="estacao"
SERVICE_NAME="estacao_next_prd"
FULL_SERVICE_NAME="${STACK_NAME}_${SERVICE_NAME}"
IMAGE_NAME="estacaoterapia-next-prd"

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }

echo "=========================================="
echo "🔍 DIAGNÓSTICO DO SERVIÇO"
echo "=========================================="
echo ""

# 1. Verificar se o serviço existe
log_info "1. Verificando se o serviço existe..."
if docker service ls --format "{{.Name}}" | grep -q "^${FULL_SERVICE_NAME}$"; then
    log_success "Serviço encontrado: ${FULL_SERVICE_NAME}"
else
    log_error "Serviço NÃO encontrado: ${FULL_SERVICE_NAME}"
    echo ""
    log_info "Serviços disponíveis:"
    docker service ls
    exit 1
fi
echo ""

# 2. Verificar status do serviço
log_info "2. Status do serviço:"
docker service ps "${FULL_SERVICE_NAME}" --no-trunc
echo ""

# 3. Verificar se a imagem existe
log_info "3. Verificando imagens disponíveis..."
if docker images "${IMAGE_NAME}" --format "{{.Repository}}:{{.Tag}}" | grep -q "${IMAGE_NAME}"; then
    log_success "Imagens encontradas:"
    docker images "${IMAGE_NAME}" --format "  - {{.Repository}}:{{.Tag}} ({{.Size}}, {{.CreatedAt}})"
else
    log_error "Nenhuma imagem encontrada: ${IMAGE_NAME}"
    log_info "Execute o build primeiro: ./deploy-stack.sh"
    exit 1
fi
echo ""

# 4. Verificar qual imagem o serviço está tentando usar
log_info "4. Imagem configurada no serviço:"
docker service inspect "${FULL_SERVICE_NAME}" --format "{{.Spec.TaskTemplate.ContainerSpec.Image}}" 2>/dev/null || log_error "Não foi possível obter a imagem do serviço"
echo ""

# 5. Verificar logs recentes
log_info "5. Últimos logs do serviço (últimas 50 linhas):"
echo "----------------------------------------"
docker service logs "${FULL_SERVICE_NAME}" --tail 50 --timestamps 2>&1 | tail -50 || log_warning "Não foi possível obter logs"
echo "----------------------------------------"
echo ""

# 6. Verificar tarefas do serviço
log_info "6. Tarefas do serviço (tasks):"
docker service ps "${FULL_SERVICE_NAME}" --no-trunc --format "table {{.ID}}\t{{.Name}}\t{{.Node}}\t{{.DesiredState}}\t{{.CurrentState}}\t{{.Error}}"
echo ""

# 7. Verificar recursos disponíveis
log_info "7. Verificando recursos do sistema:"
echo "  CPU: $(nproc) cores"
echo "  Memória: $(free -h | awk '/^Mem:/ {print $2}') total, $(free -h | awk '/^Mem:/ {print $3}') usado"
echo "  Disco: $(df -h / | awk 'NR==2 {print $4}') disponível"
echo ""

# 8. Verificar redes
log_info "8. Verificando redes Docker:"
if docker network ls --format "{{.Name}}" | grep -q "easypanel-estacao_terapia"; then
    log_success "Rede 'easypanel-estacao_terapia' existe"
else
    log_error "Rede 'easypanel-estacao_terapia' NÃO existe"
fi

if docker network ls --format "{{.Name}}" | grep -q "estacao-frontend-network"; then
    log_success "Rede 'estacao-frontend-network' existe"
else
    log_error "Rede 'estacao-frontend-network' NÃO existe"
fi
echo ""

# 9. Verificar arquivo de secrets
log_info "9. Verificando arquivo de secrets:"
SECRETS_FILE="/opt/secrets/nextjs-prd.env"
if [ -f "$SECRETS_FILE" ]; then
    log_success "Arquivo encontrado: $SECRETS_FILE"
    log_info "Tamanho: $(stat -c%s "$SECRETS_FILE" 2>/dev/null || stat -f%z "$SECRETS_FILE" 2>/dev/null) bytes"
else
    log_error "Arquivo NÃO encontrado: $SECRETS_FILE"
fi
echo ""

# 10. Tentar executar a imagem manualmente (teste)
log_info "10. Testando execução da imagem manualmente..."
LATEST_IMAGE=$(docker images "${IMAGE_NAME}" --format "{{.Repository}}:{{.Tag}}" | head -1)
if [ -n "$LATEST_IMAGE" ]; then
    log_info "Tentando executar: $LATEST_IMAGE"
    log_warning "Isso pode falhar se faltarem variáveis de ambiente, mas ajuda a diagnosticar"
    timeout 5 docker run --rm "$LATEST_IMAGE" node --version 2>&1 | head -5 || log_warning "Teste de execução falhou (pode ser normal se faltarem variáveis)"
else
    log_warning "Não foi possível testar - nenhuma imagem encontrada"
fi
echo ""

# 11. Verificar eventos do Docker
log_info "11. Eventos recentes do Docker (últimos 20):"
docker events --since 5m --until 0s --filter "service=${FULL_SERVICE_NAME}" 2>/dev/null | head -20 || log_info "Nenhum evento recente"
echo ""

# Resumo e recomendações
echo "=========================================="
echo "📋 RESUMO E RECOMENDAÇÕES"
echo "=========================================="
echo ""

# Verifica se há tarefas com erro
ERROR_TASKS=$(docker service ps "${FULL_SERVICE_NAME}" --filter "desired-state=running" --format "{{.Error}}" 2>/dev/null | grep -v "^$" | wc -l)

if [ "$ERROR_TASKS" -gt 0 ]; then
    log_error "Encontradas tarefas com erro!"
    log_info "Execute para ver detalhes:"
    echo "  docker service ps ${FULL_SERVICE_NAME} --no-trunc"
    echo ""
    log_info "Para ver logs detalhados:"
    echo "  docker service logs ${FULL_SERVICE_NAME} --tail 100 --follow"
    echo ""
fi

# Verifica se a imagem está sendo usada
CURRENT_IMAGE=$(docker service inspect "${FULL_SERVICE_NAME}" --format "{{.Spec.TaskTemplate.ContainerSpec.Image}}" 2>/dev/null)
if [ -n "$CURRENT_IMAGE" ]; then
    if docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^${CURRENT_IMAGE}$"; then
        log_success "A imagem do serviço existe localmente"
    else
        log_error "A imagem do serviço NÃO existe localmente: ${CURRENT_IMAGE}"
        log_info "Execute o build: ./deploy-stack.sh"
    fi
fi

echo ""
log_info "Para mais informações, execute:"
echo "  docker service logs ${FULL_SERVICE_NAME} --tail 100 --follow"
echo "  docker service ps ${FULL_SERVICE_NAME} --no-trunc"
