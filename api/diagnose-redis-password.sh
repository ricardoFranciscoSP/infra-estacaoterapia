#!/bin/bash
# Script para diagnosticar e comparar senhas Redis

echo "======================================"
echo "🔐 Redis Password Diagnostic"
echo "======================================"
echo ""

SECRETS_DIR="./secrets"

echo "📁 Verificando arquivos de secrets..."
echo ""

# estacao_api.env.production
if [ -f "$SECRETS_DIR/estacao_api.env.production" ]; then
  API_PASS=$(grep "^REDIS_PASSWORD=" "$SECRETS_DIR/estacao_api.env.production" | cut -d= -f2- | tr -d '\r\n ')
  echo "✅ estacao_api.env.production"
  echo "   REDIS_PASSWORD: ${API_PASS:0:3}...${API_PASS: -3} (${#API_PASS} chars)"
else
  echo "❌ estacao_api.env.production NÃO ENCONTRADO"
  API_PASS=""
fi

echo ""

# estacao_socket.env.production
if [ -f "$SECRETS_DIR/estacao_socket.env.production" ]; then
  SOCKET_PASS=$(grep "^REDIS_PASSWORD=" "$SECRETS_DIR/estacao_socket.env.production" | cut -d= -f2- | tr -d '\r\n ')
  echo "✅ estacao_socket.env.production"
  echo "   REDIS_PASSWORD: ${SOCKET_PASS:0:3}...${SOCKET_PASS: -3} (${#SOCKET_PASS} chars)"
else
  echo "❌ estacao_socket.env.production NÃO ENCONTRADO"
  SOCKET_PASS=""
fi

echo ""
echo "======================================"
echo "🔍 Comparação"
echo "======================================"
echo ""

if [ -n "$API_PASS" ] && [ -n "$SOCKET_PASS" ]; then
  if [ "$API_PASS" = "$SOCKET_PASS" ]; then
    echo "✅ SENHAS SÃO IDÊNTICAS"
  else
    echo "❌ SENHAS SÃO DIFERENTES!"
    echo ""
    echo "   estacao_api.env:    '$API_PASS'"
    echo "   estacao_socket.env: '$SOCKET_PASS'"
    echo ""
    echo "🔧 CORREÇÃO NECESSÁRIA:"
    echo "   Sincronize as senhas nos arquivos e recrie o secret:"
    echo ""
    echo "   # Atualizar estacao_socket.env.production"
    echo "   sed -i 's|^REDIS_PASSWORD=.*|REDIS_PASSWORD=$API_PASS|' $SECRETS_DIR/estacao_socket.env.production"
    echo ""
    echo "   # Recriar secret no Swarm"
    echo "   docker secret rm redis_password"
    echo "   echo -n '\$API_PASS' | docker secret create redis_password -"
    echo ""
    echo "   # Reiniciar serviços"
    echo "   docker service update --force estacaoterapia_redis"
    echo "   docker service update --force estacaoterapia_api"
    echo "   docker service update --force estacaoterapia_socket-server"
  fi
else
  echo "⚠️  Não foi possível comparar (arquivo(s) ausente(s))"
fi

echo ""
