#!/bin/bash
set -e

# ==============================
# 🚀 Deploy Docker Swarm Stack
# ==============================
# Zero-downtime deployment com:
# - Build automático de novas imagens
# - Update rolling (sem parar serviços)
# - Cleanup de imagens antigas
# - Backup da config

echo "======================================"
echo "🚀 INICIANDO DEPLOY - $(date)"
echo "======================================"

# ==============================
# 1️⃣ Gerar tag com timestamp + git hash
# ==============================
TIMESTAMP=$(date +%Y%m%d%H%M%S)
GIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
TAG="${TIMESTAMP}-${GIT_HASH}"

echo ""
echo "📦 Informações do Deploy:"
echo "   • Tag: prd-$TAG"
echo "   • Data: $(date '+%d/%m/%Y %H:%M:%S')"
echo "   • Git: $GIT_HASH"

# ==============================
# 2️⃣ Validar pré-requisitos
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

if [ ! -f "docker-stack.yml" ]; then
    echo "❌ docker-stack.yml não encontrado!"
    exit 1
fi

echo "✅ Pré-requisitos validados"

# ==============================
# 3️⃣ Backup da config atual
# ==============================
echo ""
echo "💾 Fazendo backup da config..."
BACKUP_FILE="docker-stack.yml.backup-${TIMESTAMP}"
cp docker-stack.yml "$BACKUP_FILE"
echo "✅ Backup salvo em: $BACKUP_FILE"

# ==============================
# 4️⃣ Build das imagens NOVAS
# ==============================
echo ""
echo "🔨 Construindo imagens Docker..."
echo "   → estacaoterapia-api:prd-$TAG"
docker build \
    --build-arg NODE_ENV=production \
    -t "estacaoterapia-api:prd-${TAG}" \
    -f ./Dockerfile.api \
    . || {
        echo "❌ Falha ao construir imagem API!"
        exit 1
    }
echo "✅ API compilada com sucesso"

echo ""
echo "   → estacaoterapia-socket-server:prd-$TAG"
docker build \
    --build-arg NODE_ENV=production \
    -t "estacaoterapia-socket-server:prd-${TAG}" \
    -f ./Dockerfile.socket \
    . || {
        echo "❌ Falha ao construir imagem Socket!"
        exit 1
    }
echo "✅ Socket compilada com sucesso"

# ==============================
# 5️⃣ Atualizar docker-stack.yml
# ==============================
echo ""
echo "📝 Atualizando docker-stack.yml..."
DEPLOY_STACK_FILE="docker-stack.yml.deploy"
cp docker-stack.yml "$DEPLOY_STACK_FILE"
sed -i "s/{{TAG}}/${TAG}/g" "$DEPLOY_STACK_FILE"

echo "✅ Stack configurado com nova tag: $TAG"

# ==============================
# 6️⃣ Deploy para Swarm (zero-downtime)
# ==============================
echo ""
echo "🚀 Fazendo deploy para Docker Swarm..."
echo "   ⏳ Aguardando rolling update..."

docker stack deploy \
    --compose-file "$DEPLOY_STACK_FILE" \
    --with-registry-auth \
    estacaoterapia || {
        echo "❌ Falha ao fazer deploy!"
        echo "Revertendo para backup: $BACKUP_FILE"
        cp "$BACKUP_FILE" docker-stack.yml
        exit 1
    }

echo "✅ Stack deployado com sucesso"

# ==============================
# 7️⃣ Aguardar convergência
# ==============================
echo ""
echo "⏳ Aguardando serviços convergirem..."
sleep 5

# Verificar status dos serviços
echo ""
echo "📊 Status dos serviços:"
docker service ls --filter "label=com.docker.stack.namespace=estacaoterapia"

echo ""
echo "🔍 Replicas da API:"
docker service ps estacaoterapia_api --no-trunc 2>/dev/null | head -5 || echo "   (aguardando inicialização)"

echo ""
echo "🔍 Replicas do Socket:"
docker service ps estacaoterapia_socket-server --no-trunc 2>/dev/null | head -5 || echo "   (aguardando inicialização)"

# ==============================
# 8️⃣ Limpeza de imagens antigas
# ==============================
echo ""
echo "🧹 Limpando imagens antigas..."

# Encontrar imagens do estacaoterapia que NÃO são a atual
OLD_API_IMAGES=$(docker images --filter "reference=estacaoterapia-api:prd-*" --format "{{.Repository}}:{{.Tag}}" | grep -v "prd-${TAG}$" || true)
OLD_SOCKET_IMAGES=$(docker images --filter "reference=estacaoterapia-socket-server:prd-*" --format "{{.Repository}}:{{.Tag}}" | grep -v "prd-${TAG}$" || true)

REMOVED_COUNT=0

# Remover imagens antigas da API
if [ -n "$OLD_API_IMAGES" ]; then
    echo "$OLD_API_IMAGES" | while read -r old_image; do
        if [ -n "$old_image" ]; then
            echo "   🗑️  Removendo: $old_image"
            docker rmi "$old_image" 2>/dev/null || echo "      ⚠️  Não foi possível remover (em uso)"
        fi
    done
fi

# Remover imagens antigas do Socket
if [ -n "$OLD_SOCKET_IMAGES" ]; then
    echo "$OLD_SOCKET_IMAGES" | while read -r old_image; do
        if [ -n "$old_image" ]; then
            echo "   🗑️  Removendo: $old_image"
            docker rmi "$old_image" 2>/dev/null || echo "      ⚠️  Não foi possível remover (em uso)"
        fi
    done
fi

# Limpar dangling images
echo ""
echo "🧹 Removendo imagens dangling..."
DANGLING_REMOVED=$(docker image prune -f --filter "until=1h" 2>/dev/null | grep -o "deleted" | wc -l)
if [ "$DANGLING_REMOVED" -gt 0 ]; then
    echo "   ✅ $DANGLING_REMOVED imagens removidas"
fi

# ==============================
# 9️⃣ Limpeza de arquivos temporários
# ==============================
echo ""
echo "📂 Limpando arquivos temporários..."
rm -f "$DEPLOY_STACK_FILE"
echo "   ✅ Arquivos temporários removidos"

# ==============================
# 🔟 Resumo Final
# ==============================
echo ""
echo "======================================"
echo "✅ DEPLOY CONCLUÍDO COM SUCESSO!"
echo "======================================"
echo ""
echo "📋 Resumo:"
echo "   • Tag: prd-$TAG"
echo "   • Stack: estacaoterapia"
echo "   • Deploy: $(date '+%d/%m/%Y %H:%M:%S')"
echo "   • Modo: Zero-Downtime (Rolling Update)"
echo ""
echo "🔍 Próximos passos:"
echo "   1. Monitorar logs: docker service logs estacaoterapia_api -f"
echo "   2. Verificar saúde: docker service ls"
echo "   3. Testar endpoint: curl http://localhost:3333/health"
echo ""
echo "⏮️  Se precisar reverter:"
echo "   cp $BACKUP_FILE docker-stack.yml"
echo "   docker stack deploy -c docker-stack.yml estacaoterapia"
echo ""
