#!/bin/bash

# ============================================
# Script de Diagnóstico de Rede Overlay
# Uso: ./diagnose-network.sh
# ============================================

set -e

STACK_NAME="${1:-estacaoterapia}"
NETWORK_NAME="${STACK_NAME}_backend"

echo "🔍 Diagnóstico de Rede Overlay Docker Swarm"
echo "=========================================="
echo ""

# Verificar se Docker está disponível
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não está instalado"
    exit 1
fi

# Verificar se é um nó Swarm
echo "📋 Status do Swarm:"
if docker info | grep -q "Swarm: active"; then
    echo "✅ Docker Swarm está ativo"
else
    echo "❌ Docker Swarm não está ativo"
    echo "   Solução: Execute 'docker swarm init' ou 'docker swarm join'"
    exit 1
fi

echo ""
echo "🌐 Redes overlay disponíveis:"
docker network ls --filter "driver=overlay" --format "table {{.Name}}\t{{.ID}}\t{{.Scope}}"

echo ""
echo "🔎 Inspecionando rede: $NETWORK_NAME"
if docker network inspect "$NETWORK_NAME" &>/dev/null; then
    echo "✅ Rede encontrada"
    echo ""
    
    # Mostrar informações da rede
    docker network inspect "$NETWORK_NAME" --format '
Configuração:
  • Driver: {{.Driver}}
  • Scope: {{.Scope}}
  • Internal: {{.Internal}}
  • VXLAN ID: {{ index .DriverOpts "com.docker.network.driver.overlay.vxlanid" }}
  • Subnets: {{ range .IPAM.Config }}{{ .Subnet }} {{ end }}

Containers conectados:
{{ range .Containers }}  • {{ .Name }} ({{.IPv4Address}})
{{ end }}'
else
    echo "❌ Rede não encontrada: $NETWORK_NAME"
    exit 1
fi

echo ""
echo "🚀 Serviços no Stack:"
docker service ls --filter "label=com.docker.stack.namespace=$STACK_NAME" --format "table {{.Name}}\t{{.Mode}}\t{{.Replicas}}\t{{.Image}}"

echo ""
echo "📊 Tarefas de serviços:"
docker service ls --filter "label=com.docker.stack.namespace=$STACK_NAME" -q | while read service_id; do
    service_name=$(docker service inspect "$service_id" --format "{{.Spec.Name}}")
    echo ""
    echo "  Service: $service_name"
    docker service ps "$service_id" --format "    {{.Node}}\t{{.CurrentState}}\t{{.Image}}"
done

echo ""
echo "🧪 Testando conectividade entre serviços:"
echo ""

# Encontrar container da API
API_CONTAINER=$(docker ps -q -f "label=com.docker.swarm.service.name=$STACK_NAME"_api 2>/dev/null | head -1)

if [ -z "$API_CONTAINER" ]; then
    echo "⚠️  Container da API não encontrado"
    echo "   Isso é normal se o stack não foi deployado ainda"
else
    echo "✅ Container da API encontrado: $API_CONTAINER"
    echo ""
    
    # Testar DNS para Redis
    echo "🔗 Testando resolução DNS para Redis:"
    
    if docker exec "$API_CONTAINER" nslookup redis 2>/dev/null; then
        echo "✅ Redis resolvido via nslookup"
    else
        echo "⚠️  nslookup falhou, tentando getent..."
        if docker exec "$API_CONTAINER" getent hosts redis 2>/dev/null; then
            echo "✅ Redis resolvido via getent"
        else
            echo "❌ Redis não foi resolvido"
        fi
    fi
    
    echo ""
    echo "🔗 Testando resolução DNS para FQDN (redis.estacaoterapia_backend):"
    
    if docker exec "$API_CONTAINER" nslookup redis.estacaoterapia_backend 2>/dev/null; then
        echo "✅ FQDN resolvido"
    else
        echo "⚠️  FQDN não resolvido (isso é esperado em alguns casos)"
    fi
    
    echo ""
    echo "📡 Nameservers do container:"
    docker exec "$API_CONTAINER" cat /etc/resolv.conf | grep -E "^nameserver" || echo "Nenhum nameserver encontrado"
    
    echo ""
    echo "🌐 Interfaces de rede do container:"
    docker exec "$API_CONTAINER" ip addr show 2>/dev/null | grep -E "inet " || echo "Sem interfaces IPv4"
fi

echo ""
echo "✅ Diagnóstico concluído"
echo ""
echo "💡 Dicas se houver problemas:"
echo "   1. Verify Redis está em ambas as redes (estacao-backend-network e estacaoterapia_backend)"
echo "   2. Use REDIS_HOST=redis.estacaoterapia_backend se houver problemas com DNS"
echo "   3. Verificar logs do Docker Swarm: docker logs <container-id>"
echo "   4. Reiniciar Swarm se persistir: docker service update --force <service-name>"
