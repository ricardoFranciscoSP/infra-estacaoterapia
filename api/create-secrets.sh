#!/bin/bash

# ============================================
# Script para criar secrets no Docker Swarm
# ============================================

set -e

SECRETS_DIR="./secrets"

echo "🔐 Criando secrets no Docker Swarm..."
echo ""

# Verificar se os arquivos existem
if [ ! -f "$SECRETS_DIR/postgres.env" ]; then
    echo "❌ Arquivo $SECRETS_DIR/postgres.env não encontrado"
    echo "   Copie o exemplo: cp $SECRETS_DIR/postgres.env.example $SECRETS_DIR/postgres.env"
    exit 1
fi

if [ ! -f "$SECRETS_DIR/estacao_api.env" ]; then
    echo "❌ Arquivo $SECRETS_DIR/estacao_api.env não encontrado"
    echo "   Copie o exemplo: cp $SECRETS_DIR/estacao_api.env.example $SECRETS_DIR/estacao_api.env"
    exit 1
fi

if [ ! -f "$SECRETS_DIR/estacao_socket.env" ]; then
    echo "❌ Arquivo $SECRETS_DIR/estacao_socket.env não encontrado"
    echo "   Copie o exemplo: cp $SECRETS_DIR/estacao_socket.env.example $SECRETS_DIR/estacao_socket.env"
    exit 1
fi

# Função para criar ou atualizar secret
create_or_update_secret() {
    local secret_name=$1
    local secret_file=$2
    
    if docker secret inspect "$secret_name" >/dev/null 2>&1; then
        echo "⚠️  Secret '$secret_name' já existe"
        read -p "   Deseja remover e recriar? (s/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Ss]$ ]]; then
            echo "   Removendo secret existente..."
            docker secret rm "$secret_name"
            echo "   Criando novo secret..."
            docker secret create "$secret_name" "$secret_file"
            echo "✅ Secret '$secret_name' recriado"
        else
            echo "⏭️  Pulando '$secret_name'"
        fi
    else
        echo "📝 Criando secret '$secret_name'..."
        docker secret create "$secret_name" "$secret_file"
        echo "✅ Secret '$secret_name' criado"
    fi
    echo ""
}

# Criar secrets
create_or_update_secret "postgres_env" "$SECRETS_DIR/postgres.env"
create_or_update_secret "estacao_api_env" "$SECRETS_DIR/estacao_api.env"
create_or_update_secret "estacao_socket_env" "$SECRETS_DIR/estacao_socket.env"

# PgBouncer (se existirem)
if [ -f "$SECRETS_DIR/pgbouncer.ini" ]; then
    create_or_update_secret "pgbouncer.ini" "$SECRETS_DIR/pgbouncer.ini"
fi

if [ -f "$SECRETS_DIR/userlist.txt" ]; then
    create_or_update_secret "userlist.txt" "$SECRETS_DIR/userlist.txt"
fi

echo ""
echo "🎉 Processo concluído!"
echo ""
echo "📋 Secrets disponíveis:"
docker secret ls

echo ""
echo "💡 Para fazer deploy da stack:"
echo "   ./deploy.sh"
