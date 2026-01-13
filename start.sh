#!/bin/bash

# ============================================
# ESTAÇÃO TERAPIA - Script de Inicialização
# ============================================

set -e

echo "🚀 Iniciando Estação Terapia com Caddy..."

# Verifica se o Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker não está rodando. Por favor, inicie o Docker primeiro."
    exit 1
fi

# Verifica se o Caddyfile existe
if [ ! -f "Caddyfile" ]; then
    echo "❌ Caddyfile não encontrado!"
    exit 1
fi

# Cria a rede se não existir
echo "📡 Criando rede Docker..."
docker network create estacao-network 2>/dev/null || echo "Rede já existe"

# Cria os volumes se não existirem
echo "💾 Criando volumes..."
docker volume create postgres_data 2>/dev/null || echo "Volume postgres_data já existe"
docker volume create redis_data 2>/dev/null || echo "Volume redis_data já existe"
docker volume create documentos_data 2>/dev/null || echo "Volume documentos_data já existe"
docker volume create caddy_data 2>/dev/null || echo "Volume caddy_data já existe"
docker volume create caddy_config 2>/dev/null || echo "Volume caddy_config já existe"

# Inicia os serviços
echo "🐳 Iniciando serviços Docker Compose..."
docker-compose up -d

# Aguarda os serviços iniciarem
echo "⏳ Aguardando serviços iniciarem..."
sleep 10

# Verifica saúde dos serviços
echo "🏥 Verificando saúde dos serviços..."

# PostgreSQL
if docker-compose exec -T postgres pg_isready -U estacaoterapia > /dev/null 2>&1; then
    echo "✅ PostgreSQL está rodando"
else
    echo "⚠️ PostgreSQL ainda não está pronto"
fi

# Redis
if docker-compose exec -T redis redis-cli --raw incr ping > /dev/null 2>&1; then
    echo "✅ Redis está rodando"
else
    echo "⚠️ Redis ainda não está pronto"
fi

# API
if curl -f http://localhost:3333/health > /dev/null 2>&1; then
    echo "✅ API está rodando"
else
    echo "⚠️ API ainda não está pronta (pode levar alguns minutos)"
fi

# Socket
if curl -f http://localhost:3334/health > /dev/null 2>&1; then
    echo "✅ Socket Server está rodando"
else
    echo "⚠️ Socket Server ainda não está pronto (pode levar alguns minutos)"
fi

# Frontend
if curl -f http://localhost:3001 > /dev/null 2>&1; then
    echo "✅ Frontend está rodando"
else
    echo "⚠️ Frontend ainda não está pronto (pode levar alguns minutos)"
fi

# Caddy
if curl -f http://localhost:2019/config/ > /dev/null 2>&1; then
    echo "✅ Caddy está rodando"
else
    echo "⚠️ Caddy ainda não está pronto"
fi

echo ""
echo "✨ Serviços iniciados!"
echo ""
echo "📋 URLs:"
echo "   Frontend: https://estacaoterapia.com.br"
echo "   API: https://api-prd.estacaoterapia.com.br"
echo "   WebSocket: https://ws.prd.estacaoterapia.com.br"
echo ""
echo "📊 Para ver os logs:"
echo "   docker-compose logs -f"
echo ""
echo "🛑 Para parar os serviços:"
echo "   docker-compose down"
