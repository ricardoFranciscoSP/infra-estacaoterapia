#!/bin/bash
set -e

echo "======================================"
echo "🔐 Update Socket Secret"
echo "======================================"

SECRETS_DIR="${SECRETS_DIR:-./secrets}"
SOCKET_ENV_FILE="$SECRETS_DIR/estacao_socket.env"

# Verificar se arquivo existe
if [ ! -f "$SOCKET_ENV_FILE" ]; then
  echo "❌ Arquivo não encontrado: $SOCKET_ENV_FILE"
  echo ""
  echo "Crie o arquivo com o conteúdo correto:"
  echo "   $SOCKET_ENV_FILE"
  exit 1
fi

echo "✅ Arquivo encontrado: $SOCKET_ENV_FILE"
echo ""

# Verificar se secret existe
if docker secret inspect estacao_socket_env >/dev/null 2>&1; then
  echo "⚠️  Secret 'estacao_socket_env' já existe"
  echo ""
  read -p "🤔 Deseja recriar o secret? (s/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "ℹ️  Operação cancelada"
    exit 0
  fi
  
  echo "🗑️  Removendo secret antigo..."
  docker secret rm estacao_socket_env
  echo "✅ Secret removido"
fi

# Criar novo secret
echo ""
echo "📝 Criando secret 'estacao_socket_env'..."
docker secret create estacao_socket_env "$SOCKET_ENV_FILE"
echo "✅ Secret criado com sucesso!"

# Verificar criação
echo ""
echo "🔍 Verificando..."
docker secret ls | grep estacao_socket_env

echo ""
echo "======================================"
echo "✅ Secret Atualizado!"
echo "======================================"
echo ""
echo "📋 Próximos passos:"
echo "   1. Reiniciar o socket-server:"
echo "      docker service update --force estacaoterapia_socket-server"
echo ""
echo "   2. Verificar logs:"
echo "      docker service logs estacaoterapia_socket-server --tail 50"
echo ""
