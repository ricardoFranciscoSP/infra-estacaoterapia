#!/bin/bash

# ============================================
# Script para validar arquivos de secrets
# ============================================

set -e

SECRETS_DIR="./secrets"
ERRORS=0

echo "🔍 Validando arquivos de secrets..."
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para validar arquivo .env
validate_env_file() {
    local file=$1
    local name=$2
    local required_vars=("${@:3}")
    
    echo "📄 Validando $name..."
    
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ Arquivo não encontrado: $file${NC}"
        echo -e "   Copie o exemplo: cp ${file}.example $file"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
    
    # Verificar variáveis obrigatórias
    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" "$file"; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        echo -e "${RED}❌ Variáveis obrigatórias não encontradas:${NC}"
        for var in "${missing_vars[@]}"; do
            echo "   - $var"
        done
        ERRORS=$((ERRORS + 1))
        return 1
    fi
    
    # Verificar valores placeholder
    local placeholder_count=0
    while IFS= read -r line; do
        case "$line" in
            ""|\#*) continue ;;
        esac
        
        value="${line#*=}"
        
        # Verificar se ainda tem valores de exemplo
        if [[ "$value" =~ (your-|example-|changeme|password|secret123) ]]; then
            if [ $placeholder_count -eq 0 ]; then
                echo -e "${YELLOW}⚠️  Possíveis valores placeholder detectados:${NC}"
            fi
            echo "   - $line"
            placeholder_count=$((placeholder_count + 1))
        fi
    done < "$file"
    
    if [ $placeholder_count -gt 0 ]; then
        echo -e "${YELLOW}   Revise esses valores antes de usar em produção!${NC}"
    fi
    
    # Verificar senhas fracas
    local weak_password_count=0
    for var in POSTGRES_PASSWORD REDIS_PASSWORD JWT_SECRET; do
        if grep -q "^${var}=" "$file"; then
            value=$(grep "^${var}=" "$file" | cut -d= -f2-)
            length=${#value}
            
            if [ $length -lt 16 ]; then
                if [ $weak_password_count -eq 0 ]; then
                    echo -e "${YELLOW}⚠️  Senhas fracas detectadas (< 16 caracteres):${NC}"
                fi
                echo "   - $var: $length caracteres"
                weak_password_count=$((weak_password_count + 1))
            fi
        fi
    done
    
    echo -e "${GREEN}✅ Arquivo validado${NC}"
    echo ""
    return 0
}

# Validar postgres.env
validate_env_file \
    "$SECRETS_DIR/postgres.env" \
    "postgres.env" \
    "POSTGRES_USER" "POSTGRES_PASSWORD" "POSTGRES_DB"

# Validar estacao_api.env
validate_env_file \
    "$SECRETS_DIR/estacao_api.env" \
    "estacao_api.env" \
    "POSTGRES_USER" "POSTGRES_PASSWORD" "POSTGRES_DB" \
    "REDIS_PASSWORD" "REDIS_URL" "JWT_SECRET"

# Validar estacao_socket.env
validate_env_file \
    "$SECRETS_DIR/estacao_socket.env" \
    "estacao_socket.env" \
    "POSTGRES_USER" "POSTGRES_PASSWORD" "POSTGRES_DB" \
    "REDIS_PASSWORD" "REDIS_URL" "JWT_SECRET"

# Validar pgbouncer.ini (opcional)
if [ -f "$SECRETS_DIR/pgbouncer.ini" ]; then
    echo "📄 Validando pgbouncer.ini..."
    
    if ! grep -q "^\[databases\]" "$SECRETS_DIR/pgbouncer.ini"; then
        echo -e "${RED}❌ Seção [databases] não encontrada${NC}"
        ERRORS=$((ERRORS + 1))
    elif ! grep -q "^\[pgbouncer\]" "$SECRETS_DIR/pgbouncer.ini"; then
        echo -e "${RED}❌ Seção [pgbouncer] não encontrada${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✅ Arquivo validado${NC}"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠️  pgbouncer.ini não encontrado (opcional)${NC}"
    echo ""
fi

# Validar userlist.txt (opcional)
if [ -f "$SECRETS_DIR/userlist.txt" ]; then
    echo "📄 Validando userlist.txt..."
    
    if ! grep -q "md5" "$SECRETS_DIR/userlist.txt"; then
        echo -e "${YELLOW}⚠️  Nenhuma senha com hash MD5 encontrada${NC}"
        echo "   Use: echo -n 'passwordusername' | md5sum | awk '{print \"md5\"\$1}'"
    else
        echo -e "${GREEN}✅ Arquivo validado${NC}"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠️  userlist.txt não encontrado (opcional)${NC}"
    echo ""
fi

# Verificar consistência entre arquivos
echo "🔗 Verificando consistência..."

# Extrair valores
pg_user_from_postgres=$(grep "^POSTGRES_USER=" "$SECRETS_DIR/postgres.env" 2>/dev/null | cut -d= -f2-)
pg_pass_from_postgres=$(grep "^POSTGRES_PASSWORD=" "$SECRETS_DIR/postgres.env" 2>/dev/null | cut -d= -f2-)
pg_user_from_api=$(grep "^POSTGRES_USER=" "$SECRETS_DIR/estacao_api.env" 2>/dev/null | cut -d= -f2-)
pg_pass_from_api=$(grep "^POSTGRES_PASSWORD=" "$SECRETS_DIR/estacao_api.env" 2>/dev/null | cut -d= -f2-)
redis_pass_from_api=$(grep "^REDIS_PASSWORD=" "$SECRETS_DIR/estacao_api.env" 2>/dev/null | cut -d= -f2-)
redis_pass_from_socket=$(grep "^REDIS_PASSWORD=" "$SECRETS_DIR/estacao_socket.env" 2>/dev/null | cut -d= -f2-)
jwt_from_api=$(grep "^JWT_SECRET=" "$SECRETS_DIR/estacao_api.env" 2>/dev/null | cut -d= -f2-)
jwt_from_socket=$(grep "^JWT_SECRET=" "$SECRETS_DIR/estacao_socket.env" 2>/dev/null | cut -d= -f2-)

# Verificar PostgreSQL
if [ "$pg_user_from_postgres" != "$pg_user_from_api" ]; then
    echo -e "${RED}❌ POSTGRES_USER diferente entre postgres.env e estacao_api.env${NC}"
    ERRORS=$((ERRORS + 1))
fi

if [ "$pg_pass_from_postgres" != "$pg_pass_from_api" ]; then
    echo -e "${RED}❌ POSTGRES_PASSWORD diferente entre postgres.env e estacao_api.env${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Verificar Redis
if [ "$redis_pass_from_api" != "$redis_pass_from_socket" ]; then
    echo -e "${RED}❌ REDIS_PASSWORD diferente entre estacao_api.env e estacao_socket.env${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Verificar JWT
if [ "$jwt_from_api" != "$jwt_from_socket" ]; then
    echo -e "${RED}❌ JWT_SECRET diferente entre estacao_api.env e estacao_socket.env${NC}"
    echo "   O JWT_SECRET DEVE ser o mesmo para API e Socket!"
    ERRORS=$((ERRORS + 1))
fi

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ Todos os arquivos estão consistentes${NC}"
fi

echo ""

# Resultado final
if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}❌ Validação falhou com $ERRORS erro(s)${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Corrija os erros antes de criar os secrets."
    exit 1
else
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ Validação concluída com sucesso!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Os arquivos estão prontos para criar os secrets."
    echo "Execute: ./create-secrets.sh"
    exit 0
fi
