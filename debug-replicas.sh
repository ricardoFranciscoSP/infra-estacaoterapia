#!/bin/bash
set -euo pipefail

echo "=================================="
echo "DIAGNÓSTICO DE REPLICAS"
echo "=================================="
echo ""

# 1. Listar serviços
echo "📊 SERVIÇOS E REPLICAS:"
docker service ls --filter "label=com.docker.stack.namespace=estacaoterapia" --format "table {{.Name}}\t{{.Replicas}}\t{{.Mode}}" || echo "Sem serviços encontrados"

echo ""
echo "📋 TAREFAS (Tasks) POR SERVIÇO:"
echo ""

for service in postgres redis pgbouncer api socket-server; do
    full_service="estacaoterapia_${service}"
    echo ">>> $full_service:"
    docker service ps "$full_service" --no-trunc 2>/dev/null | tail -3 || echo "   Serviço não encontrado"
    echo ""
done

echo ""
echo "🔍 LOGS DOS ÚLTIMOS ERROS:"
echo ""

for service in redis pgbouncer api socket-server; do
    full_service="estacaoterapia_${service}"
    echo ">>> $full_service (últimas 5 linhas):"
    docker service logs "$full_service" --tail 5 2>/dev/null | tail -3 || echo "   Nenhum log disponível"
    echo ""
done

echo ""
echo "🐳 CONTAINERS RODANDO:"
docker ps --filter "label=com.docker.stack.namespace=estacaoterapia" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}" || echo "Sem containers"

echo ""
echo "❌ CONTAINERS PARADOS/EXITED:"
docker ps -a --filter "label=com.docker.stack.namespace=estacaoterapia" --filter "status=exited" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}" || echo "Sem containers parados"

echo ""
echo "📦 IMAGENS DISPONÍVEIS:"
docker images --filter "reference=estacaoterapia*" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" || echo "Sem imagens encontradas"
