#!/bin/bash
set -e

echo "======================================"
echo "🌐 DEPLOY CADDY - $(date)"
echo "======================================"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLEANUP_SCRIPT="$SCRIPT_DIR/cleanup-deploy.sh"

# ==============================
# 1️⃣ Validar pré-requisitos
# ==============================
echo ""
echo "🔍 Validando pré-requisitos..."

command -v docker >/dev/null || {
  echo "❌ Docker não encontrado!"
  exit 1
}

docker info | grep -q "Swarm: active" || {
  echo "❌ Docker Swarm não está ativo!"
  exit 1
}

[ -f docker-stack.caddy.yml ] || {
  echo "❌ docker-stack.caddy.yml não encontrado!"
  exit 1
}

[ -f Caddyfile ] || {
  echo "❌ Caddyfile não encontrado!"
  exit 1
}

echo "✅ Pré-requisitos validados"

# ==============================
# 2️⃣ Validar Caddyfile
# ==============================
echo ""
echo "🧪 Validando Caddyfile..."

docker run --rm \
  -v "$PWD/Caddyfile:/etc/caddy/Caddyfile" \
  caddy:2-alpine \
  caddy validate --config /etc/caddy/Caddyfile

echo "✅ Caddyfile válido"

# ==============================
# 3️⃣ Criar/Verificar rede necessária
# ==============================
echo ""
echo "🌐 Verificando rede Docker..."

if ! docker network ls --format '{{.Name}}' | grep -q "^estacao-network$"; then
  echo "   → Criando rede estacao-network..."
  docker network create --driver overlay estacao-network
  echo "✅ Rede estacao-network criada"
else
  echo "✅ Rede estacao-network já existe"
fi

# ==============================
# 4️⃣ Criar/Verificar volumes
# ==============================
echo ""
echo "💾 Verificando volumes..."

for volume in caddy_data caddy_config; do
  if ! docker volume ls --format '{{.Name}}' | grep -q "^${volume}$"; then
    docker volume create "$volume"
    echo "✅ Volume ${volume} criado"
  else
    echo "✅ Volume ${volume} já existe"
  fi
done

# ==============================
# 5️⃣ Remover stack Caddy antigo (se existir)
# ==============================
echo ""
if docker stack ls --format '{{.Name}}' | grep -q "^caddy$"; then
  echo "🧹 Removendo stack Caddy antigo..."
  docker stack rm caddy
  echo "⏳ Aguardando remoção completa..."
  sleep 10
  echo "✅ Stack antigo removido"
else
  echo "ℹ️ Nenhum stack Caddy anterior encontrado"
fi

# ==============================
# 6️⃣ Deploy
# ==============================
echo ""
echo "🚀 Fazendo deploy do Caddy..."

docker stack deploy -c docker-stack.caddy.yml caddy

echo "✅ Stack deployado com sucesso"

# ==============================
# 7️⃣ Status
# ==============================
sleep 5

echo ""
echo "📊 Status do serviço:"
docker service ls --filter label=com.docker.stack.namespace=caddy

echo ""
echo "🔍 Replicas:"
docker service ps caddy_caddy --no-trunc | head -5

# ==============================
# 8️⃣ Resumo
# ==============================
echo ""
echo "======================================"
echo "✅ DEPLOY CADDY CONCLUÍDO"
echo "======================================"
echo ""
echo "Próximos passos:"
echo " - docker service logs caddy_caddy -f"
echo " - Testar HTTPS nos domínios"
echo ""

# ==============================
# 9️⃣ Limpeza Pós-Deploy
# ==============================
if [ -f "$CLEANUP_SCRIPT" ]; then
  chmod +x "$CLEANUP_SCRIPT" 2>/dev/null || true
  "$CLEANUP_SCRIPT" || echo "⚠️  Falha na limpeza pós-deploy"
else
  echo "⚠️  Script de limpeza não encontrado: $CLEANUP_SCRIPT"
fi
