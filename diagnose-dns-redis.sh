#!/bin/bash

# 🔧 Script de Diagnóstico - Problemas de DNS e Redis
# Uso: bash diagnose-dns-redis.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🔍 DIAGNÓSTICO: Problemas de DNS e Redis${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# ============================================
# 1. VERIFICAR REDES
# ============================================
echo -e "${YELLOW}1️⃣  VERIFICANDO REDES DOCKER${NC}"
echo "───────────────────────────────────────────────────────────────"

if docker network ls | grep -q "estacao-backend-network"; then
    echo -e "${GREEN}✅ Rede 'estacao-backend-network' existe${NC}"
    docker network ls | grep "estacao-backend-network"
else
    echo -e "${RED}❌ Rede 'estacao-backend-network' NÃO EXISTE${NC}"
    echo "   Criar com: docker network create --driver overlay estacao-backend-network"
fi

if docker network ls | grep -q "estacao-network"; then
    echo -e "${GREEN}✅ Rede 'estacao-network' existe${NC}"
    docker network ls | grep "estacao-network"
else
    echo -e "${RED}❌ Rede 'estacao-network' NÃO EXISTE${NC}"
fi

echo ""

# ============================================
# 2. VERIFICAR VOLUMES
# ============================================
echo -e "${YELLOW}2️⃣  VERIFICANDO VOLUMES DOCKER${NC}"
echo "───────────────────────────────────────────────────────────────"

for volume in redis_data postgres_data documentos_data caddy_data caddy_config; do
    if docker volume ls | grep -q "^.*${volume}"; then
        echo -e "${GREEN}✅ Volume '$volume' existe${NC}"
    else
        echo -e "${RED}❌ Volume '$volume' NÃO EXISTE${NC}"
    fi
done

echo ""

# ============================================
# 3. VERIFICAR SERVIÇOS EM EXECUÇÃO
# ============================================
echo -e "${YELLOW}3️⃣  VERIFICANDO SERVIÇOS DOCKER SWARM${NC}"
echo "───────────────────────────────────────────────────────────────"

if command -v docker-swarm &> /dev/null || docker info | grep -q "Swarm: active"; then
    echo -e "${GREEN}✅ Docker Swarm está ativo${NC}"
    echo ""
    echo "Serviços em execução:"
    docker service ls --format "table {{.Name}}\t{{.Replicas}}\t{{.Image}}" || echo "Nenhum serviço encontrado"
else
    echo -e "${YELLOW}⚠️  Docker Swarm não está ativo${NC}"
    echo "   Use: docker swarm init"
fi

echo ""

# ============================================
# 4. VERIFICAR CONECTIVIDADE REDIS
# ============================================
echo -e "${YELLOW}4️⃣  VERIFICANDO CONECTIVIDADE REDIS${NC}"
echo "───────────────────────────────────────────────────────────────"

# Procurar container Redis
REDIS_CONTAINER=$(docker ps --filter "name=redis" --format "{{.Names}}" 2>/dev/null | head -1)

if [ -n "$REDIS_CONTAINER" ]; then
    echo -e "${GREEN}✅ Container Redis encontrado: $REDIS_CONTAINER${NC}"
    
    # Verificar healthcheck
    STATUS=$(docker inspect "$REDIS_CONTAINER" --format='{{.State.Health.Status}}' 2>/dev/null || echo "N/A")
    echo "   Status: $STATUS"
    
    # Testar ping
    if docker exec "$REDIS_CONTAINER" redis-cli ping &>/dev/null; then
        echo -e "${GREEN}✅ Redis respondendo ao PING${NC}"
    else
        echo -e "${RED}❌ Redis NÃO respondendo ao PING${NC}"
        echo "   Verificar logs: docker logs $REDIS_CONTAINER"
    fi
else
    echo -e "${YELLOW}⚠️  Nenhum container Redis encontrado em execução${NC}"
    echo "   Procure por: docker ps | grep redis"
fi

echo ""

# ============================================
# 5. VERIFICAR CONECTIVIDADE API
# ============================================
echo -e "${YELLOW}5️⃣  VERIFICANDO CONECTIVIDADE API${NC}"
echo "───────────────────────────────────────────────────────────────"

# Procurar container API
API_CONTAINER=$(docker ps --filter "name=api" --format "{{.Names}}" 2>/dev/null | grep -v socket | head -1)

if [ -n "$API_CONTAINER" ]; then
    echo -e "${GREEN}✅ Container API encontrado: $API_CONTAINER${NC}"
    
    # Verificar healthcheck
    STATUS=$(docker inspect "$API_CONTAINER" --format='{{.State.Health.Status}}' 2>/dev/null || echo "N/A")
    echo "   Status: $STATUS"
    
    # Testar health endpoint
    if docker exec "$API_CONTAINER" curl -s http://localhost:3333/health &>/dev/null; then
        echo -e "${GREEN}✅ API respondendo no /health${NC}"
    else
        echo -e "${RED}❌ API NÃO respondendo no /health${NC}"
        echo "   Verificar logs: docker logs $API_CONTAINER"
    fi
    
    # Verificar conectividade com Redis
    echo ""
    echo "Testando conectividade API → Redis:"
    if docker exec "$API_CONTAINER" nslookup redis &>/dev/null; then
        echo -e "${GREEN}✅ DNS resolve 'redis'${NC}"
    else
        echo -e "${YELLOW}⚠️  Falha ao resolver 'redis' via DNS${NC}"
    fi
    
else
    echo -e "${YELLOW}⚠️  Nenhum container API encontrado em execução${NC}"
    echo "   Procure por: docker ps | grep api"
fi

echo ""

# ============================================
# 6. VERIFICAR CONECTIVIDADE SOCKET-SERVER
# ============================================
echo -e "${YELLOW}6️⃣  VERIFICANDO CONECTIVIDADE SOCKET-SERVER${NC}"
echo "───────────────────────────────────────────────────────────────"

# Procurar container Socket
SOCKET_CONTAINER=$(docker ps --filter "name=socket" --format "{{.Names}}" 2>/dev/null | head -1)

if [ -n "$SOCKET_CONTAINER" ]; then
    echo -e "${GREEN}✅ Container Socket encontrado: $SOCKET_CONTAINER${NC}"
    
    # Verificar healthcheck
    STATUS=$(docker inspect "$SOCKET_CONTAINER" --format='{{.State.Health.Status}}' 2>/dev/null || echo "N/A")
    echo "   Status: $STATUS"
    
    # Testar health endpoint
    if docker exec "$SOCKET_CONTAINER" curl -s http://localhost:3334/health &>/dev/null; then
        echo -e "${GREEN}✅ Socket-server respondendo no /health${NC}"
    else
        echo -e "${RED}❌ Socket-server NÃO respondendo no /health${NC}"
        echo "   Verificar logs: docker logs $SOCKET_CONTAINER"
    fi
    
    # Verificar conectividade com API
    echo ""
    echo "Testando conectividade Socket → API:"
    if docker exec "$SOCKET_CONTAINER" nslookup api &>/dev/null; then
        echo -e "${GREEN}✅ DNS resolve 'api'${NC}"
    else
        echo -e "${RED}❌ DNS NÃO resolve 'api'${NC}"
        echo "   Este é o erro reportado!"
    fi
else
    echo -e "${YELLOW}⚠️  Nenhum container Socket-server encontrado em execução${NC}"
fi

echo ""

# ============================================
# 7. VERIFICAR CADDY
# ============================================
echo -e "${YELLOW}7️⃣  VERIFICANDO CADDY REVERSE PROXY${NC}"
echo "───────────────────────────────────────────────────────────────"

CADDY_CONTAINER=$(docker ps --filter "name=caddy" --format "{{.Names}}" 2>/dev/null | head -1)

if [ -n "$CADDY_CONTAINER" ]; then
    echo -e "${GREEN}✅ Container Caddy encontrado: $CADDY_CONTAINER${NC}"
    
    # Verificar healthcheck
    STATUS=$(docker inspect "$CADDY_CONTAINER" --format='{{.State.Health.Status}}' 2>/dev/null || echo "N/A")
    echo "   Status: $STATUS"
    
    # Verificar se está conectado às redes corretas
    echo ""
    echo "Redes conectadas:"
    docker inspect "$CADDY_CONTAINER" --format='{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{println}}{{end}}'
    
else
    echo -e "${YELLOW}⚠️  Nenhum container Caddy encontrado em execução${NC}"
fi

echo ""

# ============================================
# 8. RESUMO E RECOMENDAÇÕES
# ============================================
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📋 RESUMO E RECOMENDAÇÕES${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

echo "Se encontrou erros acima:"
echo ""
echo "1. Para problema de Redis timeout:"
echo "   • Aguarde 60+ segundos após deploy (Redis precisa iniciar)"
echo "   • Verificar logs: docker service logs estacaoterapia_redis"
echo "   • Se persistir, tentar recrear volume: docker volume rm redis_data"
echo ""
echo "2. Para problema de DNS (api não resolve):"
echo "   • Verificar rede overlay está criada corretamente"
echo "   • Executar: docker network inspect estacao-backend-network"
echo "   • Verificar se API e Socket estão na mesma rede"
echo ""
echo "3. Para problema de Caddy não alcançar API:"
echo "   • Garantir Caddy está em AMBAS as redes:"
echo "     - estacao-network (para frontend)"
echo "     - estacao-backend-network (para API/Socket)"
echo ""
echo "4. Verificar de novo com: bash diagnose-dns-redis.sh"
echo ""
echo -e "${GREEN}✅ Diagnóstico concluído${NC}"
