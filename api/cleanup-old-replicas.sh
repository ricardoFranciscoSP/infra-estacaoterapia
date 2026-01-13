#!/bin/bash
set -e

# ==============================
# 🧹 Cleanup - Remove Replicas Antigas
# ==============================

echo "======================================"
echo "🧹 LIMPANDO REPLICAS ANTIGAS"
echo "======================================"

# ==============================
# 1️⃣ Parar o stack (para remover)
# ==============================
echo ""
echo "🛑 Parando stack estacaoterapia..."
docker stack rm estacaoterapia

echo "⏳ Aguardando remoção dos containers..."
sleep 10

# ==============================
# 2️⃣ Remover imagens antigas
# ==============================
echo ""
echo "🗑️  Removendo imagens antigas..."

# Remove imagens prd-* (todas as antigas)
OLD_API=$(docker images --filter "reference=estacaoterapia-api:prd-*" --format "{{.Repository}}:{{.Tag}}" 2>/dev/null || true)
OLD_SOCKET=$(docker images --filter "reference=estacaoterapia-socket-server:prd-*" --format "{{.Repository}}:{{.Tag}}" 2>/dev/null || true)

if [ -n "$OLD_API" ]; then
    echo "$OLD_API" | while read -r img; do
        if [ -n "$img" ]; then
            echo "   🗑️  Removendo: $img"
            docker rmi "$img" 2>/dev/null || echo "      ⚠️  Falha ao remover"
        fi
    done
fi

if [ -n "$OLD_SOCKET" ]; then
    echo "$OLD_SOCKET" | while read -r img; do
        if [ -n "$img" ]; then
            echo "   🗑️  Removendo: $img"
            docker rmi "$img" 2>/dev/null || echo "      ⚠️  Falha ao remover"
        fi
    done
fi

# ==============================
# 3️⃣ Limpar dangling images
# ==============================
echo ""
echo "🧹 Limpando imagens dangling..."
docker image prune -f --filter "until=1h" 2>/dev/null || true

# ==============================
# 4️⃣ Listar imagens restantes
# ==============================
echo ""
echo "📦 Imagens restantes:"
docker images | grep estacaoterapia || echo "   (nenhuma encontrada)"

# ==============================
# 5️⃣ Listar volumes não utilizados
# ==============================
echo ""
echo "💾 Volumes não utilizados:"
docker volume ls --filter "label!=keep" --format "{{.Name}}" | grep -E "estacao|terapia" || echo "   (nenhum encontrado)"

# ==============================
# 6️⃣ Status final
# ==============================
echo ""
echo "======================================"
echo "✅ LIMPEZA CONCLUÍDA!"
echo "======================================"
echo ""
echo "📋 Próximas ações:"
echo "   1. Fazer deploy novamente: ./deploy.sh"
echo "   2. Ou redeploy do stack: docker stack deploy -c docker-stack.yml estacaoterapia"
echo ""
