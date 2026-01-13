#!/bin/bash
# Script de Validação - Estação Terapia
# Valida se o serviço e domínio estão configurados corretamente

set -e

echo "🔍 VALIDAÇÃO DO SERVIÇO ESTAÇÃO TERAPIA"
echo "========================================"
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para testar endpoint
test_endpoint() {
    local url=$1
    local description=$2
    
    echo -n "Testando $description... "
    
    if response=$(curl -s -o /dev/null -w "%{http_code}" -m 5 "$url" 2>/dev/null); then
        if [ "$response" = "200" ] || [ "$response" = "204" ]; then
            echo -e "${GREEN}✓ OK ($response)${NC}"
            return 0
        else
            echo -e "${RED}✗ FALHOU (HTTP $response)${NC}"
            return 1
        fi
    else
        echo -e "${RED}✗ ERRO (timeout ou conexão falhou)${NC}"
        return 1
    fi
}

# 1. Verificar se serviço está rodando
echo "1️⃣  Verificando serviço Docker Swarm..."
if docker service ls | grep -q "estacao_estacao_next_prd"; then
    replicas=$(docker service ls | grep "estacao_estacao_next_prd" | awk '{print $4}')
    echo -e "${GREEN}✓ Serviço está rodando: $replicas${NC}"
else
    echo -e "${RED}✗ Serviço não encontrado!${NC}"
    exit 1
fi
echo ""

# 2. Verificar porta local
echo "2️⃣  Testando porta local 3001..."
test_endpoint "http://127.0.0.1:3001/api/health" "Health endpoint local"
test_endpoint "http://127.0.0.1:3001/" "Página inicial local"
echo ""

# 3. Simular requisição com Host correto
echo "3️⃣  Simulando requisição com Host: estacaoterapia.com.br..."
if curl -s -H "Host: estacaoterapia.com.br" http://127.0.0.1:3001/ | grep -q "<!DOCTYPE html>"; then
    echo -e "${GREEN}✓ App responde corretamente ao Host estacaoterapia.com.br${NC}"
else
    echo -e "${YELLOW}⚠ App não retornou HTML esperado${NC}"
fi
echo ""

# 4. Testar domínio público (HTTPS)
echo "4️⃣  Testando domínio público HTTPS..."
test_endpoint "https://estacaoterapia.com.br" "Domínio principal (HTTPS)"
test_endpoint "https://estacaoterapia.com.br/api/health" "Health endpoint público"
echo ""

# 5. Verificar logs recentes
echo "5️⃣  Últimas 10 linhas de log do serviço..."
echo "─────────────────────────────────────"
docker service logs --tail 10 estacao_estacao_next_prd 2>/dev/null || echo -e "${YELLOW}⚠ Não foi possível obter logs${NC}"
echo "─────────────────────────────────────"
echo ""

# 6. Informações do container
echo "6️⃣  Informações do container..."
container_id=$(docker ps --filter "name=estacao_estacao_next_prd" --format "{{.ID}}" | head -n 1)
if [ -n "$container_id" ]; then
    echo "Container ID: $container_id"
    echo "Status: $(docker ps --filter "id=$container_id" --format "{{.Status}}")"
    echo "Portas: $(docker ps --filter "id=$container_id" --format "{{.Ports}}")"
else
    echo -e "${YELLOW}⚠ Container não encontrado${NC}"
fi
echo ""

# Resumo
echo "📊 RESUMO"
echo "========================================"

# Contar sucessos
success_count=0
total_tests=4

# Reexecutar testes silenciosamente para contagem
curl -s -o /dev/null -w "%{http_code}" -m 5 "http://127.0.0.1:3001/api/health" 2>/dev/null | grep -q "200\|204" && ((success_count++)) || true
curl -s -o /dev/null -w "%{http_code}" -m 5 "http://127.0.0.1:3001/" 2>/dev/null | grep -q "200\|204" && ((success_count++)) || true
curl -s -o /dev/null -w "%{http_code}" -m 5 "https://estacaoterapia.com.br" 2>/dev/null | grep -q "200\|204" && ((success_count++)) || true
curl -s -o /dev/null -w "%{http_code}" -m 5 "https://estacaoterapia.com.br/api/health" 2>/dev/null | grep -q "200\|204" && ((success_count++)) || true

echo "Testes passados: $success_count/$total_tests"

if [ $success_count -eq $total_tests ]; then
    echo -e "${GREEN}✓ Todos os testes passaram! Sistema funcionando 100%${NC}"
    exit 0
elif [ $success_count -ge 2 ]; then
    echo -e "${YELLOW}⚠ Alguns testes falharam. Verifique a configuração do EaYPanel/Cloudflare${NC}"
    echo ""
    echo "Passos sugeridos:"
    echo "1. Verifique se os headers X-Forwarded-* estão configurados no EaYPanel"
    echo "2. Confirme que SSL foi gerado no EaYPanel"
    echo "3. Verifique se Cloudflare está em modo 'Full (strict)'"
    echo "4. Consulte EASYPANEL-CONFIG.md para mais detalhes"
    exit 1
else
    echo -e "${RED}✗ Múltiplos testes falharam. Verificar configuração urgentemente${NC}"
    echo ""
    echo "Execute:"
    echo "  docker service ps estacao_estacao_next_prd --no-trunc"
    echo "  docker service logs --tail 50 estacao_estacao_next_prd"
    exit 1
fi
