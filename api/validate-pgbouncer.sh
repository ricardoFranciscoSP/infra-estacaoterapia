#!/bin/bash
# 🔍 Script de validação da configuração do PgBouncer
# Uso: ./validate-pgbouncer.sh

set -e

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 PgBouncer Configuration Validator${NC}"
echo "======================================"

# Variáveis
SERVICE_NAME="estacaoterapia_pgbouncer"
NETWORK_NAME="estacaoterapia_backend"

# Função de teste
test_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        return 1
    fi
}

echo ""
echo -e "${YELLOW}1️⃣  Verificando Docker Swarm${NC}"
echo "-----------------------------------"
docker info 2>/dev/null | grep -q "Swarm: active"
test_status
if [ $? -ne 0 ]; then
    echo -e "${RED}Docker Swarm não está ativo. Execute: docker swarm init${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}2️⃣  Verificando Secrets${NC}"
echo "-----------------------------------"
echo -n "pgbouncer.ini: "
docker secret inspect pgbouncer.ini &>/dev/null
test_status

echo -n "userlist.txt: "
docker secret inspect userlist.txt &>/dev/null
test_status

echo ""
echo -e "${YELLOW}3️⃣  Verificando Network${NC}"
echo "-----------------------------------"
echo -n "$NETWORK_NAME: "
docker network inspect $NETWORK_NAME &>/dev/null
test_status

echo ""
echo -e "${YELLOW}4️⃣  Verificando Service PgBouncer${NC}"
echo "-----------------------------------"

# Verificar se service existe
echo -n "Service exists: "
docker service inspect $SERVICE_NAME &>/dev/null
SERVICE_EXISTS=$?
test_status

if [ $SERVICE_EXISTS -eq 0 ]; then
    # Verificar réplicas
    echo -n "Replicas running: "
    REPLICAS=$(docker service ps $SERVICE_NAME --filter "desired-state=running" -q | wc -l)
    if [ "$REPLICAS" -gt 0 ]; then
        echo -e "${GREEN}✅ PASS ($REPLICAS)${NC}"
    else
        echo -e "${RED}❌ FAIL (0)${NC}"
    fi
    
    # Verificar estado
    echo ""
    echo "Service status:"
    docker service ps $SERVICE_NAME --format "table {{.Name}}\t{{.CurrentState}}\t{{.Error}}" | head -n 5
    
    # Pegar ID do container
    CONTAINER_ID=$(docker ps -q -f name=$SERVICE_NAME | head -n 1)
    
    if [ -n "$CONTAINER_ID" ]; then
        echo ""
        echo -e "${YELLOW}5️⃣  Verificando Container${NC}"
        echo "-----------------------------------"
        
        # Verificar arquivos de configuração
        echo -n "pgbouncer.ini exists: "
        docker exec $CONTAINER_ID test -f /etc/pgbouncer/pgbouncer.ini &>/dev/null
        test_status
        
        echo -n "userlist.txt exists: "
        docker exec $CONTAINER_ID test -f /etc/pgbouncer/userlist.txt &>/dev/null
        test_status
        
        # Verificar configuração do banco
        echo ""
        echo "Database configuration:"
        docker exec $CONTAINER_ID cat /etc/pgbouncer/pgbouncer.ini | grep -A 1 "\[databases\]"
        
        # Verificar resolução DNS
        echo ""
        echo -e "${YELLOW}6️⃣  Verificando DNS Resolution${NC}"
        echo "-----------------------------------"
        echo -n "postgres hostname: "
        docker exec $CONTAINER_ID nslookup postgres &>/dev/null
        test_status
        
        # Mostrar IP resolvido
        echo "Resolved to:"
        docker exec $CONTAINER_ID nslookup postgres 2>/dev/null | grep -A 1 "Name:" | tail -n 1
        
        # Verificar conectividade PostgreSQL
        echo ""
        echo -e "${YELLOW}7️⃣  Verificando Conectividade PostgreSQL${NC}"
        echo "-----------------------------------"
        echo -n "PostgreSQL reachable: "
        docker exec $CONTAINER_ID nc -zv postgres 5432 &>/dev/null
        test_status
        
        # Verificar porta PgBouncer
        echo ""
        echo -e "${YELLOW}8️⃣  Verificando Porta PgBouncer${NC}"
        echo "-----------------------------------"
        echo -n "Port 6432 listening: "
        docker exec $CONTAINER_ID netstat -ln 2>/dev/null | grep -q ":6432" || \
        docker exec $CONTAINER_ID ss -ln 2>/dev/null | grep -q ":6432"
        test_status
        
        # Verificar healthcheck
        echo ""
        echo -e "${YELLOW}9️⃣  Verificando Healthcheck${NC}"
        echo "-----------------------------------"
        echo -n "pg_isready: "
        docker exec $CONTAINER_ID pg_isready -h localhost -p 6432 -q &>/dev/null
        test_status
        
        # Logs recentes
        echo ""
        echo -e "${YELLOW}🔟 Últimos logs (10 linhas)${NC}"
        echo "-----------------------------------"
        docker service logs $SERVICE_NAME --tail 10 --no-trunc 2>&1 | tail -n 10
        
    else
        echo -e "${RED}❌ Nenhum container rodando para $SERVICE_NAME${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Service $SERVICE_NAME não encontrado${NC}"
fi

# Verificar service PostgreSQL
echo ""
echo -e "${YELLOW}1️⃣1️⃣  Verificando Service PostgreSQL${NC}"
echo "-----------------------------------"
echo -n "postgres service: "
docker service inspect estacaoterapia_postgres &>/dev/null
test_status

if [ $? -eq 0 ]; then
    POSTGRES_REPLICAS=$(docker service ps estacaoterapia_postgres --filter "desired-state=running" -q | wc -l)
    echo "Running replicas: $POSTGRES_REPLICAS"
fi

# Resumo final
echo ""
echo "======================================"
echo -e "${BLUE}📊 Resumo da Validação${NC}"
echo "======================================"

if [ $SERVICE_EXISTS -eq 0 ] && [ -n "$CONTAINER_ID" ]; then
    echo -e "${GREEN}✅ PgBouncer está configurado corretamente${NC}"
    echo ""
    echo "Para testar a conexão, execute:"
    echo "  docker exec -it $CONTAINER_ID psql -h localhost -p 6432 -U estacaoterapia -d estacaoterapia -c 'SELECT version();'"
else
    echo -e "${YELLOW}⚠️  PgBouncer não está rodando ou há problemas${NC}"
    echo ""
    echo "Para deployar, execute:"
    echo "  docker stack deploy -c docker-stack.yml estacaoterapia"
fi

echo ""
echo -e "${BLUE}📝 Comandos úteis:${NC}"
echo "  Ver logs:      docker service logs $SERVICE_NAME -f"
echo "  Forçar update: docker service update --force $SERVICE_NAME"
echo "  Inspecionar:   docker service inspect $SERVICE_NAME"
echo "  Containers:    docker service ps $SERVICE_NAME"
