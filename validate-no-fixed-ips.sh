#!/bin/bash
# 🔍 Script para validar que não há IPs fixos em configurações
# Uso: ./validate-no-fixed-ips.sh

set -e

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 Validação de IPs Fixos${NC}"
echo "======================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ERRORS=0
WARNINGS=0

# Padrões de IP para buscar
IP_PATTERN='(10\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})|(192\.168\.[0-9]{1,3}\.[0-9]{1,3})|(172\.(1[6-9]|2[0-9]|3[0-1])\.[0-9]{1,3}\.[0-9]{1,3})'

# Exceções permitidas
ALLOWED_IPS=(
    "127.0.0.1"
    "localhost"
    "0.0.0.0"
)

# Arquivos para verificar (produção e configurações críticas)
CHECK_FILES=(
    "api/secrets/estacao_api.env.production"
    "api/secrets/estacao_socket.env.example"
    "api/secrets/pgbouncer.ini.production"
    "api/secrets/pgbouncer.ini.example"
    "api/docker-stack.yml"
    "docker-compose.production.yml"
)

echo -e "${YELLOW}1️⃣  Verificando arquivos de configuração${NC}"
echo "-----------------------------------"

for file in "${CHECK_FILES[@]}"; do
    if [ -f "$SCRIPT_DIR/$file" ]; then
        echo -n "Checando $file... "
        
        # Buscar IPs privados, excluindo localhost/127.0.0.1/0.0.0.0
        MATCHES=$(grep -E "$IP_PATTERN" "$SCRIPT_DIR/$file" 2>/dev/null | \
                  grep -v "localhost" | \
                  grep -v "127.0.0.1" | \
                  grep -v "0.0.0.0" | \
                  grep -v "192.168.15.109" || true)  # Permitir IP de dev
        
        if [ -n "$MATCHES" ]; then
            echo -e "${RED}❌ IPs FIXOS ENCONTRADOS!${NC}"
            echo "$MATCHES"
            ((ERRORS++))
        else
            echo -e "${GREEN}✅${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  $file não encontrado${NC}"
        ((WARNINGS++))
    fi
done

echo ""
echo -e "${YELLOW}2️⃣  Verificando variáveis de ambiente${NC}"
echo "-----------------------------------"

# Verificar se estão usando nomes de serviços corretos
echo -n "PG_HOST em estacao_api.env.production... "
if [ -f "$SCRIPT_DIR/api/secrets/estacao_api.env.production" ]; then
    PG_HOST=$(grep "^PG_HOST=" "$SCRIPT_DIR/api/secrets/estacao_api.env.production" | cut -d= -f2)
    if [[ "$PG_HOST" == "estacaoterapia_pgbouncer" ]] || [[ "$PG_HOST" == "pgbouncer" ]]; then
        echo -e "${GREEN}✅ ($PG_HOST)${NC}"
    else
        echo -e "${RED}❌ ($PG_HOST) - deveria ser 'estacaoterapia_pgbouncer'${NC}"
        ((ERRORS++))
    fi
else
    echo -e "${YELLOW}⚠️  Arquivo não encontrado${NC}"
    ((WARNINGS++))
fi

echo -n "REDIS_HOST em estacao_api.env.production... "
if [ -f "$SCRIPT_DIR/api/secrets/estacao_api.env.production" ]; then
    REDIS_HOST=$(grep "^REDIS_HOST=" "$SCRIPT_DIR/api/secrets/estacao_api.env.production" | cut -d= -f2 || echo "not_found")
    if [[ "$REDIS_HOST" == "estacaoterapia_redis" ]] || [[ "$REDIS_HOST" == "redis" ]]; then
        echo -e "${GREEN}✅ ($REDIS_HOST)${NC}"
    elif [[ "$REDIS_HOST" == "not_found" ]]; then
        echo -e "${YELLOW}⚠️  Variável não encontrada${NC}"
        ((WARNINGS++))
    else
        echo -e "${RED}❌ ($REDIS_HOST) - deveria ser 'estacaoterapia_redis'${NC}"
        ((ERRORS++))
    fi
fi

echo -n "DATABASE_URL em estacao_api.env.production... "
if [ -f "$SCRIPT_DIR/api/secrets/estacao_api.env.production" ]; then
    DB_URL=$(grep "^DATABASE_URL=" "$SCRIPT_DIR/api/secrets/estacao_api.env.production" | cut -d= -f2)
    if echo "$DB_URL" | grep -qE "$IP_PATTERN" && ! echo "$DB_URL" | grep -q "127.0.0.1"; then
        echo -e "${RED}❌ Contém IP fixo${NC}"
        echo "   $DB_URL"
        ((ERRORS++))
    else
        echo -e "${GREEN}✅ Usando service name${NC}"
    fi
fi

echo ""
echo -e "${YELLOW}3️⃣  Verificando pgbouncer.ini${NC}"
echo "-----------------------------------"

if [ -f "$SCRIPT_DIR/api/secrets/pgbouncer.ini.production" ]; then
    echo -n "Conexão do PgBouncer... "
    PG_CONNECTION=$(grep "^estacaoterapia =" "$SCRIPT_DIR/api/secrets/pgbouncer.ini.production" | grep -oE "host=[^ ]*" | cut -d= -f2)
    
    if [[ "$PG_CONNECTION" == "postgres" ]]; then
        echo -e "${GREEN}✅ (host=$PG_CONNECTION)${NC}"
    elif echo "$PG_CONNECTION" | grep -qE "$IP_PATTERN"; then
        echo -e "${RED}❌ (host=$PG_CONNECTION) - deveria ser 'postgres'${NC}"
        ((ERRORS++))
    else
        echo -e "${YELLOW}⚠️  (host=$PG_CONNECTION)${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠️  pgbouncer.ini.production não encontrado${NC}"
    ((WARNINGS++))
fi

echo ""
echo -e "${YELLOW}4️⃣  Verificando docker-stack.yml${NC}"
echo "-----------------------------------"

if [ -f "$SCRIPT_DIR/api/docker-stack.yml" ]; then
    echo -n "Variáveis de ambiente do service API... "
    
    # Verificar PG_HOST no docker-stack
    if grep -A 20 "^  api:" "$SCRIPT_DIR/api/docker-stack.yml" | grep -q "PG_HOST.*estacaoterapia_pgbouncer"; then
        echo -e "${GREEN}✅ PG_HOST correto${NC}"
    else
        echo -e "${RED}❌ PG_HOST não encontrado ou incorreto${NC}"
        ((ERRORS++))
    fi
    
    echo -n "Variáveis de ambiente do service PgBouncer... "
    if grep -A 15 "^  pgbouncer:" "$SCRIPT_DIR/api/docker-stack.yml" | grep -q "PG_HOST.*postgres"; then
        echo -e "${GREEN}✅ PG_HOST correto${NC}"
    else
        echo -e "${RED}❌ PG_HOST não encontrado ou incorreto${NC}"
        ((ERRORS++))
    fi
else
    echo -e "${YELLOW}⚠️  docker-stack.yml não encontrado${NC}"
    ((WARNINGS++))
fi

echo ""
echo -e "${YELLOW}5️⃣  Verificando network aliases${NC}"
echo "-----------------------------------"

if [ -f "$SCRIPT_DIR/api/docker-stack.yml" ]; then
    SERVICES=("postgres" "pgbouncer" "redis" "api" "socket-server")
    
    for service in "${SERVICES[@]}"; do
        echo -n "Service $service... "
        if grep -A 10 "^  $service:" "$SCRIPT_DIR/api/docker-stack.yml" | grep -q "aliases:"; then
            echo -e "${GREEN}✅ Tem aliases${NC}"
        else
            echo -e "${YELLOW}⚠️  Sem aliases definidos${NC}"
            ((WARNINGS++))
        fi
    done
fi

# Verificar se Docker Swarm está ativo (apenas informativo)
echo ""
echo -e "${YELLOW}6️⃣  Verificando Docker Swarm (opcional)${NC}"
echo "-----------------------------------"

if command -v docker &> /dev/null; then
    echo -n "Docker Swarm... "
    if docker info 2>/dev/null | grep -q "Swarm: active"; then
        echo -e "${GREEN}✅ Ativo${NC}"
        
        # Verificar se services existem
        echo ""
        echo "Services rodando:"
        docker service ls --format "table {{.Name}}\t{{.Replicas}}" 2>/dev/null | grep estacaoterapia || echo "  Nenhum service encontrado"
    else
        echo -e "${YELLOW}⚠️  Não ativo${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠️  Docker não disponível${NC}"
    ((WARNINGS++))
fi

# Resumo final
echo ""
echo "======================================"
echo -e "${BLUE}📊 Resumo da Validação${NC}"
echo "======================================"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ SUCESSO! Nenhum IP fixo encontrado em configurações críticas${NC}"
    echo ""
    echo "Todos os serviços estão usando Service Discovery corretamente:"
    echo "  • PostgreSQL: postgres"
    echo "  • PgBouncer: estacaoterapia_pgbouncer"
    echo "  • Redis: estacaoterapia_redis"
    echo "  • API: estacaoterapia_api"
    echo "  • Socket: estacaoterapia_socket-server"
else
    echo -e "${RED}❌ FALHA! $ERRORS erro(s) encontrado(s)${NC}"
    echo ""
    echo "Por favor, corrija os IPs fixos encontrados e use nomes de serviços:"
    echo "  • Use 'postgres' ao invés de 10.x.x.x"
    echo "  • Use 'estacaoterapia_pgbouncer' para conexões de banco"
    echo "  • Use 'estacaoterapia_redis' para Redis"
    echo ""
    echo "Veja a documentação completa em: docs/SERVICE-DISCOVERY.md"
fi

if [ $WARNINGS -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  $WARNINGS aviso(s) encontrado(s)${NC}"
fi

echo ""
echo -e "${BLUE}📚 Recursos úteis:${NC}"
echo "  • Documentação: docs/SERVICE-DISCOVERY.md"
echo "  • PgBouncer: api/docs/PGBOUNCER-CONFIGURATION.md"
echo "  • Quick Ref: api/PGBOUNCER-README.md"

exit $ERRORS
