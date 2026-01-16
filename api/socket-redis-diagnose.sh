#!/bin/bash

# Script de diagnóstico para problemas de conexão Redis + Socket.IO
# Uso: ./socket-redis-diagnose.sh

set -e

echo "🔍 Diagnóstico Redis + Socket.IO Adapter"
echo "========================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Verificar se Redis está rodando
echo "1️⃣  Verificando status do serviço Redis..."
if docker service ls | grep -q "estacaoterapia_redis"; then
    echo -e "${GREEN}✅ Serviço Redis existe${NC}"
    docker service ps estacaoterapia_redis --no-trunc
else
    echo -e "${RED}❌ Serviço Redis NÃO ENCONTRADO${NC}"
    echo "   Verifique com: docker service ls | grep redis"
    exit 1
fi

echo ""

# 2. Verificar logs do Redis
echo "2️⃣  Últimos 20 logs do Redis..."
docker service logs estacaoterapia_redis --tail 20 --no-task-ids 2>&1 | head -20 || echo "⚠️  Sem logs acessíveis"

echo ""

# 3. Verificar Socket Server
echo "3️⃣  Verificando status do Socket Server..."
SOCKET_SERVICE=$(docker service ls --filter "name=socket" --format "{{.Name}}" 2>/dev/null || echo "")
if [ -z "$SOCKET_SERVICE" ]; then
    echo -e "${YELLOW}⚠️  Nenhum serviço Socket encontrado${NC}"
else
    echo -e "${GREEN}✅ Serviço Socket encontrado: $SOCKET_SERVICE${NC}"
    docker service ps "$SOCKET_SERVICE" --no-trunc
fi

echo ""

# 4. Verificar variáveis de ambiente
echo "4️⃣  Variáveis de ambiente para Redis..."
echo "   Procurando em docker-stack.yml..."
grep -A 5 "REDIS_" api/docker-stack.yml 2>/dev/null || echo "⚠️  Não encontradas em docker-stack.yml"

echo ""

# 5. Testar conectividade da rede Swarm
echo "5️⃣  Verificando rede Docker Swarm..."
docker network ls --filter "name=estacaoterapia" --format "table {{.Name}}\t{{.Driver}}" || echo "⚠️  Sem rede encontrada"

echo ""

# 6. Testar resolução DNS
echo "6️⃣  Testando resolução DNS (estacaoterapia_redis)..."
SOCKET_CONTAINER=$(docker ps --filter "label=com.docker.swarm.service.name=estacaoterapia_socket-server" --format "{{.ID}}" 2>/dev/null | head -1)

if [ -n "$SOCKET_CONTAINER" ]; then
    echo "   Testando de dentro do container Socket..."
    docker exec "$SOCKET_CONTAINER" nslookup estacaoterapia_redis 2>&1 | tail -5 || echo "⚠️  nslookup não disponível"
else
    echo "⚠️  Nenhum container Socket encontrado para testar DNS"
fi

echo ""

# 7. Verificar conectividade de porta
echo "7️⃣  Testando conectividade ao Redis (6379)..."
if [ -n "$SOCKET_CONTAINER" ]; then
    docker exec "$SOCKET_CONTAINER" timeout 5 bash -c "echo PING | nc -w 1 estacaoterapia_redis 6379" 2>&1 && \
        echo -e "${GREEN}✅ Porta 6379 está aberta${NC}" || \
        echo -e "${YELLOW}⚠️  Não conseguiu conectar à porta 6379${NC}"
fi

echo ""

# 8. Verificar REQUIREPASS no Redis
echo "8️⃣  Verificando configuração REQUIREPASS do Redis..."
REDIS_CONTAINER=$(docker ps --filter "label=com.docker.swarm.service.name=estacaoterapia_redis" --format "{{.ID}}" 2>/dev/null | head -1)

if [ -n "$REDIS_CONTAINER" ]; then
    echo "   Conectando ao container Redis..."
    docker exec "$REDIS_CONTAINER" redis-cli CONFIG GET requirepass 2>&1 | head -2 || echo "⚠️  Não conseguiu executar redis-cli"
else
    echo "⚠️  Nenhum container Redis encontrado"
fi

echo ""

# 9. Verificar variáveis REDIS_* do Socket Server
echo "9️⃣  Variáveis REDIS_* no Socket Server..."
if [ -n "$SOCKET_CONTAINER" ]; then
    echo "   Variáveis de ambiente:"
    docker exec "$SOCKET_CONTAINER" env | grep REDIS || echo "⚠️  Nenhuma variável REDIS encontrada"
else
    echo "⚠️  Container Socket não encontrado"
fi

echo ""

# 10. Recomendações
echo "1️⃣0️⃣  Recomendações para fix:"
echo ""
echo "Se o problema é 'Timeout aguardando subClient':"
echo ""
echo "   a) Reiniciar Redis:"
echo "      docker service update --force estacaoterapia_redis"
echo ""
echo "   b) Reiniciar Socket Server:"
echo "      docker service update --force estacaoterapia_socket-server"
echo ""
echo "   c) Se houver problema de senha:"
echo "      • Verifique se REDIS_PASSWORD está definido no docker-stack.yml"
echo "      • Verifique se a senha no Redis está correta"
echo "      • Teste com: docker exec <redis-container> redis-cli -a <password> PING"
echo ""
echo "   d) Se houver problema de DNS/Rede:"
echo "      docker service ls"
echo "      docker network ls"
echo "      docker network inspect <network-name>"
echo ""

echo -e "${GREEN}✅ Diagnóstico completo${NC}"
