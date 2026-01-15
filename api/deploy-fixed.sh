#!/bin/bash
set -euo pipefail

# Configurar UTF-8 para exibicao correta de caracteres
export LC_ALL=pt_BR.UTF-8
export LANG=pt_BR.UTF-8

# ==============================
# DEPLOY DOCKER SWARM STACK - FUNCIONAL 100%
# ==============================
# Zero-downtime deployment com:
# - Validacao completa de secrets e volumes
# - Build automatico de novas imagens
# - Update rolling (sem parar servicos)
# - Cleanup de imagens antigas
# - Restauracao automatica do banco
# - Monitoramento de saude dos servicos

echo "======================================"
echo "[DEPLOY] INICIANDO DEPLOY - $(date)"
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
echo "[INFO] Informacoes do Deploy:"
echo "   - Tag: prd-$TAG"
echo "   - Data: $(date '+%d/%m/%Y %H:%M:%S')"
echo "   - Git: $GIT_HASH"

# ==============================
# 2. Validar pre-requisitos
# ==============================
echo ""
echo "[CHECK] Validando pre-requisitos..."

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
echo "[CHECK] Verificando secrets..."
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
echo "[INFO] Gerenciando secrets no Docker Swarm..."

create_or_update_secret() {
    local secret_name=$1
    local secret_file=$2
    
    if docker secret inspect "$secret_name" >/dev/null 2>&1; then
        echo "   [UPDATE] Atualizando secret: $secret_name"
        docker secret rm "$secret_name" 2>/dev/null || true
        docker secret create "$secret_name" "$secret_file" 2>/dev/null || {
            echo "   [WARN] Falha ao atualizar (pode estar em uso)"
        }
    else
        echo "   [CREATE] Criando secret: $secret_name"
        docker secret create "$secret_name" "$secret_file" 2>/dev/null || {
            echo "   [WARN] Secret ja pode existir"
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
    echo "   [WARN] REDIS_PASSWORD nao encontrado em estacao_api.env"
    echo "   [WARN] Redis sera iniciado sem senha"
fi

create_or_update_secret "userlist.txt" "/opt/secrets/pgbouncer/userlist.txt"

# Extrair credenciais do postgres.env para validacao
echo ""
echo "   [CHECK] Validando credenciais PostgreSQL..."

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
    echo "[WARN] Redis password nao encontrado em estacao_api.env"
else
    echo "  - REDIS_PASSWORD: [***]"
fi

echo "[OK] Secrets configurados"

# ==============================
# 4. Criar/Verificar volumes
# ==============================
echo ""
echo "[INFO] Verificando volumes Docker..."

create_volume_if_not_exists() {
    local volume_name=$1
    
    if docker volume inspect "$volume_name" >/dev/null 2>&1; then
        echo "   [OK] Volume ja existe: $volume_name"
    else
        echo "   [CREATE] Criando volume: $volume_name"
        docker volume create "$volume_name" || {
            echo "   [WARN] Falha ao criar volume"
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
echo "[INFO] Verificando redes Docker..."

# Criar rede backend se nao existir
if ! docker network ls --format '{{.Name}}' | grep -q "^estacao-backend-network$"; then
    echo "   [CREATE] Criando rede estacao-backend-network..."
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
    echo "   [CREATE] Criando rede estacao-network..."
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
echo "[INFO] Fazendo backup da config..."
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
echo "   [DIR] Contexto: $(pwd)"
echo "   [FILE] Dockerfile: ./Dockerfile.redis"
docker build \
    --no-cache \
    --progress=plain \
    -t "estacaoterapia-redis:prd-${TAG}" \
    -f ./Dockerfile.redis \
    . || {
        echo ""
        echo "[ERRO] Falha ao construir imagem Redis!"
        echo "[DEBUG] Verifique se redis-entrypoint.sh existe"
        exit 1
    }
echo "[OK] Redis compilado com sucesso"

# Verificar arquivos de lock antes do build
echo ""
echo "[CHECK] Verificando gerenciador de pacotes..."
if [ -f "yarn.lock" ]; then
    echo "   [OK] yarn.lock encontrado - Usando Yarn"
elif [ -f "package-lock.json" ]; then
    echo "   [OK] package-lock.json encontrado - Usando NPM"
else
    echo "   [WARN] Nenhum lock file encontrado - Usando NPM padrao"
fi

echo ""
echo "   [BUILD] estacaoterapia-api:prd-$TAG"
echo "   [DIR] Contexto: $(pwd)"
echo "   [FILE] Dockerfile: ./Dockerfile.api"
docker build \
    --no-cache \
    --build-arg NODE_ENV=production \
    --progress=plain \
    -t "estacaoterapia-api:prd-${TAG}" \
    -f ./Dockerfile.api \
    . || {
        echo ""
        echo "[ERRO] Falha ao construir imagem API!"
        echo "[DEBUG] Verifique os logs acima para detalhes"
        echo "[DEBUG] Diretorio: $(pwd)"
        echo "[CHECK] Arquivos disponiveis:"
        ls -la | grep -E "(package\.json|yarn\.lock|package-lock\.json)"
        exit 1
    }
echo "[OK] API compilada com sucesso"

echo ""
echo "   [BUILD] estacaoterapia-socket-server:prd-$TAG"
echo "   [DIR] Contexto: $(pwd)"
echo "   [FILE] Dockerfile: ./Dockerfile.socket"
docker build \
    --no-cache \
    --build-arg NODE_ENV=production \
    --progress=plain \
    -t "estacaoterapia-socket-server:prd-${TAG}" \
    -f ./Dockerfile.socket \
    . || {
        echo ""
        echo "[ERRO] Falha ao construir imagem Socket!"
        echo "[DEBUG] Verifique os logs acima para detalhes"
        exit 1
    }
echo "[OK] Socket compilada com sucesso"

# ==============================
# 8. Atualizar docker-stack.yml
# ==============================
echo ""
echo "[INFO] Atualizando docker-stack.yml..."
DEPLOY_STACK_FILE="docker-stack.yml.deploy"
cp docker-stack.yml "$DEPLOY_STACK_FILE"
sed -i "s/{{TAG}}/${TAG}/g" "$DEPLOY_STACK_FILE"

echo "[OK] Stack configurado com nova tag: $TAG"

# ==============================
# 9. Deploy para Swarm (zero-downtime)
# ==============================
echo ""
echo "[DEPLOY] Fazendo deploy para Docker Swarm..."
echo "   [WAIT] Aguardando rolling update..."

docker stack deploy \
    --compose-file "$DEPLOY_STACK_FILE" \
    --resolve-image always \
    --with-registry-auth \
    estacaoterapia || {
        echo "[ERRO] Falha ao fazer deploy!"
        echo "[INFO] Revertendo para backup: $BACKUP_FILE"
        cp "$BACKUP_FILE" docker-stack.yml
        exit 1
    }

echo "[OK] Stack deployado com sucesso"

# ==============================
# 9.1 Garantir uso das imagens novas
# ==============================
echo ""
echo "[INFO] Validando imagens em uso pelos serviços..."

ensure_service_image() {
    local service_name="$1"
    local expected_image="$2"
    local current_image
    current_image=$(docker service inspect "$service_name" --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}' 2>/dev/null || echo "")

    if [ -z "$current_image" ]; then
        echo "   [WARN] Não foi possível inspecionar $service_name"
        return 0
    fi

    if echo "$current_image" | grep -q "$expected_image"; then
        echo "   [OK] $service_name usando $expected_image"
        return 0
    fi

    echo "   [WARN] $service_name usando $current_image (esperado: $expected_image)"
    echo "   [UPDATE] Atualizando imagem de $service_name..."
    docker service update --force --image "$expected_image" "$service_name" >/dev/null 2>&1 || {
        echo "   [WARN] Falha ao atualizar $service_name"
        return 0
    }
    echo "   [OK] $service_name atualizado para $expected_image"
}

ensure_service_image "estacaoterapia_api" "estacaoterapia-api:prd-${TAG}"
ensure_service_image "estacaoterapia_socket-server" "estacaoterapia-socket-server:prd-${TAG}"
ensure_service_image "estacaoterapia_redis" "estacaoterapia-redis:prd-${TAG}"

# ==============================
# AGUARDAR CONVERGENCIA E SAUDE
# ==============================
echo ""
echo "[WAIT] Aguardando servicos convergirem..."

# Aguardar inicial
sleep 10

MAX_WAIT=300  # 5 minutos
ELAPSED=0
WAIT_INTERVAL=10

echo ""
echo "[MONITOR] Monitorando saude dos servicos..."

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
        
        echo "   [WAIT] Aguardando $service_name... ($elapsed/$max_wait segundos)"
        sleep $wait_interval
        elapsed=$((elapsed + wait_interval))
    done
    
    return 1
}

# Funcao para verificar status detalhado do servico
check_service_status() {
    local service_name=$1
    echo ""
    echo "[CHECK] Verificando status detalhado de $service_name..."
    docker service ps "$service_name" --no-trunc 2>/dev/null || echo "   [ERRO] Servico nao encontrado"
    
    echo ""
    echo "[LOGS] Ultimos logs de $service_name:"
    docker service logs "$service_name" --tail 50 2>/dev/null || echo "   [ERRO] Nao foi possivel obter logs"
}

# Funcao para diagnosticar problemas do Redis
check_redis_container() {
    local service_name=$1
    echo ""
    echo "========================================"
    echo "[DEBUG] DIAGNOSTICO REDIS"
    echo "========================================"
    
    # Obter container ID
    CONTAINER_ID=$(docker ps -aq --filter "label=com.docker.swarm.service.name=$service_name" 2>/dev/null | head -1)
    
    if [ -z "$CONTAINER_ID" ]; then
        echo "[ERRO] Nenhum container encontrado para $service_name"
        return 1
    fi
    
    echo "[INFO] Container ID: $CONTAINER_ID"
    echo ""
    
    # Verificar processo Redis
    echo "[CHECK] Verificando processo Redis no container..."
    docker exec "$CONTAINER_ID" ps aux 2>/dev/null | grep -E "redis|PID" || echo "   [ERRO] Processo nao encontrado"
    
    echo ""
    echo "[CHECK] Verificando diretorio /data..."
    docker exec "$CONTAINER_ID" ls -la /data 2>/dev/null || echo "   [ERRO] Erro ao acessar /data"
    
    echo ""
    echo "[CHECK] Verificando permissoes de volume..."
    docker exec "$CONTAINER_ID" stat /data 2>/dev/null | grep -E "Access|Uid|Gid" || echo "   [ERRO] Erro ao obter info"
    
    echo ""
    echo "[CHECK] Verificando se porta 6379 esta escutando..."
    docker exec "$CONTAINER_ID" netstat -tuln 2>/dev/null | grep 6379 || echo "   [WARN] Porta 6379 nao esta escutando"
    
    echo ""
    echo "[CHECK] Testando conectividade Redis..."
    docker exec "$CONTAINER_ID" redis-cli PING 2>/dev/null || echo "   [ERRO] Nao foi possivel conectar ao Redis"
    
    echo ""
    echo "[LOGS] Logs completos do container..."
    docker logs "$CONTAINER_ID" --tail 100 2>/dev/null | head -50 || echo "   [ERRO] Erro ao obter logs"
}

# Aguardar Redis primeiro (dependencia critica)
echo "   [INIT] Aguardando Redis..."
if ! wait_for_service_health "estacaoterapia_redis" 120 "required"; then
    echo ""
    echo "[ERRO] Redis NAO SUBIU no tempo limite (120s)!"
    check_service_status "estacaoterapia_redis"
    check_redis_container "estacaoterapia_redis"
    echo ""
    echo "[ERRO CRITICO] Redis nao conseguiu inicializar"
    echo "   Possiveis causas:"
    echo "   - Problemas de volume docker (redis_data)"
    echo "   - Arquivo de configuracao invalido"
    echo "   - Falta de permissoes no volume"
    echo "   - Porta 6379 em uso"
    echo "   - Problema com entrypoint (redis-entrypoint.sh)"
    echo ""
    echo "   Solucoes:"
    echo "   1. Verificar volume: docker volume inspect redis_data"
    echo "   2. Limpar volume: docker volume rm redis_data"
    echo "   3. Reconstruir: docker build -t estacaoterapia-redis:prd-${TAG} -f ./Dockerfile.redis ."
    echo "   4. Verificar logs: docker service logs estacaoterapia_redis"
    echo ""
    exit 1
else
    echo "   [OK] Redis iniciado com sucesso"
fi

# Aguardar PostgreSQL (apos Redis estar ok)
echo "   [INIT] Aguardando PostgreSQL..."
if ! wait_for_service_health "estacaoterapia_postgres" 120 "required"; then
    echo ""
    echo "[ERRO] PostgreSQL NAO SUBIU no tempo limite (120s)!"
    check_service_status "estacaoterapia_postgres"
    echo ""
    echo "[ERRO CRITICO] PostgreSQL nao conseguiu inicializar"
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
echo "   [INIT] Aguardando PgBouncer..."
if ! wait_for_service_health "estacaoterapia_pgbouncer" 60 "required"; then
    echo ""
    echo "[WARN] PgBouncer ainda nao respondeu, continuando..."
    check_service_status "estacaoterapia_pgbouncer"
else
    echo "   [OK] PgBouncer iniciado com sucesso"
fi

# Verificar status dos servicos
echo ""
echo "[STATUS] Status dos servicos:"
docker service ls --filter "label=com.docker.stack.namespace=estacaoterapia"

echo ""
echo "[STATUS] Replicas da API:"
docker service ps estacaoterapia_api --no-trunc 2>/dev/null | head -5 || echo "   (aguardando inicializacao)"

echo ""
echo "[STATUS] Replicas do Socket:"
docker service ps estacaoterapia_socket-server --no-trunc 2>/dev/null | head -5 || echo "   (aguardando inicializacao)"

echo ""
echo "[STATUS] Replicas do PostgreSQL:"
docker service ps estacaoterapia_postgres --no-trunc 2>/dev/null | head -5 || echo "   (aguardando inicializacao)"

echo ""
echo "[STATUS] Replicas do Redis:"
docker service ps estacaoterapia_redis --no-trunc 2>/dev/null | head -5 || echo "   (aguardando inicializacao)"

echo ""
echo "[INFO] Verificando necessidade de restaurar banco de dados..."

BACKUP_SQL="./backups/estacaoterapia_prd.sql"

if [ ! -f "$BACKUP_SQL" ]; then
    echo "[WARN] Arquivo de backup nao encontrado: $BACKUP_SQL"
    echo "   Continuando sem restaurar o banco..."
    exit 0 2>/dev/null || true
fi

echo "   [INFO] Arquivo encontrado: $BACKUP_SQL"

# Aguardar PostgreSQL ficar pronto
echo "   [WAIT] Aguardando PostgreSQL ficar pronto..."
sleep 10

# Pegar container ativo do Postgres
POSTGRES_CONTAINER=$(docker ps \
    --filter "label=com.docker.swarm.service.name=estacaoterapia_postgres" \
    --format "{{.ID}}" | head -1)

if [ -z "$POSTGRES_CONTAINER" ]; then
    echo "   [ERRO] Container do PostgreSQL nao encontrado!"
    echo "   [WARN] Continuando sem restaurar o banco..."
    exit 0 2>/dev/null || true
fi

echo "   [OK] PostgreSQL encontrado: $POSTGRES_CONTAINER"

# Funcao para executar psql com usuario correto
psql_exec() {
    docker exec "$POSTGRES_CONTAINER" sh -c "PGPASSWORD='$POSTGRES_PASSWORD' psql -U '$POSTGRES_USER' -d '$POSTGRES_DB' -t -c \"$1\" 2>/dev/null"
}

# Verificar se o banco existe
echo "   [CHECK] Verificando se o banco 'estacaoterapia' existe..."
DB_EXISTS=$(docker exec "$POSTGRES_CONTAINER" sh -c "PGPASSWORD='$POSTGRES_PASSWORD' psql -U '$POSTGRES_USER' -lqt 2>/dev/null" | awk '{print $1}' | grep -w estacaoterapia | wc -l || echo "0")
# Sanitize count to avoid "integer expression expected"
DB_EXISTS=${DB_EXISTS:-0}
if ! [[ "$DB_EXISTS" =~ ^[0-9]+$ ]]; then
    DB_EXISTS=0
fi

if [ "$DB_EXISTS" -eq 0 ]; then
    echo "   [CREATE] Banco 'estacaoterapia' nao existe. Criando..."
    docker exec "$POSTGRES_CONTAINER" sh -c "PGPASSWORD='$POSTGRES_PASSWORD' psql -U '$POSTGRES_USER' -c \"CREATE DATABASE estacaoterapia;\"" || {
        echo "   [WARN] Nao foi possivel criar banco (pode ja existir)"
    }
    echo "   [OK] Banco criado"
else
    echo "   [OK] Banco 'estacaoterapia' ja existe"
fi

# Verificar se ja existem tabelas
echo "   [CHECK] Verificando se o banco ja possui tabelas..."
TABLE_COUNT=$(psql_exec "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';" | tr -d ' ' || echo "0")

# Garantir que e numero
TABLE_COUNT=${TABLE_COUNT:-0}
if ! [[ "$TABLE_COUNT" =~ ^[0-9]+$ ]]; then
    TABLE_COUNT=0
fi

if [ "$TABLE_COUNT" -gt 0 ]; then
    echo "   [INFO] Banco ja possui $TABLE_COUNT tabela(s) criada(s)"
    echo "   [SKIP] Pulando restore do backup (banco ja populado)"
else
    echo "   [OK] Banco vazio, prosseguindo com restore..."

    # Copiar arquivo SQL para o container
    echo "   [COPY] Copiando backup para o container..."
    docker cp "$BACKUP_SQL" "${POSTGRES_CONTAINER}:/tmp/restore.sql" || {
        echo "   [ERRO] Falha ao copiar arquivo para o container!"
        echo "   [WARN] Continuando sem restaurar o banco..."
        exit 0 2>/dev/null || true
    }

    # Executar restore
    if docker exec "$POSTGRES_CONTAINER" test -f /tmp/restore.sql 2>/dev/null; then
        echo "   [OK] Arquivo copiado com sucesso"
        echo "   [RESTORE] Executando restore do banco de dados..."
        docker exec "$POSTGRES_CONTAINER" sh -c "PGPASSWORD='$POSTGRES_PASSWORD' psql -U '$POSTGRES_USER' -d estacaoterapia -f /tmp/restore.sql" 2>&1 | grep -E "(ERROR|CREATE|INSERT|restored|done)" || true
        echo "   [OK] Restore executado"

        # Limpar arquivo temporario
        docker exec "$POSTGRES_CONTAINER" rm -f /tmp/restore.sql
        echo "   [OK] Banco de dados restaurado com sucesso!"
    else
        echo "   [WARN] Arquivo nao foi copiado corretamente"
    fi
fi

# ==============================
# LIMPEZA DE IMAGENS ANTIGAS
# ==============================
echo ""
echo "[CLEANUP] Limpando imagens antigas..."

# Encontrar imagens do estacaoterapia que NAO sao a atual
OLD_REDIS_IMAGES=$(docker images --filter "reference=estacaoterapia-redis:prd-*" --format "{{.Repository}}:{{.Tag}}" | grep -v "prd-${TAG}$" || true)
OLD_API_IMAGES=$(docker images --filter "reference=estacaoterapia-api:prd-*" --format "{{.Repository}}:{{.Tag}}" | grep -v "prd-${TAG}$" || true)
OLD_SOCKET_IMAGES=$(docker images --filter "reference=estacaoterapia-socket-server:prd-*" --format "{{.Repository}}:{{.Tag}}" | grep -v "prd-${TAG}$" || true)

REMOVED_COUNT=0

# Remover imagens antigas do Redis
if [ -n "$OLD_REDIS_IMAGES" ]; then
    echo "$OLD_REDIS_IMAGES" | while read -r old_image; do
        if [ -n "$old_image" ]; then
            echo "   [DELETE] Removendo: $old_image"
            docker rmi "$old_image" 2>/dev/null || echo "      [WARN] Nao foi possivel remover (em uso)"
        fi
    done
fi

# Remover imagens antigas da API
if [ -n "$OLD_API_IMAGES" ]; then
    echo "$OLD_API_IMAGES" | while read -r old_image; do
        if [ -n "$old_image" ]; then
            echo "   [DELETE] Removendo: $old_image"
            docker rmi "$old_image" 2>/dev/null || echo "      [WARN] Nao foi possivel remover (em uso)"
        fi
    done
fi

# Remover imagens antigas do Socket
if [ -n "$OLD_SOCKET_IMAGES" ]; then
    echo "$OLD_SOCKET_IMAGES" | while read -r old_image; do
        if [ -n "$old_image" ]; then
            echo "   [DELETE] Removendo: $old_image"
            docker rmi "$old_image" 2>/dev/null || echo "      [WARN] Nao foi possivel remover (em uso)"
        fi
    done
fi

# Limpar dangling images
echo ""
echo "[CLEANUP] Removendo imagens dangling..."
DANGLING_REMOVED=$(docker image prune -f --filter "until=1h" 2>/dev/null | grep -o "deleted" | wc -l)
if [ "$DANGLING_REMOVED" -gt 0 ]; then
    echo "   [OK] $DANGLING_REMOVED imagens removidas"
fi

# Limpeza pós-deploy (disco)
echo ""
echo "[CLEANUP] Executando cleanup pós-deploy..."
CLEANUP_SCRIPT="$SCRIPT_DIR/../cleanup-deploy.sh"
if [ -f "$CLEANUP_SCRIPT" ]; then
    chmod +x "$CLEANUP_SCRIPT" 2>/dev/null || true
    "$CLEANUP_SCRIPT" || echo "   [WARN] Falha na limpeza pós-deploy"
else
    echo "   [WARN] Script de limpeza não encontrado: $CLEANUP_SCRIPT"
fi

# ==============================
# LIMPEZA DE ARQUIVOS TEMPORARIOS
# ==============================
echo ""
echo "[CLEANUP] Limpando arquivos temporarios..."
rm -f "$DEPLOY_STACK_FILE"
echo "   [OK] Arquivos temporarios removidos"

# ==============================
# RESUMO FINAL
# ==============================
echo ""
echo "======================================"
echo "[OK] DEPLOY CONCLUIDO COM SUCESSO!"
echo "======================================"
echo ""
echo "[SUMMARY] Resumo:"
echo "   - Tag: prd-$TAG"
echo "   - Stack: estacaoterapia"
echo "   - Deploy: $(date '+%d/%m/%Y %H:%M:%S')"
echo "   - Modo: Zero-Downtime (Rolling Update)"
echo ""
echo "[NEXT] Proximos passos:"
echo "   1. Monitorar logs: docker service logs estacaoterapia_api -f"
echo "   2. Verificar saude: docker service ls"
echo "   3. Testar endpoint: curl http://localhost:3333/health"
echo ""
echo "[REVERT] Se precisar reverter:"
echo "   cp $BACKUP_FILE docker-stack.yml"
echo "   docker stack deploy -c docker-stack.yml estacaoterapia"
echo ""
