#!/bin/bash
# Valida configuração do Redis antes do deploy

echo "======================================"
echo "🔍 Validação Redis Configuration"
echo "======================================"
echo ""

REDIS_PASSWORD="REdnRHkZLnQpK1rcoKsseO3pX4GNIRR"
ERRORS=0

# 1. Verificar secrets no Swarm
echo "1️⃣ Verificando secrets no Docker Swarm..."
echo ""

if docker secret inspect redis_password >/dev/null 2>&1; then
  echo "   ✅ Secret 'redis_password' existe"
else
  echo "   ❌ Secret 'redis_password' NÃO EXISTE"
  ERRORS=$((ERRORS + 1))
fi

if docker secret inspect estacao_socket_env >/dev/null 2>&1; then
  echo "   ✅ Secret 'estacao_socket_env' existe"
else
  echo "   ❌ Secret 'estacao_socket_env' NÃO EXISTE"
  ERRORS=$((ERRORS + 1))
fi

if docker secret inspect estacao_api_env >/dev/null 2>&1; then
  echo "   ✅ Secret 'estacao_api_env' existe"
else
  echo "   ❌ Secret 'estacao_api_env' NÃO EXISTE"
  ERRORS=$((ERRORS + 1))
fi

echo ""

# 2. Verificar serviços em execução
echo "2️⃣ Verificando serviços..."
echo ""

if docker service ls --format '{{.Name}}' | grep -q "estacaoterapia_redis"; then
  REDIS_REPLICAS=$(docker service ls --format '{{.Name}} {{.Replicas}}' | grep estacaoterapia_redis | awk '{print $2}')
  echo "   ✅ Redis rodando: $REDIS_REPLICAS"
else
  echo "   ⚠️  Redis NÃO está rodando"
fi

if docker service ls --format '{{.Name}}' | grep -q "estacaoterapia_socket-server"; then
  SOCKET_REPLICAS=$(docker service ls --format '{{.Name}} {{.Replicas}}' | grep estacaoterapia_socket-server | awk '{print $2}')
  echo "   ✅ Socket Server rodando: $SOCKET_REPLICAS"
else
  echo "   ⚠️  Socket Server NÃO está rodando"
fi

if docker service ls --format '{{.Name}}' | grep -q "estacaoterapia_api"; then
  API_REPLICAS=$(docker service ls --format '{{.Name}} {{.Replicas}}' | grep estacaoterapia_api | awk '{print $2}')
  echo "   ✅ API rodando: $API_REPLICAS"
else
  echo "   ⚠️  API NÃO está rodando"
fi

echo ""

# 3. Testar conexão Redis (se estiver rodando)
echo "3️⃣ Testando conexão Redis..."
echo ""

REDIS_CONTAINER=$(docker ps -q -f name=estacaoterapia_redis | head -1)
if [ -n "$REDIS_CONTAINER" ]; then
  echo "   🔍 Container Redis encontrado: $REDIS_CONTAINER"
  
  # Teste de ping
  if docker exec "$REDIS_CONTAINER" redis-cli -a "$REDIS_PASSWORD" ping 2>/dev/null | grep -q "PONG"; then
    echo "   ✅ Redis respondeu PONG (autenticação OK)"
  else
    echo "   ❌ Redis NÃO respondeu ou senha incorreta"
    ERRORS=$((ERRORS + 1))
  fi
  
  # Verificar se a senha está configurada
  if docker exec "$REDIS_CONTAINER" redis-cli ping 2>/dev/null | grep -q "NOAUTH"; then
    echo "   ✅ Redis requer autenticação (requirepass configurado)"
  elif docker exec "$REDIS_CONTAINER" redis-cli ping 2>/dev/null | grep -q "PONG"; then
    echo "   ⚠️  Redis respondeu SEM autenticação (requirepass pode não estar configurado)"
  fi
else
  echo "   ⚠️  Container Redis não encontrado"
fi

echo ""

# 4. Verificar logs recentes
echo "4️⃣ Verificando logs recentes do Socket Server..."
echo ""

if docker service ls --format '{{.Name}}' | grep -q "estacaoterapia_socket-server"; then
  echo "   📋 Últimas 10 linhas:"
  docker service logs estacaoterapia_socket-server --tail 10 --no-trunc 2>/dev/null | tail -10
  echo ""
  
  # Procurar por erros específicos
  if docker service logs estacaoterapia_socket-server --tail 50 2>/dev/null | grep -q "WRONGPASS"; then
    echo "   ❌ ERRO: WRONGPASS detectado nos logs"
    ERRORS=$((ERRORS + 1))
  elif docker service logs estacaoterapia_socket-server --tail 50 2>/dev/null | grep -q "NOAUTH"; then
    echo "   ❌ ERRO: NOAUTH detectado nos logs"
    ERRORS=$((ERRORS + 1))
  elif docker service logs estacaoterapia_socket-server --tail 50 2>/dev/null | grep -q "Status: READY"; then
    echo "   ✅ Redis Status: READY encontrado nos logs"
  else
    echo "   ⚠️  Status de conexão não confirmado nos logs"
  fi
else
  echo "   ⚠️  Socket Server não está rodando"
fi

echo ""

# 5. Resumo
echo "======================================"
if [ $ERRORS -eq 0 ]; then
  echo "✅ VALIDAÇÃO OK - Sistema pronto"
else
  echo "❌ VALIDAÇÃO FALHOU - $ERRORS erro(s) encontrado(s)"
fi
echo "======================================"
echo ""

# Instruções de correção
if [ $ERRORS -gt 0 ]; then
  echo "📋 Para corrigir os problemas:"
  echo ""
  echo "   bash fix-socket-redis-now.sh"
  echo ""
fi

exit $ERRORS
