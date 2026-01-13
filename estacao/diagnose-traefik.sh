#!/bin/bash
# Script de diagnóstico Traefik + Easypanel
# Verifica estado do roteamento e certificados

echo "======================================"
echo "DIAGNÓSTICO TRAEFIK - ESTAÇÃO TERAPIA"
echo "======================================"
echo ""

# 1. Verificar se o serviço está rodando
echo "1. Verificando serviço estacao_next_prd..."
docker service ps estacao_estacao_next_prd --no-trunc 2>/dev/null || echo "   ⚠️  Serviço não encontrado no Swarm"
echo ""

# 2. Verificar labels aplicadas
echo "2. Verificando labels Traefik aplicadas..."
docker service inspect estacao_estacao_next_prd --format='{{range $key, $value := .Spec.TaskTemplate.ContainerSpec.Labels}}{{$key}}: {{$value}}{{"\n"}}{{end}}' 2>/dev/null | grep traefik || echo "   ⚠️  Nenhuma label Traefik encontrada"
echo ""

# 3. Verificar networks
echo "3. Verificando networks..."
docker network ls | grep -E "easypanel-estacao_terapia|estacao-frontend-network" || echo "   ⚠️  Networks não encontradas"
echo ""

# 4. Verificar Traefik
echo "4. Verificando serviço Traefik..."
docker ps | grep traefik || docker service ls | grep traefik || echo "   ⚠️  Traefik não encontrado"
echo ""

# 5. Logs recentes do Traefik
echo "5. Logs recentes do Traefik (procurando 'estacao')..."
docker service logs traefik_traefik --tail=50 2>/dev/null | grep -i estacao || \
docker logs $(docker ps -q -f name=traefik) --tail=50 2>/dev/null | grep -i estacao || \
echo "   ⚠️  Sem logs relacionados a 'estacao'"
echo ""

# 6. Testar conectividade interna
echo "6. Testando conectividade HTTP interna (porta 3001)..."
CONTAINER_ID=$(docker ps -q -f name=estacao_next_prd | head -n1)
if [ -n "$CONTAINER_ID" ]; then
  docker exec $CONTAINER_ID wget -qO- http://localhost:3001/api/health 2>/dev/null || echo "   ⚠️  Healthcheck falhou"
else
  echo "   ⚠️  Container não encontrado"
fi
echo ""

# 7. Verificar DNS
echo "7. Verificando DNS dos domínios..."
for domain in estacaoterapia.com.br www.estacaoterapia.com.br; do
  echo -n "   $domain -> "
  dig +short $domain A 2>/dev/null | head -n1 || nslookup $domain 2>/dev/null | grep Address | tail -n1 | awk '{print $2}' || echo "⚠️  Não resolvido"
done
echo ""

# 8. Testar roteamento externo
echo "8. Testando roteamento externo..."
echo -n "   HTTP -> "
curl -s -o /dev/null -w "%{http_code} (Location: %{redirect_url})" http://estacaoterapia.com.br 2>/dev/null || echo "⚠️  Falhou"
echo ""
echo -n "   HTTPS -> "
curl -s -o /dev/null -w "%{http_code}" https://estacaoterapia.com.br/api/health 2>/dev/null || echo "⚠️  Falhou"
echo ""
echo -n "   WWW HTTPS -> "
curl -s -o /dev/null -w "%{http_code} (Location: %{redirect_url})" https://www.estacaoterapia.com.br 2>/dev/null || echo "⚠️  Falhou"
echo ""

echo "======================================"
echo "FIM DO DIAGNÓSTICO"
echo "======================================"
