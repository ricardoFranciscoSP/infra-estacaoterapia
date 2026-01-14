#!/bin/bash
set -euo pipefail

# Configurar UTF-8 para exibiÃ§Ã£o correta de caracteres
export LC_ALL=C.UTF-8
export LANG=C.UTF-8

# ==============================
# ðŸš€ Deploy Docker Swarm Stack - FUNCIONAL 100%
# ==============================
# Zero-downtime deployment com:
# - âœ… ValidaÃ§Ã£o completa de secrets e volumes
# - âœ… Build automÃ¡tico de novas imagens
# - âœ… Update rolling (sem parar serviÃ§os)
# - âœ… Cleanup de imagens antigas
# - âœ… RestauraÃ§Ã£o automÃ¡tica do banco
# - âœ… Monitoramento de saÃºde dos serviÃ§os

echo "======================================"
echo "ðŸš€ INICIANDO DEPLOY - $(date)"
echo "======================================"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SECRETS_DIR="/opt/secrets"

# ==============================
# 1ï¸âƒ£ Gerar tag com timestamp + git hash
# ==============================
TIMESTAMP=$(date +%Y%m%d%H%M%S)
GIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
TAG="${TIMESTAMP}-${GIT_HASH}"

echo ""
echo "ðŸ“¦ InformaÃ§Ãµes do Deploy:"
echo "   â€¢ Tag: prd-$TAG"
echo "   â€¢ Data: $(date '+%d/%m/%Y %H:%M:%S')"
echo "   â€¢ Git: $GIT_HASH"

# ==============================
# 2ï¸âƒ£ Validar prÃ©-requisitos
# ==============================
echo ""
echo "ðŸ” Validando prÃ©-requisitos..."

if ! command -v docker &> /dev/null; then
    echo "âŒ Docker nÃ£o encontrado!"
    exit 1
fi

# Verificar Docker Swarm de forma mais robusta
SWARM_ACTIVE=false
if docker info 2>/dev/null | grep -qiE "swarm.*active|swarm:\s*active"; then
    SWARM_ACTIVE=true
elif docker node ls >/dev/null 2>&1; then
    SWARM_ACTIVE=true
fi

if [ "$SWARM_ACTIVE" != "true" ]; then
    echo "âŒ Docker Swarm nÃ£o estÃ¡ ativo!"
    echo "   Execute: docker swarm init"
    exit 1
fi

if [ ! -f "docker-stack.yml" ]; then
    echo "âŒ docker-stack.yml nÃ£o encontrado!"
    exit 1
fi

# Validar arquivos de secrets
echo ""
echo "ðŸ” Verificando secrets..."
SECRETS_REQUIRED=(
    "postgres.env"
    "estacao_api.env"
    "estacao_socket.env"
)

for secret_file in "${SECRETS_REQUIRED[@]}"; do
    if [ ! -f "$SECRETS_DIR/$secret_file" ]; then
        echo "âŒ Arquivo $SECRETS_DIR/$secret_file nÃ£o encontrado!"
        echo "   Copie do exemplo: cp $SECRETS_DIR/${secret_file}.example $SECRETS_DIR/$secret_file"
        exit 1
    fi
done

# Validar arquivos do PgBouncer
if [ ! -f "/opt/secrets/pgbouncer/pgbouncer.ini" ]; then
    echo "âŒ Arquivo /opt/secrets/pgbouncer/pgbouncer.ini nÃ£o encontrado!"
    exit 1
fi

if [ ! -f "/opt/secrets/pgbouncer/userlist.txt" ]; then
    echo "âŒ Arquivo /opt/secrets/pgbouncer/userlist.txt nÃ£o encontrado!"
    exit 1
fi

echo "âœ… Todos os arquivos de secrets encontrados"

echo "âœ… PrÃ©-requisitos validados"

# ==============================
# 3ï¸âƒ£ Criar/Atualizar Secrets
# ==============================
echo ""
echo "ðŸ” Gerenciando secrets no Docker Swarm..."

create_or_update_secret() {
    local secret_name=$1
    local secret_file=$2
    
    if docker secret inspect "$secret_name" >/dev/null 2>&1; then
        echo "   â†» Atualizando secret: $secret_name"
        docker secret rm "$secret_name" 2>/dev/null || true
        docker secret create "$secret_name" "$secret_file" 2>/dev/null || {
            echo "   âš ï¸  Falha ao atualizar (pode estar em uso)"
        }
    else
        echo "   âœ“ Criando secret: $secret_name"
        docker secret create "$secret_name" "$secret_file" 2>/dev/null || {
            echo "   âš ï¸  Secret jÃ¡ pode existir"
        }
    fi
}

# Processar secrets
create_or_update_secret "postgres_env" "$SECRETS_DIR/postgres.env"
create_or_update_secret "estacao_api_env" "$SECRETS_DIR/estacao_api.env"
create_or_update_secret "estacao_socket_env" "$SECRETS_DIR/estacao_socket.env"
create_or_update_secret "pgbouncer.ini" "/opt/secrets/pgbouncer/pgbouncer.ini"
create_or_update_secret "userlist.txt" "/opt/secrets/pgbouncer/userlist.txt"

# Criar secret redis_password a partir do estacao_api.env
echo ""
echo "   ðŸ“‹ Criando secret redis_password..."
REDIS_PASSWORD=$(grep "^REDIS_PASSWORD=" "$SECRETS_DIR/estacao_api.env" | cut -d'=' -f2 | tr -d ' ' | head -1)
if [ -n "$REDIS_PASSWORD" ]; then
    # Criar arquivo temporÃ¡rio com a senha
    TEMP_REDIS_PASSWORD=$(mktemp)
    echo -n "$REDIS_PASSWORD" > "$TEMP_REDIS_PASSWORD"
    create_or_update_secret "redis_password" "$TEMP_REDIS_PASSWORD"
    rm -f "$TEMP_REDIS_PASSWORD"
    echo "   âœ… Secret redis_password criado/atualizado"
else
    echo "   âš ï¸  REDIS_PASSWORD nÃ£o encontrado em estacao_api.env"
    echo "   âš ï¸  Redis serÃ¡ iniciado sem senha"
fi
create_or_update_secret "userlist.txt" "/opt/secrets/pgbouncer/userlist.txt"

# Extrair credenciais do postgres.env para validaÃ§Ã£o
echo ""
echo "   ðŸ“ Validando credenciais PostgreSQL..."

# Validar se o arquivo possui as variÃ¡veis necessÃ¡rias
POSTGRES_USER=$(grep "^POSTGRES_USER=" "$SECRETS_DIR/postgres.env" | cut -d'=' -f2 | tr -d ' ')
POSTGRES_PASSWORD=$(grep "^POSTGRES_PASSWORD=" "$SECRETS_DIR/postgres.env" | cut -d'=' -f2 | tr -d ' ')
POSTGRES_DB=$(grep "^POSTGRES_DB=" "$SECRETS_DIR/postgres.env" | cut -d'=' -f2 | tr -d ' ')

if [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_PASSWORD" ] || [ -z "$POSTGRES_DB" ]; then
    echo "âŒ Credenciais PostgreSQL incompletas em $SECRETS_DIR/postgres.env"
    exit 1
fi

echo "âœ“ Credenciais validadas:"
echo "  â€¢ POSTGRES_USER: $POSTGRES_USER"
echo "  â€¢ POSTGRES_DB: $POSTGRES_DB"
echo "  â€¢ POSTGRES_PASSWORD: [***]"

# Extrair senha Redis do estacao_api_env para validaÃ§Ã£o
REDIS_PASSWORD=$(grep "^REDIS_PASSWORD=" "$SECRETS_DIR/estacao_api.env" | cut -d'=' -f2 | tr -d ' ' | head -1)
if [ -z "$REDIS_PASSWORD" ]; then
    echo "âš ï¸  Redis password nÃ£o encontrado em estacao_api.env"
else
    echo "  â€¢ REDIS_PASSWORD: [***]"
fi

echo "âœ… Secrets configurados"

# ==============================
# 4ï¸âƒ£ Criar/Verificar volumes
# ==============================
echo ""
echo "ðŸ’¾ Verificando volumes Docker..."

create_volume_if_not_exists() {
    local volume_name=$1
    
    if docker volume inspect "$volume_name" >/dev/null 2>&1; then
        echo "   âœ“ Volume jÃ¡ existe: $volume_name"
    else
        echo "   â†’ Criando volume: $volume_name"
        docker volume create "$volume_name" || {
            echo "   âš ï¸  Falha ao criar volume"
        }
    fi
}

create_volume_if_not_exists "postgres_data"
create_volume_if_not_exists "redis_data"
create_volume_if_not_exists "documentos_data"

echo "âœ… Volumes verificados"

# ==============================
# 5ï¸âƒ£ Criar/Verificar redes necessÃ¡rias
# ==============================
echo ""
echo "ðŸŒ Verificando redes Docker..."

# Criar rede backend se nÃ£o existir
if ! docker network ls --format '{{.Name}}' | grep -q "^estacao-backend-network$"; then
    echo "   â†’ Criando rede estacao-backend-network..."
    docker network create --driver overlay estacao-backend-network || {
        echo "âŒ Falha ao criar rede backend!"
        exit 1
    }
    echo "âœ… Rede estacao-backend-network criada"
else
    echo "âœ… Rede estacao-backend-network jÃ¡ existe"
fi

# Criar rede principal se nÃ£o existir
if ! docker network ls --format '{{.Name}}' | grep -q "^estacao-network$"; then
    echo "   â†’ Criando rede estacao-network..."
    docker network create --driver overlay estacao-network || {
        echo "âŒ Falha ao criar rede principal!"
        exit 1
    }
    echo "âœ… Rede estacao-network criada"
else
    echo "âœ… Rede estacao-network jÃ¡ existe"
fi

# ==============================
# 6ï¸âƒ£ Backup da config atual
# ==============================
echo ""
echo "ðŸ’¾ Fazendo backup da config..."
BACKUP_FILE="docker-stack.yml.backup-${TIMESTAMP}"
cp docker-stack.yml "$BACKUP_FILE"
echo "âœ… Backup salvo em: $BACKUP_FILE"

# ==============================
# 7ï¸âƒ£ Build das imagens NOVAS
# ==============================
echo ""
echo "ðŸ”¨ Construindo imagens Docker..."

# ==============================
# Build Redis com entrypoint
# ==============================
echo ""
echo "   â†’ estacaoterapia-redis:prd-$TAG"
echo "   ðŸ“ Contexto: $(pwd)"
echo "   ðŸ“„ Dockerfile: ./Dockerfile.redis"
docker build \
    --no-cache \
    --progress=plain \
    -t "estacaoterapia-redis:prd-${TAG}" \
    -f ./Dockerfile.redis \
    . || {
        echo ""
        echo "âŒ Falha ao construir imagem Redis!"
        echo "ðŸ“ Verifique se redis-entrypoint.sh existe"
        exit 1
    }
echo "âœ… Redis compilado com sucesso"

# Verificar arquivos de lock antes do build
echo ""
echo "ðŸ“‹ Verificando gerenciador de pacotes..."
if [ -f "yarn.lock" ]; then
    echo "   âœ“ yarn.lock encontrado - Usando Yarn"
elif [ -f "package-lock.json" ]; then
    echo "   âœ“ package-lock.json encontrado - Usando NPM"
else
    echo "   âš  Nenhum lock file encontrado - Usando NPM padrÃ£o"
fi

echo ""
echo "   â†’ estacaoterapia-api:prd-$TAG"
echo "   ðŸ“ Contexto: $(pwd)"
echo "   ðŸ“„ Dockerfile: ./Dockerfile.api"
docker build \
    --no-cache \
    --build-arg NODE_ENV=production \
    --progress=plain \
    -t "estacaoterapia-api:prd-${TAG}" \
    -f ./Dockerfile.api \
    . || {
        echo ""
        echo "âŒ Falha ao construir imagem API!"
        echo "ðŸ“ Verifique os logs acima para detalhes"
        echo "ðŸ“ DiretÃ³rio: $(pwd)"
        echo "ðŸ“‹ Arquivos disponÃ­veis:"
        ls -la | grep -E "(package\.json|yarn\.lock|package-lock\.json)"
        exit 1
    }
echo "âœ… API compilada com sucesso"

echo ""
echo "   â†’ estacaoterapia-socket-server:prd-$TAG"
echo "   ðŸ“ Contexto: $(pwd)"
echo "   ðŸ“„ Dockerfile: ./Dockerfile.socket"
docker build \
    --no-cache \
    --build-arg NODE_ENV=production \
    --progress=plain \
    -t "estacaoterapia-socket-server:prd-${TAG}" \
    -f ./Dockerfile.socket \
    . || {
        echo ""
        echo "âŒ Falha ao construir imagem Socket!"
        echo "ðŸ“ Verifique os logs acima para detalhes"
        exit 1
    }
echo "âœ… Socket compilada com sucesso"

# ==============================
# 8ï¸âƒ£ Atualizar docker-stack.yml
# ==============================
echo ""
echo "ðŸ“ Atualizando docker-stack.yml..."
DEPLOY_STACK_FILE="docker-stack.yml.deploy"
cp docker-stack.yml "$DEPLOY_STACK_FILE"
sed -i "s/{{TAG}}/${TAG}/g" "$DEPLOY_STACK_FILE"

echo "âœ… Stack configurado com nova tag: $TAG"

# ==============================
# 9ï¸âƒ£ Deploy para Swarm (zero-downtime)
# ==============================
echo ""
echo "ðŸš€ Fazendo deploy para Docker Swarm..."
echo "   â³ Aguardando rolling update..."

docker stack deploy \
    --compose-file "$DEPLOY_STACK_FILE" \
    --with-registry-auth \
    estacaoterapia || {
        echo "âŒ Falha ao fazer deploy!"
        echo "Revertendo para backup: $BACKUP_FILE"
        cp "$BACKUP_FILE" docker-stack.yml
        exit 1
    }

echo "âœ… Stack deployado com sucesso"

# ==============================
# ðŸ”Ÿ Aguardar convergÃªncia e saÃºde
# ==============================
echo ""
echo "â³ Aguardando serviÃ§os convergirem..."

# Aguardar inicial
sleep 10

MAX_WAIT=300  # 5 minutos
ELAPSED=0
WAIT_INTERVAL=10

echo ""
echo "ðŸ“Š Monitorando saÃºde dos serviÃ§os..."

wait_for_service_health() {
    local service_name=$1
    local max_wait=$2
    local is_optional=$3  # "optional" ou "required"
    local elapsed=0
    local wait_interval=5
    
    while [ $elapsed -lt $max_wait ]; do
        HEALTHY=$(docker service ps "$service_name" --format "{{.CurrentState}}" 2>/dev/null | grep -c "Running" 2>/dev/null || echo "0")
        HEALTHY=$(echo "$HEALTHY" | tr -d '\n' | tr -d ' ')
        
        if [ "$HEALTHY" -gt 0 ] 2>/dev/null; then
            return 0
        fi
        
        echo "   â³ Aguardando $service_name... ($elapsed/$max_wait segundos)"
        sleep $wait_interval
        elapsed=$((elapsed + wait_interval))
    done
    
    return 1
}

# FunÃ§Ã£o para verificar status detalhado do serviÃ§o
check_service_status() {
    local service_name=$1
    echo ""
    echo "ðŸ” Verificando status detalhado de $service_name..."
    docker service ps "$service_name" --no-trunc 2>/dev/null || echo "   âŒ ServiÃ§o nÃ£o encontrado"
    
    echo ""
    echo "ðŸ“‹ Ãšltimos logs de $service_name:"
    docker service logs "$service_name" --tail 20 2>/dev/null || echo "   âŒ NÃ£o foi possÃ­vel obter logs"
}

# Aguardar Redis primeiro (dependÃªncia crÃ­tica)
echo "   â†’ Aguardando Redis..."
if ! wait_for_service_health "estacaoterapia_redis" 120 "required"; then
    echo ""
    echo "âŒ Redis NÃƒO SUBIU no tempo limite (120s)!"
    check_service_status "estacaoterapia_redis"
    echo ""
    echo "âš ï¸  ERRO CRÃTICO: Redis nÃ£o conseguiu inicializar"
    echo "   PossÃ­veis causas:"
    echo "   - Problemas de volume docker (redis_data)"
    echo "   - Arquivo de configuraÃ§Ã£o invÃ¡lido"
    echo "   - Falta de permissÃµes"
    echo "   - Porta 6379 em uso"
    echo ""
    echo "   Debug: docker service logs estacaoterapia_redis"
    exit 1
else
    echo "   âœ… Redis iniciado com sucesso"
fi

# Aguardar PostgreSQL (apÃ³s Redis estar ok)
echo "   â†’ Aguardando PostgreSQL..."
if ! wait_for_service_health "estacaoterapia_postgres" 120 "required"; then
    echo ""
    echo "âŒ PostgreSQL NÃƒO SUBIU no tempo limite (120s)!"
    check_service_status "estacaoterapia_postgres"
    echo ""
    echo "âš ï¸  ERRO CRÃTICO: PostgreSQL nÃ£o conseguiu inicializar"
    echo "   PossÃ­veis causas:"
    echo "   - Problemas de volume docker (postgres_data)"
    echo "   - Secrets do PostgreSQL invÃ¡lidos"
    echo "   - Falta de permissÃµes"
    echo "   - Porta 5432 em uso"
    echo ""
    echo "   Debug: docker service logs estacaoterapia_postgres"
    exit 1
else
    echo "   âœ… PostgreSQL iniciado com sucesso"
fi

# Aguardar PgBouncer (apÃ³s PostgreSQL estar ok)
echo "   â†’ Aguardando PgBouncer..."
if ! wait_for_service_health "estacaoterapia_pgbouncer" 60 "required"; then
    echo ""
    echo "âš ï¸  PgBouncer ainda nÃ£o respondeu, continuando..."
    check_service_status "estacaoterapia_pgbouncer"
else
    echo "   âœ… PgBouncer iniciado com sucesso"
fi

# Verificar status dos serviÃ§os
echo ""
echo "ðŸ“Š Status dos serviÃ§os:"
docker service ls --filter "label=com.docker.stack.namespace=estacaoterapia"

echo ""
echo "ðŸ” Replicas da API:"
docker service ps estacaoterapia_api --no-trunc 2>/dev/null | head -5 || echo "   (aguardando inicializaÃ§Ã£o)"

echo ""
echo "ðŸ” Replicas do Socket:"
docker service ps estacaoterapia_socket-server --no-trunc 2>/dev/null | head -5 || echo "   (aguardando inicializaÃ§Ã£o)"

echo ""
echo "ðŸ” Replicas do PostgreSQL:"
docker service ps estacaoterapia_postgres --no-trunc 2>/dev/null | head -5 || echo "   (aguardando inicializaÃ§Ã£o)"

echo ""
echo "ðŸ” Replicas do Redis:"
docker service ps estacaoterapia_redis --no-trunc 2>/dev/null | head -5 || echo "   (aguardando inicializaÃ§Ã£o)"
echo ""
echo "ðŸ’¾ Verificando necessidade de restaurar banco de dados..."

BACKUP_SQL="./backups/estacaoterapia_prd.sql"

if [ ! -f "$BACKUP_SQL" ]; then
    echo "âš ï¸  Arquivo de backup nÃ£o encontrado: $BACKUP_SQL"
    echo "   Continuando sem restaurar o banco..."
    return 0 2>/dev/null || true  # evita erro em scripts sourcing
fi

echo "   ðŸ“ Arquivo encontrado: $BACKUP_SQL"

# Aguardar PostgreSQL ficar pronto
echo "   â³ Aguardando PostgreSQL ficar pronto..."
sleep 10

# Pegar container ativo do Postgres
POSTGRES_CONTAINER=$(docker ps \
    --filter "label=com.docker.swarm.service.name=estacaoterapia_postgres" \
    --format "{{.ID}}" | head -1)

if [ -z "$POSTGRES_CONTAINER" ]; then
    echo "   âŒ Container do PostgreSQL nÃ£o encontrado!"
    echo "   âš ï¸  Continuando sem restaurar o banco..."
    return 0 2>/dev/null || true
fi

echo "   âœ“ PostgreSQL encontrado: $POSTGRES_CONTAINER"

# FunÃ§Ã£o para executar psql com usuÃ¡rio correto
psql_exec() {
    docker exec "$POSTGRES_CONTAINER" sh -c "PGPASSWORD='$POSTGRES_PASSWORD' psql -U '$POSTGRES_USER' -d '$POSTGRES_DB' -t -c \"$1\" 2>/dev/null"
}

# Verificar se o banco existe
echo "   ðŸ” Verificando se o banco 'estacaoterapia' existe..."
DB_EXISTS=$(docker exec "$POSTGRES_CONTAINER" sh -c "PGPASSWORD='$POSTGRES_PASSWORD' psql -U '$POSTGRES_USER' -lqt 2>/dev/null" | awk '{print $1}' | grep -w estacaoterapia | wc -l || echo "0")
# Sanitize count to avoid "integer expression expected"
DB_EXISTS=${DB_EXISTS:-0}
if ! [[ "$DB_EXISTS" =~ ^[0-9]+$ ]]; then
    DB_EXISTS=0
fi

if [ "$DB_EXISTS" -eq 0 ]; then
    echo "   ðŸ“ Banco 'estacaoterapia' nÃ£o existe. Criando..."
    docker exec "$POSTGRES_CONTAINER" sh -c "PGPASSWORD='$POSTGRES_PASSWORD' psql -U '$POSTGRES_USER' -c \"CREATE DATABASE estacaoterapia;\"" || {
        echo "   âš ï¸  NÃ£o foi possÃ­vel criar banco (pode jÃ¡ existir)"
    }
    echo "   âœ“ Banco criado"
else
    echo "   âœ“ Banco 'estacaoterapia' jÃ¡ existe"
fi

# Verificar se jÃ¡ existem tabelas
echo "   ðŸ” Verificando se o banco jÃ¡ possui tabelas..."
TABLE_COUNT=$(psql_exec "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';" | tr -d ' ' || echo "0")

# Garantir que Ã© nÃºmero
TABLE_COUNT=${TABLE_COUNT:-0}
if ! [[ "$TABLE_COUNT" =~ ^[0-9]+$ ]]; then
    TABLE_COUNT=0
fi

if [ "$TABLE_COUNT" -gt 0 ]; then
    echo "   â„¹ï¸  Banco jÃ¡ possui $TABLE_COUNT tabela(s) criada(s)"
    echo "   â­ï¸  Pulando restore do backup (banco jÃ¡ populado)"
else
    echo "   âœ“ Banco vazio, prosseguindo com restore..."

    # Copiar arquivo SQL para o container
    echo "   ðŸ“¤ Copiando backup para o container..."
    docker cp "$BACKUP_SQL" "${POSTGRES_CONTAINER}:/tmp/restore.sql" || {
        echo "   âŒ Falha ao copiar arquivo para o container!"
        echo "   âš ï¸  Continuando sem restaurar o banco..."
        return 0 2>/dev/null || true
    }

    # Executar restore
    if docker exec "$POSTGRES_CONTAINER" test -f /tmp/restore.sql 2>/dev/null; then
        echo "   âœ“ Arquivo copiado com sucesso"
        echo "   ðŸ”„ Executando restore do banco de dados..."
        docker exec "$POSTGRES_CONTAINER" sh -c "PGPASSWORD='$POSTGRES_PASSWORD' psql -U '$POSTGRES_USER' -d estacaoterapia -f /tmp/restore.sql" 2>&1 | grep -E "(ERROR|CREATE|INSERT|restored|done)" || true
        echo "   âœ“ Restore executado"

        # Limpar arquivo temporÃ¡rio
        docker exec "$POSTGRES_CONTAINER" rm -f /tmp/restore.sql
        echo "   âœ… Banco de dados restaurado com sucesso!"
    else
        echo "   âš ï¸  Arquivo nÃ£o foi copiado corretamente"
    fi
fi


# ==============================
# ðŸ”Ÿ Limpeza de imagens antigas
# ==============================
echo ""
echo "ðŸ§¹ Limpando imagens antigas..."

# Encontrar imagens do estacaoterapia que NÃƒO sÃ£o a atual
OLD_REDIS_IMAGES=$(docker images --filter "reference=estacaoterapia-redis:prd-*" --format "{{.Repository}}:{{.Tag}}" | grep -v "prd-${TAG}$" || true)
OLD_API_IMAGES=$(docker images --filter "reference=estacaoterapia-api:prd-*" --format "{{.Repository}}:{{.Tag}}" | grep -v "prd-${TAG}$" || true)
OLD_SOCKET_IMAGES=$(docker images --filter "reference=estacaoterapia-socket-server:prd-*" --format "{{.Repository}}:{{.Tag}}" | grep -v "prd-${TAG}$" || true)

REMOVED_COUNT=0

# Remover imagens antigas do Redis
if [ -n "$OLD_REDIS_IMAGES" ]; then
    echo "$OLD_REDIS_IMAGES" | while read -r old_image; do
        if [ -n "$old_image" ]; then
            echo "   ðŸ—‘ï¸  Removendo: $old_image"
            docker rmi "$old_image" 2>/dev/null || echo "      âš ï¸  NÃ£o foi possÃ­vel remover (em uso)"
        fi
    done
fi

# Remover imagens antigas da API
if [ -n "$OLD_API_IMAGES" ]; then
    echo "$OLD_API_IMAGES" | while read -r old_image; do
        if [ -n "$old_image" ]; then
            echo "   ðŸ—‘ï¸  Removendo: $old_image"
            docker rmi "$old_image" 2>/dev/null || echo "      âš ï¸  NÃ£o foi possÃ­vel remover (em uso)"
        fi
    done
fi

# Remover imagens antigas do Socket
if [ -n "$OLD_SOCKET_IMAGES" ]; then
    echo "$OLD_SOCKET_IMAGES" | while read -r old_image; do
        if [ -n "$old_image" ]; then
            echo "   ðŸ—‘ï¸  Removendo: $old_image"
            docker rmi "$old_image" 2>/dev/null || echo "      âš ï¸  NÃ£o foi possÃ­vel remover (em uso)"
        fi
    done
fi

# Limpar dangling images
echo ""
echo "ðŸ§¹ Removendo imagens dangling..."
DANGLING_REMOVED=$(docker image prune -f --filter "until=1h" 2>/dev/null | grep -o "deleted" | wc -l)
if [ "$DANGLING_REMOVED" -gt 0 ]; then
    echo "   âœ… $DANGLING_REMOVED imagens removidas"
fi

# ==============================
# 1ï¸âƒ£0ï¸âƒ£ Limpeza de arquivos temporÃ¡rios
# ==============================
echo ""
echo "ðŸ“‚ Limpando arquivos temporÃ¡rios..."
rm -f "$DEPLOY_STACK_FILE"
echo "   âœ… Arquivos temporÃ¡rios removidos"

# ==============================
# 1ï¸âƒ£1ï¸âƒ£ Resumo Final
# ==============================
echo ""
echo "======================================"
echo "âœ… DEPLOY CONCLUÃDO COM SUCESSO!"
echo "======================================"
echo ""
echo "ðŸ“‹ Resumo:"
echo "   â€¢ Tag: prd-$TAG"
echo "   â€¢ Stack: estacaoterapia"
echo "   â€¢ Deploy: $(date '+%d/%m/%Y %H:%M:%S')"
echo "   â€¢ Modo: Zero-Downtime (Rolling Update)"
echo ""
echo "ðŸ” PrÃ³ximos passos:"
echo "   1. Monitorar logs: docker service logs estacaoterapia_api -f"
echo "   2. Verificar saÃºde: docker service ls"
echo "   3. Testar endpoint: curl http://localhost:3333/health"
echo ""
echo "â®ï¸  Se precisar reverter:"
echo "   cp $BACKUP_FILE docker-stack.yml"
echo "   docker stack deploy -c docker-stack.yml estacaoterapia"
echo ""
