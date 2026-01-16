#!/bin/bash
set -e

echo "======================================"
echo "🔐 Fix Redis Password Sync"
echo "======================================"

SECRETS_DIR="./secrets"
ESTACAO_API_ENV="$SECRETS_DIR/estacao_api.env.production"
ESTACAO_SOCKET_ENV="$SECRETS_DIR/estacao_socket.env.production"

# =========================
# 1. Verificar arquivos de secrets
# =========================
echo ""
echo "📋 Verificando arquivos de secrets..."

if [ ! -f "$ESTACAO_API_ENV" ]; then
  echo "❌ Arquivo não encontrado: $ESTACAO_API_ENV"
  exit 1
fi

if [ ! -f "$ESTACAO_SOCKET_ENV" ]; then
  echo "❌ Arquivo não encontrado: $ESTACAO_SOCKET_ENV"
  exit 1
fi

echo "✅ Arquivos de secrets encontrados"

# =========================
# 2. Extrair senhas dos arquivos
# =========================
echo ""
echo "🔍 Extraindo senhas dos arquivos..."

REDIS_PASSWORD_API=$(grep "^REDIS_PASSWORD=" "$ESTACAO_API_ENV" | cut -d= -f2- | tr -d '\r\n ')
REDIS_PASSWORD_SOCKET=$(grep "^REDIS_PASSWORD=" "$ESTACAO_SOCKET_ENV" | cut -d= -f2- | tr -d '\r\n ')

if [ -z "$REDIS_PASSWORD_API" ]; then
  echo "❌ REDIS_PASSWORD não encontrado em $ESTACAO_API_ENV"
  exit 1
fi

if [ -z "$REDIS_PASSWORD_SOCKET" ]; then
  echo "❌ REDIS_PASSWORD não encontrado em $ESTACAO_SOCKET_ENV"
  exit 1
fi

echo "✅ Senha API (primeiros 5 chars): ${REDIS_PASSWORD_API:0:5}..."
echo "✅ Senha SOCKET (primeiros 5 chars): ${REDIS_PASSWORD_SOCKET:0:5}..."

# =========================
# 3. Comparar senhas
# =========================
echo ""
echo "🔍 Comparando senhas..."

if [ "$REDIS_PASSWORD_API" != "$REDIS_PASSWORD_SOCKET" ]; then
  echo "❌ SENHAS DIFERENTES!"
  echo ""
  echo "   estacao_api.env:    ${REDIS_PASSWORD_API:0:5}...${REDIS_PASSWORD_API: -5}"
  echo "   estacao_socket.env: ${REDIS_PASSWORD_SOCKET:0:5}...${REDIS_PASSWORD_SOCKET: -5}"
  echo ""
  echo "🔧 Sincronizando senha do estacao_api.env para estacao_socket.env..."
  
  # Backup
  cp "$ESTACAO_SOCKET_ENV" "${ESTACAO_SOCKET_ENV}.backup.$(date +%Y%m%d_%H%M%S)"
  
  # Substituir senha no arquivo socket
  sed -i.bak "s|^REDIS_PASSWORD=.*|REDIS_PASSWORD=$REDIS_PASSWORD_API|" "$ESTACAO_SOCKET_ENV"
  
  echo "✅ Senha sincronizada!"
  
  REDIS_PASSWORD_SOCKET="$REDIS_PASSWORD_API"
else
  echo "✅ Senhas são idênticas nos arquivos locais"
fi

# =========================
# 4. Verificar secret no Docker Swarm
# =========================
echo ""
echo "🐳 Verificando secret redis_password no Docker Swarm..."

if ! docker secret inspect redis_password >/dev/null 2>&1; then
  echo "⚠️  Secret redis_password não existe no Swarm"
  echo "🔧 Criando secret..."
  
  echo -n "$REDIS_PASSWORD_API" | docker secret create redis_password -
  echo "✅ Secret redis_password criado"
else
  echo "ℹ️  Secret redis_password já existe no Swarm"
  echo ""
  echo "🔍 Verificando se a senha do secret bate com os arquivos..."
  
  # Não podemos ler o secret diretamente, mas podemos testar a conexão
  echo "⚠️  Não é possível ler o secret diretamente do Swarm"
  echo "   Para garantir sincronização, vou recriar o secret..."
  
  read -p "🤔 Deseja recriar o secret redis_password? (s/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo "🔧 Removendo secret antigo..."
    docker secret rm redis_password
    
    echo "🔧 Criando novo secret..."
    echo -n "$REDIS_PASSWORD_API" | docker secret create redis_password -
    
    echo "✅ Secret redis_password recriado"
    
    NEED_RESTART=true
  else
    echo "ℹ️  Secret mantido (pode precisar ser atualizado manualmente)"
  fi
fi

# =========================
# 5. Verificar Redis em execução
# =========================
echo ""
echo "🔍 Verificando serviço Redis..."

if docker service ls --format '{{.Name}}' | grep -q "estacaoterapia_redis"; then
  echo "✅ Serviço estacaoterapia_redis encontrado"
  
  if [ "${NEED_RESTART:-false}" = "true" ]; then
    echo ""
    echo "⚠️  O secret foi atualizado. Os serviços precisam ser reiniciados:"
    echo "   1. estacaoterapia_redis"
    echo "   2. estacaoterapia_api"
    echo "   3. estacaoterapia_socket-server"
    echo ""
    read -p "🤔 Deseja reiniciar os serviços agora? (s/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
      echo ""
      echo "🔄 Reiniciando serviços..."
      
      echo "   1/3 Redis..."
      docker service update --force estacaoterapia_redis
      
      echo "   Aguardando Redis ficar healthy..."
      sleep 10
      
      echo "   2/3 API..."
      docker service update --force estacaoterapia_api
      
      echo "   Aguardando API ficar healthy..."
      sleep 10
      
      echo "   3/3 Socket Server..."
      docker service update --force estacaoterapia_socket-server
      
      echo ""
      echo "✅ Serviços reiniciados!"
      echo ""
      echo "📊 Status dos serviços:"
      docker service ls --format "table {{.Name}}\t{{.Replicas}}" | grep estacaoterapia
    else
      echo "ℹ️  Lembre-se de reiniciar os serviços manualmente:"
      echo "   docker service update --force estacaoterapia_redis"
      echo "   docker service update --force estacaoterapia_api"
      echo "   docker service update --force estacaoterapia_socket-server"
    fi
  fi
else
  echo "⚠️  Serviço estacaoterapia_redis não encontrado"
fi

# =========================
# 6. Resumo
# =========================
echo ""
echo "======================================"
echo "✅ Verificação Concluída"
echo "======================================"
echo ""
echo "📋 Próximos passos:"
echo "   1. Verificar logs: docker service logs estacaoterapia_redis --tail 50"
echo "   2. Verificar logs: docker service logs estacaoterapia_socket-server --tail 50"
echo "   3. Testar conexão: docker exec \$(docker ps -q -f name=redis) redis-cli -a 'SENHA' ping"
echo ""
