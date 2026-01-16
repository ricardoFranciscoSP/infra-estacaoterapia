#!/bin/bash

# Script para diagnosticar problemas de conexão com Redis no Docker Swarm
# Uso: bash api/diagnose-redis.sh

set -e

echo "🔍 Diagnóstico de Conexão Redis"
echo "================================"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Verificar se Redis service existe
echo -e "${BLUE}1. Verificando se Redis está rodando no Swarm...${NC}"
if docker service ls | grep -q "estacaoterapia_redis"; then
    echo -e "${GREEN}✅ Redis service encontrado${NC}"
    docker service ls | grep redis
else
    echo -e "${RED}❌ Redis service NÃO encontrado${NC}"
    echo "Services disponíveis:"
    docker service ls
    exit 1
fi
echo ""

# 2. Verificar replicas do Redis
echo -e "${BLUE}2. Verificando replicas do Redis...${NC}"
REDIS_REPLICAS=$(docker service ls --filter "name=estacaoterapia_redis" --format "{{.Replicas}}")
echo "Replicas: $REDIS_REPLICAS"
if [[ "$REDIS_REPLICAS" == "0/1" ]]; then
    echo -e "${RED}⚠️ Redis não tem replicas rodando. Verificar logs:${NC}"
    docker service logs estacaoterapia_redis --tail 20
    exit 1
fi
echo -e "${GREEN}✅ Redis com replicas ativas${NC}"
echo ""

# 3. Verificar logs do Redis
echo -e "${BLUE}3. Últimos 30 linhas dos logs do Redis...${NC}"
docker service logs estacaoterapia_redis --tail 30 2>/dev/null || echo "Sem logs disponíveis"
echo ""

# 4. Testar DNS do Redis (de dentro de um container)
echo -e "${BLUE}4. Testando DNS resolution do estacaoterapia_redis...${NC}"
SOCKET_CONTAINER=$(docker ps -q -f "label=com.docker.swarm.service.name=estacaoterapia_socket-server" | head -1)

if [ -z "$SOCKET_CONTAINER" ]; then
    echo -e "${YELLOW}⚠️ Nenhum container socket-server encontrado para teste DNS${NC}"
    echo "Tentando usar qualquer container rodando..."
    SOCKET_CONTAINER=$(docker ps -q | head -1)
    
    if [ -z "$SOCKET_CONTAINER" ]; then
        echo -e "${RED}❌ Nenhum container disponível para teste${NC}"
    else
        echo "Usando container: $SOCKET_CONTAINER"
        echo ""
        
        # Testar DNS
        echo "Testando: nslookup estacaoterapia_redis"
        docker exec "$SOCKET_CONTAINER" nslookup estacaoterapia_redis 2>&1 || echo "nslookup não disponível"
        echo ""
        
        # Testar conectividade básica
        echo "Testando: ping estacaoterapia_redis"
        docker exec "$SOCKET_CONTAINER" ping -c 2 estacaoterapia_redis 2>&1 || echo "ping falhou"
        echo ""
        
        # Testar porta
        echo "Testando: nc -zv estacaoterapia_redis 6379"
        docker exec "$SOCKET_CONTAINER" nc -zv estacaoterapia_redis 6379 2>&1 || echo "nc não disponível ou porta fechada"
    fi
else
    echo "Container socket-server encontrado: $SOCKET_CONTAINER"
    echo ""
    
    # Testar DNS
    echo "Testando: nslookup estacaoterapia_redis"
    docker exec "$SOCKET_CONTAINER" nslookup estacaoterapia_redis 2>&1 || echo "nslookup não disponível"
    echo ""
    
    # Testar conectividade básica
    echo "Testando: ping estacaoterapia_redis"
    docker exec "$SOCKET_CONTAINER" ping -c 2 estacaoterapia_redis 2>&1 || echo "ping falhou"
    echo ""
    
    # Testar porta
    echo "Testando: nc -zv estacaoterapia_redis 6379"
    docker exec "$SOCKET_CONTAINER" nc -zv estacaoterapia_redis 6379 2>&1 || echo "nc não disponível ou porta fechada"
fi
echo ""

# 5. Verificar se Redis requer password
echo -e "${BLUE}5. Verificando se Redis requer autenticação...${NC}"
REDIS_CONTAINER=$(docker ps -q -f "ancestor=redis" | head -1)

if [ -n "$REDIS_CONTAINER" ]; then
    echo "Testando com redis-cli..."
    
    # Tentar sem senha
    echo -n "Sem senha: "
    docker exec "$REDIS_CONTAINER" redis-cli PING 2>&1 | head -1 || echo "Falhou"
    
    # Mostrar requirepass
    echo "Configuração requirepass:"
    docker exec "$REDIS_CONTAINER" redis-cli CONFIG GET requirepass 2>/dev/null || echo "Não foi possível verificar"
else
    echo -e "${YELLOW}⚠️ Container Redis não encontrado para teste direto${NC}"
fi
echo ""

# 6. Verificar variáveis de ambiente
echo -e "${BLUE}6. Variáveis de ambiente para Redis...${NC}"
if [ -f "api/secrets/estacao_api.env" ]; then
    echo "Variáveis em api/secrets/estacao_api.env:"
    grep -i redis api/secrets/estacao_api.env | head -10 || echo "Nenhuma variável redis encontrada"
else
    echo -e "${YELLOW}⚠️ Arquivo api/secrets/estacao_api.env não encontrado${NC}"
fi
echo ""

# 7. Verificar redes Docker
echo -e "${BLUE}7. Redes Docker disponíveis...${NC}"
docker network ls | grep -i estacao || echo "Nenhuma rede com 'estacao' encontrada"
echo ""

# 8. Resumo
echo -e "${BLUE}════════════════════════════════════════════${NC}"
echo -e "${BLUE}Próximos passos para diagnosticar:${NC}"
echo ""
echo "1. Se Socket não conecta ao Redis:"
echo "   • Verificar: docker service logs estacaoterapia_socket-server --tail 100"
echo "   • URL da senha pode estar incorreta"
echo ""
echo "2. Se Redis não está rodando:"
echo "   • Redeployar: cd api && bash deploy.sh"
echo ""
echo "3. Para testar conexão diretamente:"
echo "   • docker exec <redis-container> redis-cli ping"
echo "   • docker exec <redis-container> redis-cli -a <password> ping"
echo ""
echo "4. Para ver a senha do Redis:"
echo "   • grep REDIS_PASSWORD api/secrets/estacao_api.env"
echo "   • ou: docker service inspect estacaoterapia_redis | grep -i password"
echo ""
