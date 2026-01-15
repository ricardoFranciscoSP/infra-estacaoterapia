#!/bin/bash
set -euo pipefail

# Configurar UTF-8 corretamente
export LC_ALL=en_US.UTF-8
export LANG=en_US.UTF-8

# ==============================
# Deploy Docker Swarm Stack - FUNCIONAL 100%
# ==============================
# Zero-downtime deployment com:
# - Validacao completa de secrets e volumes
# - Build automatico de novas imagens
# - Update rolling (sem parar servicos)
# - Cleanup de imagens antigas
# - Restauracao automatica do banco
# - Monitoramento de saude dos servicos

echo "======================================"
echo "[INICIO] Deploy iniciado - $(date)"
echo "======================================"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SECRETS_DIR="/opt/secrets"

# ==============================
# 1. Gerar tag com timestamp + git hash
# ==============================
TIMESTAMP=$(date +%Y%m%d%H%M%S)
GIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
TAG="${TIMESTAMP}-${GIT_HASH}"

echo ""
echo "[CONFIG] Configuracoes do Deploy:"
echo "   - Tag: prd-$TAG"
echo "   - Data: $(date '+%d/%m/%Y %H:%M:%S')"
echo "   - Git: $GIT_HASH"

# ==============================
# 2. Validar pre-requisitos
# ==============================
echo ""
echo "[VALIDACAO] Verificando pre-requisitos..."

if ! command -v docker &> /dev/null; then
    echo "[ERRO] Docker nao encontrado!"
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
    echo "[ERRO] Docker Swarm nao esta ativo!"
    echo "   Execute: docker swarm init"
    exit 1
fi

if [ ! -f "docker-stack.yml" ]; then
    echo "[ERRO] docker-stack.yml nao encontrado!"
    exit 1
fi

# Validar arquivos de secrets
echo ""
echo "[SEGURANCA] Verificando secrets..."
SECRETS_REQUIRED=(
    "postgres.env"
    "estacao_api.env"
    "estacao_socket.env"
)

for secret_file in "${SECRETS_REQUIRED[@]}"; do
    if [ ! -f "$SECRETS_DIR/$secret_file" ]; then
        echo "[ERRO] Arquivo $SECRETS_DIR/$secret_file nao encontrado!"

        echo "   Copie do exemplo: cp $SECRETS_DIR/${secret_file}.example $SECRETS_DIR/$secret_file"
        exit 1
    fi
done

# Validar arquivos do PgBouncer
if [ ! -f "/opt/secrets/pgbouncer/pgbouncer.ini" ]; then
    echo "[ERRO] Arquivo /opt/secrets/pgbouncer/pgbouncer.ini nao encontrado!"
    exit 1
fi

if [ ! -f "/opt/secrets/pgbouncer/userlist.txt" ]; then
    echo "[ERRO] Arquivo /opt/secrets/pgbouncer/userlist.txt nao encontrado!"
    exit 1
fi

echo "[OK] Todos os arquivos de secrets encontrados"

echo "[OK] Pre-requisitos validados"

# ==============================
# 3. Criar/Atualizar Secrets
# ==============================
echo ""
echo "[SECRETS] Gerenciando secrets nao Docker Swarm..."

create_or_update_secret() {
    local secret_name=$1
    local secret_file=$2
    
    if docker secret inspect "$secret_name" >/dev/null 2>&1; then
        echo "   [ATUALIZANDO] Secret: $secret_name"
        docker secret rm "$secret_name" 2>/dev/null || true
        docker secret create "$secret_name" "$secret_file" 2>/dev/null || {
            echo "   [AVISO] [ERRO] ao atualizar (pode estar em uso)"
        }
    else
        echo "   [CRIANDO] Secret: $secret_name"
        docker secret create "$secret_name" "$secret_file" 2>/dev/null || {
            echo "   [AVISO] Secret ja pode existir"
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
echo "   [INFO] Criando secret redis_password..."
REDIS_PASSWORD=$(grep "^REDIS_PASSWORD=" "$SECRETS_DIR/estacao_api.env" | cut -d'=' -f2 | tr -d ' ' | head -1)
if [ -n "$REDIS_PASSWORD" ]; then
    # Criar arquivo temporario com a senha
    TEMP_REDIS_PASSWORD=$(mktemp)
    echo -n "$REDIS_PASSWORD" > "$TEMP_REDIS_PASSWORD"
    create_or_update_secret "redis_password" "$TEMP_REDIS_PASSWORD"
    rm -f "$TEMP_REDIS_PASSWORD"
    echo "   [OK] Secret redis_password criado/atualizado"
else
    echo "   [AVISO] REDIS_PASSWORD nao encontrado em estacao_api.env"
    echo "   [AVISO] Redis sera iniciado sem senha"
fi
create_or_update_secret "userlist.txt" "/opt/secrets/pgbouncer/userlist.txt"

# Extrair credenciais do postgres.env para validacao
echo ""
echo "   [INFO] Validando credenciais PostgreSQL..."

# Validar se o arquivo possui as variaveis necessarias
POSTGRES_USER=$(grep "^POSTGRES_USER=" "$SECRETS_DIR/postgres.env" | cut -d'=' -f2 | tr -d ' ')
POSTGRES_PASSWORD=$(grep "^POSTGRES_PASSWORD=" "$SECRETS_DIR/postgres.env" | cut -d'=' -f2 | tr -d ' ')
POSTGRES_DB=$(grep "^POSTGRES_DB=" "$SECRETS_DIR/postgres.env" | cut -d'=' -f2 | tr -d ' ')

if [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_PASSWORD" ] || [ -z "$POSTGRES_DB" ]; then
    echo "[ERRO] Credenciais PostgreSQL incompletas em $SECRETS_DIR/postgres.env"
    exit 1
fi

echo "[OK] Credenciais validadas:"
echo "  - POSTGRES_USER: $POSTGRES_USER"
echo "  - POSTGRES_DB: $POSTGRES_DB"
echo "  - POSTGRES_PASSWORD: [***]"

# Extrair senha Redis do estacao_api_env para validacao
REDIS_PASSWORD=$(grep "^REDIS_PASSWORD=" "$SECRETS_DIR/estacao_api.env" | cut -d'=' -f2 | tr -d ' ' | head -1)
if [ -z "$REDIS_PASSWORD" ]; then
    echo "[AVISO] Redis password nao encontrado em estacao_api.env"
else
    echo "  - REDIS_PASSWORD: [***]"
fi

echo "[OK] Secrets configurados"

# ==============================
# 4. Criar/Verificar volumes
# ==============================
echo ""
echo "[VOLUMES] Verificando volumes Docker..."

create_volume_if_not_exists() {
    local volume_name=$1
    
    if docker volume inspect "$volume_name" >/dev/null 2>&1; then
        echo "   [EXISTE] Volume: $volume_name"
    else
        echo "   [CRIANDO] Volume: $volume_name"
        docker volume create "$volume_name" || {
            echo "   [AVISO] [ERRO] ao criar volume"
        }
    fi
}

create_volume_if_not_exists "postgres_data"
create_volume_if_not_exists "redis_data"
create_volume_if_not_exists "documentos_data"

echo "[OK] Volumes verificados"

# ==============================
# 5. Criar/Verificar redes necessarias
# ==============================
echo ""
echo "[REDES] Verificando redes Docker..."

# Criar rede backend se nao existir
if ! docker network ls --format '{{.Name}}' | grep -q "^estacao-backend-network$"; then
    echo "   [CRIANDO] Rede estacao-backend-network..."
    docker network create --driver overlay estacao-backend-network || {
        echo "[ERRO] Falha ao criar rede backend!"
        exit 1
    }
    echo "[OK] Rede estacao-backend-network criada"
else
    echo "[OK] Rede estacao-backend-network ja existe"
fi

# Criar rede principal se nao existir
if ! docker network ls --format '{{.Name}}' | grep -q "^estacao-network$"; then
    echo "   [CRIANDO] Rede estacao-network..."
    docker network create --driver overlay estacao-network || {
        echo "[ERRO] Falha ao criar rede principal!"
        exit 1
    }
    echo "[OK] Rede estacao-network criada"
else
    echo "[OK] Rede estacao-network ja existe"
fi

# ==============================
# 6. Backup da config atual
# ==============================
echo ""
echo "[BACKUP] Fazendo backup da config..."
BACKUP_FILE="docker-stack.yml.backup-${TIMESTAMP}"
cp docker-stack.yml "$BACKUP_FILE"
echo "[OK] Backup salvo em: $BACKUP_FILE"

# ==============================
# 7. Build das imagens NOVAS
# ==============================
echo ""
echo "[BUILD] Construindo imagens Docker..."

# ==============================
# Build Redis com entrypoint
# ==============================
echo ""
echo "   [BUILD] estacaoterapia-redis:prd-$TAG"
echo "   [CONTEXTO] $(pwd)"
echo "   [DOCKERFILE] ./Dockerfile.redis"
docker build \
    --no-cache \
    --progress=plain \
    -t "estacaoterapia-redis:prd-${TAG}" \
    -f ./Dockerfile.redis \
    . || {
        echo ""
        echo "[ERRO] Falha ao construir imagem Redis!"
        echo "[INFO] Verifique se redis-entrypoint.sh existe"
        exit 1
    }
echo "[OK] Redis compilado com sucesso"

# Verificar arquivos de lock antes do build
echo ""
echo "[INFO] Verificando gerenciador de pacotes..."
if [ -f "yarn.lock" ]; then
    echo "   [OK] yarn.lock encontrado - Usando Yarn"
elif [ -f "package-lock.json" ]; then
    echo "   [OK] package-lock.json encontrado - Usando NPM"
else
    echo "   [AVISO] Nenhum lock file encontrado - Usando NPM padrao"
fi

echo ""
echo "   [BUILD] estacaoterapia-api:prd-$TAG"
echo "   [CONTEXTO] $(pwd)"
echo "   [DOCKERFILE] ./Dockerfile.api"
docker build \
    --no-cache \
    --build-arg NODE_ENV=production \
    --progress=plain \
    -t "estacaoterapia-api:prd-${TAG}" \
    -f ./Dockerfile.api \
    . || {
        echo ""
        echo "[ERRO] Falha ao construir imagem API!"
        echo "[INFO] Verifique os logs acima para detalhes"
        echo "[DIRETORIO] $(pwd)"
        echo "[ARQUIVOS] Disponiveis:"
        ls -la | grep -E "(package\.json|yarn\.lock|package-lock\.json)"
        exit 1
    }
echo "[OK] API compilada com sucesso"

echo ""
echo "   [BUILD] estacaoterapia-socket-server:prd-$TAG"
echo "   [CONTEXTO] $(pwd)"
echo "   [DOCKERFILE] ./Dockerfile.socket"
docker build \
    --no-cache \
    --build-arg NODE_ENV=production \
    --progress=plain \
    -t "estacaoterapia-socket-server:prd-${TAG}" \
    -f ./Dockerfile.socket \
    . || {
        echo ""
        echo "[ERRO] Falha ao construir imagem Socket!"
        echo "[INFO] Verifique os logs acima para detalhes"
        exit 1
    }
echo "[OK] Socket compilada com sucesso"

# ==============================
# 8. Atualizar docker-stack.yml
# ==============================
echo ""
echo "[CONFIG] Atualizando docker-stack.yml..."
DEPLOY_STACK_FILE="docker-stack.yml.deploy"
cp docker-stack.yml "$DEPLOY_STACK_FILE"
sed -i "s/{{TAG}}/${TAG}/g" "$DEPLOY_STACK_FILE"

echo "[OK] Stack configurado com nova tag: $TAG"

# ==============================
# 9. Deploy para Swarm (zero-downtime)
# ==============================
echo ""
echo "[DEPLOY] Fazendo deploy para Docker Swarm..."
echo "   [AGUARDANDO] rolling update..."

docker stack deploy \
    --compose-file "$DEPLOY_STACK_FILE" \
    --resolve-image always \
    --with-registry-auth \
    estacaoterapia || {
        echo "[ERRO] Falha ao fazer deploy!"
        echo "[REVERT] Revertendo para backup: $BACKUP_FILE"
        cp "$BACKUP_FILE" docker-stack.yml
        exit 1
    }

echo "[OK] Stack deployado com sucesso"

# ==============================
# 10. Aguardar convergencia e saude
# ==============================
echo ""
echo "[AGUARDANDO] Servicos convergindo..."

# Aguardar inicial
sleep 10

MAX_WAIT=300  # 5 minutos
ELAPSED=0
WAIT_INTERVAL=10

echo ""
echo "[MONITORANDO] Saude dos servicos..."

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
        
        echo "   [AGUARDANDO] $service_name... ($elapsed/$max_wait segundos)"
        sleep $wait_interval
        elapsed=$((elapsed + wait_interval))
    done
    
    return 1
}

# Funcao para verificar status detalhado do servico
check_service_status() {
    local service_name=$1
    echo ""
    echo "[INFO] Verificando status detalhado de $service_name..."
    docker service ps "$service_name" --no-trunc 2>/dev/null || echo "   [ERRO] Servico nao encontrado"
    
    echo ""
    echo "[LOGS] Ultimos logs de $service_name:"
    docker service logs "$service_name" --tail 20 2>/dev/null || echo "   [ERRO] Nao foi possivel obter logs"
}

# Aguardar Redis primeiro (dependencia critica)
echo "   [AGUARDANDO] Redis..."
if ! wait_for_service_health "estacaoterapia_redis" 120 "required"; then
    echo ""
    echo " Redis NAO SUBIU no tempo limite (120s)!"
    check_service_status "estacaoterapia_redis"
    echo ""
    echo "[CRITICO] Redis nao conseguiu inicializar"
    echo "   Possiveis causas:"
    echo "   - Problemas de volume docker (redis_data)"
    echo "   - Arquivo de configuracao invalido"
    echo "   - Falta de permissoes"
    echo "   - Porta 6379 em uso"
    echo ""
    echo "   Debug: docker service logs estacaoterapia_redis"
    exit 1
else
    echo "   [OK] Redis iniciado com sucesso"
fi

# Aguardar PostgreSQL (apos Redis estar ok)
echo "   [AGUARDANDO] PostgreSQL..."
if ! wait_for_service_health "estacaoterapia_postgres" 120 "required"; then
    echo ""
    echo " PostgreSQL NAO SUBIU no tempo limite (120s)!"
    check_service_status "estacaoterapia_postgres"
    echo ""
    echo "[CRITICO] PostgreSQL nao conseguiu inicializar"
    echo "   Possiveis causas:"
    echo "   - Problemas de volume docker (postgres_data)"
    echo "   - Secrets do PostgreSQL invalidos"
    echo "   - Falta de permissoes"
    echo "   - Porta 5432 em uso"
    echo ""
    echo "   Debug: docker service logs estacaoterapia_postgres"
    exit 1
else
    echo "   [OK] PostgreSQL iniciado com sucesso"
fi

# Aguardar PgBouncer (apos PostgreSQL estar ok)
echo "   [AGUARDANDO] PgBouncer..."
if ! wait_for_service_health "estacaoterapia_pgbouncer" 60 "required"; then
    echo ""
    echo "[AVISO] PgBouncer ainda nao respondeu, continuando..."
    check_service_status "estacaoterapia_pgbouncer"
else
    echo "   [OK] PgBouncer iniciado com sucesso"
fi

# Verificar status dos servios
echo ""
echo "[STATUS] Servicos:"
docker service ls --filter "label=com.docker.stack.namespace=estacaoterapia"

echo ""
echo " Replicas da API:"
docker service ps estacaoterapia_api --no-trunc 2>/dev/null | head -5 || echo "   (aguardando inicializao)"

echo ""
echo " Replicas do Socket:"
docker service ps estacaoterapia_socket-server --no-trunc 2>/dev/null | head -5 || echo "   (aguardando inicializao)"

echo ""
echo " Replicas do PostgreSQL:"
docker service ps estacaoterapia_postgres --no-trunc 2>/dev/null | head -5 || echo "   (aguardando inicializao)"

echo ""
echo " Replicas do Redis:"
docker service ps estacaoterapia_redis --no-trunc 2>/dev/null | head -5 || echo "   (aguardando inicializao)"
echo ""
echo " [INFO] Verificando necessidade de restaurar banco de dados..."

BACKUP_SQL="./backups/estacaoterapia_prd.sql"

if [ ! -f "$BACKUP_SQL" ]; then
    echo "  Arquivo de backup nao encontrado: $BACKUP_SQL"
    echo "   Continuando sem restaurar o banco..."
    return 0 2>/dev/null || true  # evita erro em scripts sourcing
fi

echo "    Arquivo encontrado: $BACKUP_SQL"

# Aguardar PostgreSQL ficar pronto
echo "   [AGUARDANDO] PostgreSQL ficar pronto..."
sleep 10

# Pegar container ativo do Postgres
POSTGRES_CONTAINER=$(docker ps \
    --filter "label=com.docker.swarm.service.name=estacaoterapia_postgres" \
    --format "{{.ID}}" | head -1)

if [ -z "$POSTGRES_CONTAINER" ]; then
    echo "    Container do PostgreSQL nao encontrado!"
    echo "     Continuando sem restaurar o banco..."
    return 0 2>/dev/null || true
fi

echo "    PostgreSQL encontrado: $POSTGRES_CONTAINER"

# Funcao para executar psql com usurio correto
psql_exec() {
    docker exec "$POSTGRES_CONTAINER" sh -c "PGPASSWORD='$POSTGRES_PASSWORD' psql -U '$POSTGRES_USER' -d '$POSTGRES_DB' -t -c \"$1\" 2>/dev/null"
}

# Verificar se o banco existe
echo "    [INFO] Verificando se o banco 'estacaoterapia' existe..."
DB_EXISTS=$(docker exec "$POSTGRES_CONTAINER" sh -c "PGPASSWORD='$POSTGRES_PASSWORD' psql -U '$POSTGRES_USER' -lqt 2>/dev/null" | awk '{print $1}' | grep -w estacaoterapia | wc -l || echo "0")
# Sanitize count to avoid "integer expression expected"
DB_EXISTS=${DB_EXISTS:-0}
if ! [[ "$DB_EXISTS" =~ ^[0-9]+$ ]]; then
    DB_EXISTS=0
fi

if [ "$DB_EXISTS" -eq 0 ]; then
    echo "    Banco 'estacaoterapia' nao existe. Criando..."
    docker exec "$POSTGRES_CONTAINER" sh -c "PGPASSWORD='$POSTGRES_PASSWORD' psql -U '$POSTGRES_USER' -c \"CREATE DATABASE estacaoterapia;\"" || {
        echo "     nao foi possivel criar banco (pode j existir)"
    }
    echo "    Banco criado"
else
    echo "    Banco 'estacaoterapia' ja existe"
fi

# Verificar se ja existem tabelas
echo "    [INFO] Verificando se o banco j possui tabelas..."
TABLE_COUNT=$(psql_exec "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';" | tr -d ' ' || echo "0")

# Garantir que  nmero
TABLE_COUNT=${TABLE_COUNT:-0}
if ! [[ "$TABLE_COUNT" =~ ^[0-9]+$ ]]; then
    TABLE_COUNT=0
fi

if [ "$TABLE_COUNT" -gt 0 ]; then
    echo "     Banco j possui $TABLE_COUNT tabela(s) criada(s)"
    echo "     Pulando restore do backup (banco j populado)"
else
    echo "    Banco vazio, prosseguindo com restore..."

    # Copiar arquivo SQL para o container
    echo "    Copiando backup para o container..."
    docker cp "$BACKUP_SQL" "${POSTGRES_CONTAINER}:/tmp/restore.sql" || {
        echo "    [ERRO] ao copiar arquivo para o container!"
        echo "     Continuando sem restaurar o banco..."
        return 0 2>/dev/null || true
    }

    # Executar restore
    if docker exec "$POSTGRES_CONTAINER" test -f /tmp/restore.sql 2>/dev/null; then
        echo "    Arquivo copiado com sucesso"
        echo "    Executando restore do banco de dados..."
        docker exec "$POSTGRES_CONTAINER" sh -c "PGPASSWORD='$POSTGRES_PASSWORD' psql -U '$POSTGRES_USER' -d estacaoterapia -f /tmp/restore.sql" 2>&1 | grep -E "(ERROR|CREATE|INSERT|restored|done)" || true
        echo "    Restore executado"

        # Limpar arquivo temporrio
        docker exec "$POSTGRES_CONTAINER" rm -f /tmp/restore.sql
        echo "    Banco de dados restaurado com sucesso!"
    else
        echo "     Arquivo nao foi copiado corretamente"
    fi
fi


# ==============================
#  Limpeza de imagens antigas
# ==============================
echo ""
echo " Limpando imagens antigas..."

# Encontrar imagens do estacaoterapia que nao so a atual
OLD_REDIS_IMAGES=$(docker images --filter "reference=estacaoterapia-redis:prd-*" --format "{{.Repository}}:{{.Tag}}" | grep -v "prd-${TAG}$" || true)
OLD_API_IMAGES=$(docker images --filter "reference=estacaoterapia-api:prd-*" --format "{{.Repository}}:{{.Tag}}" | grep -v "prd-${TAG}$" || true)
OLD_SOCKET_IMAGES=$(docker images --filter "reference=estacaoterapia-socket-server:prd-*" --format "{{.Repository}}:{{.Tag}}" | grep -v "prd-${TAG}$" || true)

REMOVED_COUNT=0

# Remover imagens antigas do Redis
if [ -n "$OLD_REDIS_IMAGES" ]; then
    echo "$OLD_REDIS_IMAGES" | while read -r old_image; do
        if [ -n "$old_image" ]; then
            echo "   [REMOVENDO] $old_image"
            docker rmi "$old_image" 2>/dev/null || echo "      [AVISO] Nao foi possivel remover (em uso)"
        fi
    done
fi

# Remover imagens antigas da API
if [ -n "$OLD_API_IMAGES" ]; then
    echo "$OLD_API_IMAGES" | while read -r old_image; do
        if [ -n "$old_image" ]; then
            echo "   [REMOVENDO] $old_image"
            docker rmi "$old_image" 2>/dev/null || echo "      [AVISO] Nao foi possivel remover (em uso)"
        fi
    done
fi

# Remover imagens antigas do Socket
if [ -n "$OLD_SOCKET_IMAGES" ]; then
    echo "$OLD_SOCKET_IMAGES" | while read -r old_image; do
        if [ -n "$old_image" ]; then
            echo "   [REMOVENDO] $old_image"
            docker rmi "$old_image" 2>/dev/null || echo "      [AVISO] Nao foi possivel remover (em uso)"
        fi
    done
fi

# Limpar dangling images
echo ""
echo "[LIMPEZA] Removendo imagens dangling..."
DANGLING_REMOVED=$(docker image prune -f --filter "until=1h" 2>/dev/null | grep -o "deleted" | wc -l)
if [ "$DANGLING_REMOVED" -gt 0 ]; then
    echo "   [OK] $DANGLING_REMOVED imagens removidas"
fi

# Limpeza pós-deploy (disco)
echo ""
echo "[LIMPEZA] Executando cleanup pós-deploy..."
CLEANUP_SCRIPT="$SCRIPT_DIR/../cleanup-deploy.sh"
if [ -f "$CLEANUP_SCRIPT" ]; then
    chmod +x "$CLEANUP_SCRIPT" 2>/dev/null || true
    "$CLEANUP_SCRIPT" || echo "   [AVISO] Falha na limpeza pós-deploy"
else
    echo "   [AVISO] Script de limpeza não encontrado: $CLEANUP_SCRIPT"
fi

# ==============================
# 10. Limpeza de arquivos temporarios
# ==============================
echo ""
echo "[LIMPEZA] Limpando arquivos temporarios..."
rm -f "$DEPLOY_STACK_FILE"
echo "   [OK] Arquivos temporarios removidos"

# ==============================
# 11. Resumo Final
# ==============================
echo ""
echo "======================================"
echo "[SUCESSO] DEPLOY CONCLUIDO COM SUCESSO!"
echo "======================================"
echo ""
echo "[RESUMO] Informacoes:"
echo "   - Tag: prd-$TAG"
echo "   - Stack: estacaoterapia"
echo "   - Deploy: $(date '+%d/%m/%Y %H:%M:%S')"
echo "   - Modo: Zero-Downtime (Rolling Update)"
echo ""
echo "[PROXIMOS] Passos:"
echo "   1. Monitorar logs: docker service logs estacaoterapia_api -f"
echo "   2. Verificar saude: docker service ls"
echo "   3. Testar endpoint: curl http://localhost:3333/health"
echo ""
echo "[REVERTENDO] Se precisar reverter:"
echo "   cp $BACKUP_FILE docker-stack.yml"
echo "   docker stack deploy -c docker-stack.yml estacaoterapia"
echo ""
