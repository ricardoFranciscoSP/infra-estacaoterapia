#!/bin/bash
set -e

echo "🔧 Aplicando Fix: Prisma Client ES Module Error"
echo "================================================"
echo ""

# Obtém o ID do container da API
CONTAINER_ID=$(docker ps -q -f name=estacaoterapia_api | head -1)

if [ -z "$CONTAINER_ID" ]; then
    echo "❌ Container da API não encontrado!"
    echo "   Verifique se o serviço está rodando: docker service ls"
    exit 1
fi

echo "✅ Container encontrado: $CONTAINER_ID"
echo ""

echo "🧹 Limpando cache do Prisma..."
docker exec $CONTAINER_ID bash -c "cd /app && rm -rf src/generated/prisma node_modules/.prisma"

echo ""
echo "🔄 Regenerando Prisma Client..."
docker exec $CONTAINER_ID bash -c "cd /app && npm run prisma:generate"

echo ""
echo "🔨 Recompilando aplicação..."
docker exec $CONTAINER_ID bash -c "cd /app && npm run build"

echo ""
echo "✅ Build completo!"
echo ""

echo "🔄 Forçando redeploy do serviço..."
docker service update --force estacaoterapia_api

echo ""
echo "⏳ Aguardando serviço reiniciar..."
sleep 5

echo ""
echo "📊 Status do serviço:"
docker service ps estacaoterapia_api --no-trunc --format "table {{.ID}}\t{{.Name}}\t{{.CurrentState}}\t{{.Error}}" | head -5

echo ""
echo "📋 Logs recentes (últimas 20 linhas):"
docker service logs estacaoterapia_api --tail 20

echo ""
echo "✅ Fix aplicado com sucesso!"
echo ""
echo "📡 Para monitorar os logs:"
echo "   docker service logs estacaoterapia_api --tail 50 -f"
