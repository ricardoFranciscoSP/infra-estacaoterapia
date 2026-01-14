#!/bin/bash
set -e

# ==============================
# 🌐 Deploy Caddy - Docker Swarm
# ==============================

echo "======================================"
echo "🌐 DEPLOY CADDY - $(date)"
echo "======================================"

# ==============================
# 1️⃣ Validar pré-requisitos
# ==============================
echo ""
echo "🔍 Validando pré-requisitos..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker não encontrado!"
    exit 1
fi

if ! docker info | grep -q "Swarm: active"; then
    echo "❌ Docker Swarm não está ativo!"
    exit 1
fi

if [ ! -f "docker-stack.caddy.yml" ]; then
    echo "❌ docker-stack.caddy.yml não encontrado!"
    exit 1
fi

if [ ! -f "Caddyfile" ]; then
    echo "❌ Caddyfile não encontrado!"
    exit 1
fi

echo "✅ Pré-requisitos validados"

# ==============================
# 2️⃣ Criar/Verificar rede necessária
# ==============================
echo ""
echo "🌐 Verificando rede Docker..."

if ! docker network ls --format '{{.Name}}' | grep -q "^estacao-network$"; then
    echo "   → Criando rede estacao-network..."
    docker network create --driver overlay estacao-network || {
        echo "❌ Falha ao criar rede!"
        exit 1
    }
    echo "✅ Rede estacao-network criada"
else
    echo "✅ Rede estacao-network já existe"
fi

# ==============================
# 3️⃣ Criar/Verificar volumes necessários
# ==============================
echo ""
echo "💾 Verificando volumes..."

for volume in caddy_data caddy_config; do
    if ! docker volume ls --format '{{.Name}}' | grep -q "^${volume}$"; then
        echo "   → Criando volume ${volume}..."
        docker volume create ${volume} || {
            echo "❌ Falha ao criar volume ${volume}!"
            exit 1
        }
        echo "✅ Volume ${volume} criado"
    else
        echo "✅ Volume ${volume} já existe"
    fi
done

# ==============================
# 4️⃣ Deploy para Swarm
# ==============================
echo ""
echo "🚀 Fazendo deploy do Caddy para Docker Swarm..."

docker stack deploy \
    --compose-file docker-stack.caddy.yml \
    caddy || {
        echo "❌ Falha ao fazer deploy!"
        exit 1
    }

echo "✅ Stack deployado com sucesso"

# ==============================
# 5️⃣ Aguardar convergência
# ==============================
echo ""
echo "⏳ Aguardando serviço convergir..."
sleep 5

# Verificar status do serviço
echo ""
echo "📊 Status do serviço:"
docker service ls --filter "label=com.docker.stack.namespace=caddy"

echo ""
echo "🔍 Replicas do Caddy:"
docker service ps caddy_caddy --no-trunc 2>/dev/null | head -5 || echo "   (aguardando inicialização)"

# ==============================
# 6️⃣ Resumo Final
# ==============================
echo ""
echo "======================================"
echo "✅ DEPLOY CADDY CONCLUÍDO!"
echo "======================================"
echo ""
echo "📋 Resumo:"
echo "   • Stack: caddy"
echo "   • Deploy: $(date '+%d/%m/%Y %H:%M:%S')"
echo ""
echo "🔍 Próximos passos:"
echo "   1. Monitorar logs: docker service logs caddy_caddy -f"
echo "   2. Verificar saúde: docker service ls"
echo "   3. Testar endpoint: curl http://localhost:2019/config/"
echo ""
echo "📡 Portas expostas:"
echo "   • HTTP: 80"
echo "   • HTTPS: 443"
echo "   • Admin API: 2019"
echo ""
