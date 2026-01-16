#!/bin/bash
# Deploy rápido com senha hardcoded
set -e

echo "======================================"
echo "🚀 Deploy com Senha Hardcoded"
echo "======================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "docker-stack.yml" ]; then
  echo "❌ Arquivo docker-stack.yml não encontrado"
  echo "   Execute este script do diretório api/"
  exit 1
fi

# TAG padrão
TAG="${TAG:-latest}"
echo "📦 TAG: $TAG"
echo ""

# Substituir {{TAG}} no docker-stack.yml
echo "🔧 Preparando docker-stack.yml..."
sed "s/{{TAG}}/$TAG/g" docker-stack.yml > docker-stack.deploy.yml

echo "✅ docker-stack.deploy.yml gerado"
echo ""

# Deploy
echo "🚀 Fazendo deploy da stack..."
docker stack deploy -c docker-stack.deploy.yml estacaoterapia --with-registry-auth

echo ""
echo "✅ Deploy concluído!"
echo ""

# Aguardar estabilização
echo "⏳ Aguardando 20 segundos para serviços estabilizarem..."
sleep 20

echo ""
echo "📊 Status dos serviços:"
docker service ls --format "table {{.Name}}\t{{.Replicas}}\t{{.Image}}" | grep -E "NAME|estacaoterapia"

echo ""
echo "======================================"
echo "📋 Próximos Passos"
echo "======================================"
echo ""
echo "1. Verificar logs do Socket Server:"
echo "   docker service logs estacaoterapia_socket-server --tail 50 -f"
echo ""
echo "2. Procurar por:"
echo "   ✅ 🔐 Senha Redis definida via environment variable (39 chars)"
echo "   ✅ REDIS_PASSWORD primeiros 5 chars: REdnR..."
echo "   ✅ [IORedis] Status: READY"
echo "   ✅ Redis disponível e ping confirmado!"
echo ""
echo "3. Se ainda houver erro WRONGPASS:"
echo "   docker service update --force estacaoterapia_redis"
echo "   sleep 10"
echo "   docker service update --force estacaoterapia_socket-server"
echo ""
