#!/bin/bash
# 🔐 Script para criar/atualizar secrets do PgBouncer
# Uso: ./create-pgbouncer-secrets.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SECRETS_DIR="$SCRIPT_DIR/secrets"

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔐 PgBouncer Secrets Manager${NC}"
echo "=================================="

# Função para gerar hash MD5 PostgreSQL
generate_pg_md5() {
    local password=$1
    local username=$2
    echo -n "md5$(echo -n "${password}${username}" | md5sum | cut -d' ' -f1)"
}

# Verificar se estamos em modo Swarm
if ! docker info 2>/dev/null | grep -q "Swarm: active"; then
    echo -e "${RED}❌ Docker Swarm não está ativo!${NC}"
    echo "Execute: docker swarm init"
    exit 1
fi

echo ""
echo -e "${YELLOW}📋 Configuração do PostgreSQL${NC}"
echo "=================================="

# Pegar credenciais do PostgreSQL
read -p "PostgreSQL User [estacaoterapia]: " PG_USER
PG_USER=${PG_USER:-estacaoterapia}

read -sp "PostgreSQL Password: " PG_PASSWORD
echo ""

if [ -z "$PG_PASSWORD" ]; then
    echo -e "${RED}❌ Password é obrigatório!${NC}"
    exit 1
fi

# Gerar hash MD5
PG_MD5=$(generate_pg_md5 "$PG_PASSWORD" "$PG_USER")
echo -e "${GREEN}✅ Hash MD5 gerado${NC}"

# Admin user (opcional)
echo ""
read -p "Criar usuário admin? [y/N]: " CREATE_ADMIN
if [[ $CREATE_ADMIN =~ ^[Yy]$ ]]; then
    read -sp "Admin Password: " ADMIN_PASSWORD
    echo ""
    ADMIN_MD5=$(generate_pg_md5 "$ADMIN_PASSWORD" "admin")
    echo -e "${GREEN}✅ Hash MD5 admin gerado${NC}"
fi

# Criar userlist.txt
echo ""
echo -e "${YELLOW}📝 Criando userlist.txt${NC}"
USERLIST_FILE=$(mktemp)
echo "\"$PG_USER\" \"$PG_MD5\"" > $USERLIST_FILE

if [[ $CREATE_ADMIN =~ ^[Yy]$ ]]; then
    echo "\"admin\" \"$ADMIN_MD5\"" >> $USERLIST_FILE
fi

cat $USERLIST_FILE
echo ""

# Verificar se pgbouncer.ini existe
if [ ! -f "$SECRETS_DIR/pgbouncer.ini.production" ]; then
    echo -e "${RED}❌ Arquivo pgbouncer.ini.production não encontrado!${NC}"
    echo "Esperado em: $SECRETS_DIR/pgbouncer.ini.production"
    rm -f $USERLIST_FILE
    exit 1
fi

# Remover secrets existentes (se existirem)
echo ""
echo -e "${YELLOW}🗑️  Removendo secrets antigos (se existirem)${NC}"
docker secret rm pgbouncer.ini 2>/dev/null && echo "  ✓ pgbouncer.ini removido" || echo "  - pgbouncer.ini não existia"
docker secret rm userlist.txt 2>/dev/null && echo "  ✓ userlist.txt removido" || echo "  - userlist.txt não existia"

# Criar novos secrets
echo ""
echo -e "${YELLOW}🔐 Criando novos secrets${NC}"

# Secret: pgbouncer.ini
docker secret create pgbouncer.ini "$SECRETS_DIR/pgbouncer.ini.production"
echo -e "${GREEN}✅ Secret 'pgbouncer.ini' criado${NC}"

# Secret: userlist.txt
docker secret create userlist.txt "$USERLIST_FILE"
echo -e "${GREEN}✅ Secret 'userlist.txt' criado${NC}"

# Limpar arquivo temporário
rm -f $USERLIST_FILE

# Listar secrets criados
echo ""
echo -e "${BLUE}📋 Secrets criados:${NC}"
docker secret ls | grep -E "NAME|pgbouncer|userlist"

# Instruções finais
echo ""
echo -e "${GREEN}✅ Secrets do PgBouncer criados com sucesso!${NC}"
echo ""
echo -e "${YELLOW}📌 Próximos passos:${NC}"
echo "1. Build da imagem:"
echo "   cd api"
echo "   docker build -f Dockerfile.pgbouncer -t estacaoterapia-pgbouncer:prd-v1 ."
echo ""
echo "2. Deploy do stack:"
echo "   docker stack deploy -c docker-stack.yml estacaoterapia"
echo ""
echo "3. Verificar logs:"
echo "   docker service logs estacaoterapia_pgbouncer -f"
echo ""
echo "4. Testar conexão:"
echo "   docker exec -it \$(docker ps -q -f name=pgbouncer) psql -h localhost -p 6432 -U $PG_USER -d estacaoterapia"

echo ""
echo -e "${BLUE}🔒 Informações de segurança:${NC}"
echo "- Os secrets estão armazenados de forma criptografada no Swarm"
echo "- Apenas containers autorizados podem acessá-los"
echo "- Hashes MD5 foram gerados no formato PostgreSQL"
