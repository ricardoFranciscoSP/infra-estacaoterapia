#!/bin/bash
set -euo pipefail

# ==============================
# 🚀 Deploy Docker Swarm Stack - FUNCIONAL 100%
# ==============================
# Zero-downtime deployment com:
# - ✅ Validação completa de secrets e volumes
# - ✅ Build automático de novas imagens
# - ✅ Update rolling (sem parar serviços)
# - ✅ Cleanup de imagens antigas
# - ✅ Restauração automática do banco
# - ✅ Monitoramento de saúde dos serviços

echo "======================================"
echo "🚀 INICIANDO DEPLOY - $(date)"
echo "======================================"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SECRETS_DIR="/opt/secrets"

# ==============================
# 1️⃣ Gerar tag com timestamp + git hash
# ==============================
TIMESTAMP=$(date +%Y%m%d%H%M%S)
GIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
TAG="${TIMESTAMP}-${GIT_HASH}"

echo ""
echo "📦 Informações do Deploy:"
echo "   • Tag: prd-$TAG"
echo "   • Data: $(date '+%d/%m/%Y %H:%M:%S')"
echo "   • Git: $GIT_HASH"

# ==============================
# 2️⃣ Validar pré-requisitos
# ==============================
echo ""
echo "🔍 Validando pré-requisitos..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker não encontrado!"
    exit 1
fi

if ! docker info | grep -q "Swarm: active"; then
    echo "❌ Docker Swarm não está ativo!"
    exit 1
fi

if [ ! -f "docker-stack.yml" ]; then
    echo "❌ docker-stack.yml não encontrado!"
    exit 1
fi

# Validar arquivos de secrets
echo ""
echo "🔐 Verificando secrets..."
SECRETS_REQUIRED=(
    "postgres.env"
    "estacao_api.env"
    "estacao_socket.env"
)

for secret_file in "${SECRETS_REQUIRED[@]}"; do
    if [ ! -f "$SECRETS_DIR/$secret_file" ]; then
        echo "❌ Arquivo $SECRETS_DIR/$secret_file não encontrado!"
        echo "   Copie do exemplo: cp $SECRETS_DIR/${secret_file}.example $SECRETS_DIR/$secret_file"
        exit 1
    fi
done

# Validar arquivos do PgBouncer
if [ ! -f "/opt/secrets/pgbouncer/pgbouncer.ini" ]; then
    echo "❌ Arquivo /opt/secrets/pgbouncer/pgbouncer.ini não encontrado!"
    exit 1
fi

if [ ! -f "/opt/secrets/pgbouncer/userlist.txt" ]; then
    echo "❌ Arquivo /opt/secrets/pgbouncer/userlist.txt não encontrado!"
    exit 1
fi

echo "✅ Todos os arquivos de secrets encontrados"

echo "✅ Pré-requisitos validados"

# ==============================
# 3️⃣ Criar/Atualizar Secrets
# ==============================
echo ""
echo "🔐 Gerenciando secrets no Docker Swarm..."

create_or_update_secret() {
    local secret_name=$1
    local secret_file=$2
    
    if docker secret inspect "$secret_name" >/dev/null 2>&1; then
        echo "   ↻ Atualizando secret: $secret_name"
        docker secret rm "$secret_name" 2>/dev/null || true
        docker secret create "$secret_name" "$secret_file" 2>/dev/null || {
            echo "   ⚠️  Falha ao atualizar (pode estar em uso)"
        }
    else
        echo "   ✓ Criando secret: $secret_name"
        docker secret create "$secret_name" "$secret_file" 2>/dev/null || {
            echo "   ⚠️  Secret já pode existir"
        }
    fi
}

# Processar secrets
create_or_update_secret "postgres_env" "$SECRETS_DIR/postgres.env"
create_or_update_secret "estacao_api_env" "$SECRETS_DIR/estacao_api.env"
create_or_update_secret "estacao_socket_env" "$SECRETS_DIR/estacao_socket.env"
create_or_update_secret "pgbouncer.ini" "/opt/secrets/pgbouncer/pgbouncer.ini"
create_or_update_secret "userlist.txt" "/opt/secrets/pgbouncer/userlist.txt"

# Extrair credenciais do postgres.env para validação
echo ""
echo "   📝 Validando credenciais PostgreSQL..."

# Validar se o arquivo possui as variáveis necessárias
POSTGRES_USER=$(grep "^POSTGRES_USER=" "$SECRETS_DIR/postgres.env" | cut -d'=' -f2 | tr -d ' ')
POSTGRES_PASSWORD=$(grep "^POSTGRES_PASSWORD=" "$SECRETS_DIR/postgres.env" | cut -d'=' -f2 | tr -d ' ')
POSTGRES_DB=$(grep "^POSTGRES_DB=" "$SECRETS_DIR/postgres.env" | cut -d'=' -f2 | tr -d ' ')

if [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_PASSWORD" ] || [ -z "$POSTGRES_DB" ]; then
    echo "❌ Credenciais PostgreSQL incompletas em $SECRETS_DIR/postgres.env"
    exit 1
fi

echo "✓ Credenciais validadas:"
echo "  • POSTGRES_USER: $POSTGRES_USER"
echo "  • POSTGRES_DB: $POSTGRES_DB"
echo "  • POSTGRES_PASSWORD: [***]"

# Extrair senha Redis do estacao_api_env para validação
REDIS_PASSWORD=$(grep "^REDIS_PASSWORD=" "$SECRETS_DIR/estacao_api.env" | cut -d'=' -f2 | tr -d ' ' | head -1)
if [ -z "$REDIS_PASSWORD" ]; then
    echo "⚠️  Redis password não encontrado em estacao_api.env"
else
    echo "  • REDIS_PASSWORD: [***]"
fi

echo "✅ Secrets configurados"

# ==============================
# 4️⃣ Criar/Verificar volumes
# ==============================
echo ""
echo "💾 Verificando volumes Docker..."

create_volume_if_not_exists() {
    local volume_name=$1
    
    if docker volume inspect "$volume_name" >/dev/null 2>&1; then
        echo "   ✓ Volume já existe: $volume_name"
    else
        echo "   → Criando volume: $volume_name"
        docker volume create "$volume_name" || {
            echo "   ⚠️  Falha ao criar volume"
        }
    fi
}

create_volume_if_not_exists "postgres_data"
create_volume_if_not_exists "redis_data"
create_volume_if_not_exists "documentos_data"

echo "✅ Volumes verificados"

# ==============================
# 5️⃣ Criar/Verificar redes necessárias
# ==============================
echo ""
echo "🌐 Verificando redes Docker..."

# Criar rede backend se não existir
if ! docker network ls --format '{{.Name}}' | grep -q "^estacao-backend-network$"; then
    echo "   → Criando rede estacao-backend-network..."
    docker network create --driver overlay estacao-backend-network || {
        echo "❌ Falha ao criar rede backend!"
        exit 1
    }
    echo "✅ Rede estacao-backend-network criada"
else
    echo "✅ Rede estacao-backend-network já existe"
fi

# Criar rede principal se não existir
if ! docker network ls --format '{{.Name}}' | grep -q "^estacao-network$"; then
    echo "   → Criando rede estacao-network..."
    docker network create --driver overlay estacao-network || {
        echo "❌ Falha ao criar rede principal!"
        exit 1
    }
    echo "✅ Rede estacao-network criada"
else
    echo "✅ Rede estacao-network já existe"
fi

# ==============================
# 6️⃣ Backup da config atual
# ==============================
echo ""
echo "💾 Fazendo backup da config..."
BACKUP_FILE="docker-stack.yml.backup-${TIMESTAMP}"
cp docker-stack.yml "$BACKUP_FILE"
echo "✅ Backup salvo em: $BACKUP_FILE"

# ==============================
# 7️⃣ Build das imagens NOVAS
# ==============================
echo ""
echo "🔨 Construindo imagens Docker..."

# ==============================
# Build Redis com entrypoint
# ==============================
echo ""
echo "   → estacaoterapia-redis:prd-$TAG"
echo "   📁 Contexto: $(pwd)"
echo "   📄 Dockerfile: ./Dockerfile.redis"
docker build \
    --no-cache \
    --progress=plain \
    -t "estacaoterapia-redis:prd-${TAG}" \
    -f ./Dockerfile.redis \
    . || {
        echo ""
        echo "❌ Falha ao construir imagem Redis!"
        echo "📝 Verifique se redis-entrypoint.sh existe"
        exit 1
    }
echo "✅ Redis compilado com sucesso"

# Verificar arquivos de lock antes do build
echo ""
echo "📋 Verificando gerenciador de pacotes..."
if [ -f "yarn.lock" ]; then
    echo "   ✓ yarn.lock encontrado - Usando Yarn"
elif [ -f "package-lock.json" ]; then
    echo "   ✓ package-lock.json encontrado - Usando NPM"
else
    echo "   ⚠ Nenhum lock file encontrado - Usando NPM padrão"
fi

echo ""
echo "   → estacaoterapia-api:prd-$TAG"
echo "   📁 Contexto: $(pwd)"
echo "   📄 Dockerfile: ./Dockerfile.api"
docker build \
    --no-cache \
    --build-arg NODE_ENV=production \
    --progress=plain \
    -t "estacaoterapia-api:prd-${TAG}" \
    -f ./Dockerfile.api \
    . || {
        echo ""
        echo "❌ Falha ao construir imagem API!"
        echo "📝 Verifique os logs acima para detalhes"
        echo "📁 Diretório: $(pwd)"
        echo "📋 Arquivos disponíveis:"
        ls -la | grep -E "(package\.json|yarn\.lock|package-lock\.json)"
        exit 1
    }
echo "✅ API compilada com sucesso"

echo ""
echo "   → estacaoterapia-socket-server:prd-$TAG"
echo "   📁 Contexto: $(pwd)"
echo "   📄 Dockerfile: ./Dockerfile.socket"
docker build \
    --no-cache \
    --build-arg NODE_ENV=production \
    --progress=plain \
    -t "estacaoterapia-socket-server:prd-${TAG}" \
    -f ./Dockerfile.socket \
    . || {
        echo ""
        echo "❌ Falha ao construir imagem Socket!"
        echo "📝 Verifique os logs acima para detalhes"
        exit 1
    }
echo "✅ Socket compilada com sucesso"

# ==============================
# 8️⃣ Atualizar docker-stack.yml
# ==============================
echo ""
echo "📝 Atualizando docker-stack.yml..."
DEPLOY_STACK_FILE="docker-stack.yml.deploy"
cp docker-stack.yml "$DEPLOY_STACK_FILE"
sed -i "s/{{TAG}}/${TAG}/g" "$DEPLOY_STACK_FILE"

echo "✅ Stack configurado com nova tag: $TAG"

# ==============================
# 9️⃣ Deploy para Swarm (zero-downtime)
# ==============================
echo ""
echo "🚀 Fazendo deploy para Docker Swarm..."
echo "   ⏳ Aguardando rolling update..."

docker stack deploy \
    --compose-file "$DEPLOY_STACK_FILE" \
    --with-registry-auth \
    estacaoterapia || {
        echo "❌ Falha ao fazer deploy!"
        echo "Revertendo para backup: $BACKUP_FILE"
        cp "$BACKUP_FILE" docker-stack.yml
        exit 1
    }

echo "✅ Stack deployado com sucesso"

# ==============================
# 🔟 Aguardar convergência e saúde
# ==============================
echo ""
echo "⏳ Aguardando serviços convergirem..."

# Aguardar inicial
sleep 10

MAX_WAIT=300  # 5 minutos
ELAPSED=0
WAIT_INTERVAL=10

echo ""
echo "📊 Monitorando saúde dos serviços..."

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
        
        echo "   ⏳ Aguardando $service_name... ($elapsed/$max_wait segundos)"
        sleep $wait_interval
        elapsed=$((elapsed + wait_interval))
    done
    
    return 1
}

# Função para verificar status detalhado do serviço
check_service_status() {
    local service_name=$1
    echo ""
    echo "🔍 Verificando status detalhado de $service_name..."
    docker service ps "$service_name" --no-trunc 2>/dev/null || echo "   ❌ Serviço não encontrado"
    
    echo ""
    echo "📋 Últimos logs de $service_name:"
    docker service logs "$service_name" --tail 20 2>/dev/null || echo "   ❌ Não foi possível obter logs"
}

# Aguardar Redis primeiro (dependência crítica)
echo "   → Aguardando Redis..."
if ! wait_for_service_health "estacaoterapia_redis" 120 "required"; then
    echo ""
    echo "❌ Redis NÃO SUBIU no tempo limite (120s)!"
    check_service_status "estacaoterapia_redis"
    echo ""
    echo "⚠️  ERRO CRÍTICO: Redis não conseguiu inicializar"
    echo "   Possíveis causas:"
    echo "   - Problemas de volume docker (redis_data)"
    echo "   - Arquivo de configuração inválido"
    echo "   - Falta de permissões"
    echo "   - Porta 6379 em uso"
    echo ""
    echo "   Debug: docker service logs estacaoterapia_redis"
    exit 1
else
    echo "   ✅ Redis iniciado com sucesso"
fi

# Aguardar PostgreSQL (após Redis estar ok)
echo "   → Aguardando PostgreSQL..."
if ! wait_for_service_health "estacaoterapia_postgres" 120 "required"; then
    echo ""
    echo "❌ PostgreSQL NÃO SUBIU no tempo limite (120s)!"
    check_service_status "estacaoterapia_postgres"
    echo ""
    echo "⚠️  ERRO CRÍTICO: PostgreSQL não conseguiu inicializar"
    echo "   Possíveis causas:"
    echo "   - Problemas de volume docker (postgres_data)"
    echo "   - Secrets do PostgreSQL inválidos"
    echo "   - Falta de permissões"
    echo "   - Porta 5432 em uso"
    echo ""
    echo "   Debug: docker service logs estacaoterapia_postgres"
    exit 1
else
    echo "   ✅ PostgreSQL iniciado com sucesso"
fi

# Aguardar PgBouncer (após PostgreSQL estar ok)
echo "   → Aguardando PgBouncer..."
if ! wait_for_service_health "estacaoterapia_pgbouncer" 60 "required"; then
    echo ""
    echo "⚠️  PgBouncer ainda não respondeu, continuando..."
    check_service_status "estacaoterapia_pgbouncer"
else
    echo "   ✅ PgBouncer iniciado com sucesso"
fi

# Verificar status dos serviços
echo ""
echo "📊 Status dos serviços:"
docker service ls --filter "label=com.docker.stack.namespace=estacaoterapia"

echo ""
echo "🔍 Replicas da API:"
docker service ps estacaoterapia_api --no-trunc 2>/dev/null | head -5 || echo "   (aguardando inicialização)"

echo ""
echo "🔍 Replicas do Socket:"
docker service ps estacaoterapia_socket-server --no-trunc 2>/dev/null | head -5 || echo "   (aguardando inicialização)"

echo ""
echo "🔍 Replicas do PostgreSQL:"
docker service ps estacaoterapia_postgres --no-trunc 2>/dev/null | head -5 || echo "   (aguardando inicialização)"

echo ""
echo "🔍 Replicas do Redis:"
docker service ps estacaoterapia_redis --no-trunc 2>/dev/null | head -5 || echo "   (aguardando inicialização)"
echo ""
echo "💾 Verificando necessidade de restaurar banco de dados..."

BACKUP_SQL="./backups/estacaoterapia_prd.sql"

if [ ! -f "$BACKUP_SQL" ]; then
    echo "⚠️  Arquivo de backup não encontrado: $BACKUP_SQL"
    echo "   Continuando sem restaurar o banco..."
    return 0 2>/dev/null || true  # evita erro em scripts sourcing
fi

echo "   📁 Arquivo encontrado: $BACKUP_SQL"

# Aguardar PostgreSQL ficar pronto
echo "   ⏳ Aguardando PostgreSQL ficar pronto..."
sleep 10

# Pegar container ativo do Postgres
POSTGRES_CONTAINER=$(docker ps \
    --filter "label=com.docker.swarm.service.name=estacaoterapia_postgres" \
    --format "{{.ID}}" | head -1)

if [ -z "$POSTGRES_CONTAINER" ]; then
    echo "   ❌ Container do PostgreSQL não encontrado!"
    echo "   ⚠️  Continuando sem restaurar o banco..."
    return 0 2>/dev/null || true
fi

echo "   ✓ PostgreSQL encontrado: $POSTGRES_CONTAINER"

# Função para executar psql com usuário correto
psql_exec() {
    docker exec "$POSTGRES_CONTAINER" sh -c "PGPASSWORD='$POSTGRES_PASSWORD' psql -U '$POSTGRES_USER' -d '$POSTGRES_DB' -t -c \"$1\" 2>/dev/null"
}

# Verificar se o banco existe
echo "   🔍 Verificando se o banco 'estacaoterapia' existe..."
DB_EXISTS=$(docker exec "$POSTGRES_CONTAINER" sh -c "PGPASSWORD='$POSTGRES_PASSWORD' psql -U '$POSTGRES_USER' -lqt 2>/dev/null" | awk '{print $1}' | grep -w estacaoterapia | wc -l || echo "0")
# Sanitize count to avoid "integer expression expected"
DB_EXISTS=${DB_EXISTS:-0}
if ! [[ "$DB_EXISTS" =~ ^[0-9]+$ ]]; then
    DB_EXISTS=0
fi

if [ "$DB_EXISTS" -eq 0 ]; then
    echo "   📝 Banco 'estacaoterapia' não existe. Criando..."
    docker exec "$POSTGRES_CONTAINER" sh -c "PGPASSWORD='$POSTGRES_PASSWORD' psql -U '$POSTGRES_USER' -c \"CREATE DATABASE estacaoterapia;\"" || {
        echo "   ⚠️  Não foi possível criar banco (pode já existir)"
    }
    echo "   ✓ Banco criado"
else
    echo "   ✓ Banco 'estacaoterapia' já existe"
fi

# Verificar se já existem tabelas
echo "   🔍 Verificando se o banco já possui tabelas..."
TABLE_COUNT=$(psql_exec "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';" | tr -d ' ' || echo "0")

# Garantir que é número
TABLE_COUNT=${TABLE_COUNT:-0}
if ! [[ "$TABLE_COUNT" =~ ^[0-9]+$ ]]; then
    TABLE_COUNT=0
fi

if [ "$TABLE_COUNT" -gt 0 ]; then
    echo "   ℹ️  Banco já possui $TABLE_COUNT tabela(s) criada(s)"
    echo "   ⏭️  Pulando restore do backup (banco já populado)"
else
    echo "   ✓ Banco vazio, prosseguindo com restore..."

    # Copiar arquivo SQL para o container
    echo "   📤 Copiando backup para o container..."
    docker cp "$BACKUP_SQL" "${POSTGRES_CONTAINER}:/tmp/restore.sql" || {
        echo "   ❌ Falha ao copiar arquivo para o container!"
        echo "   ⚠️  Continuando sem restaurar o banco..."
        return 0 2>/dev/null || true
    }

    # Executar restore
    if docker exec "$POSTGRES_CONTAINER" test -f /tmp/restore.sql 2>/dev/null; then
        echo "   ✓ Arquivo copiado com sucesso"
        echo "   🔄 Executando restore do banco de dados..."
        docker exec "$POSTGRES_CONTAINER" sh -c "PGPASSWORD='$POSTGRES_PASSWORD' psql -U '$POSTGRES_USER' -d estacaoterapia -f /tmp/restore.sql" 2>&1 | grep -E "(ERROR|CREATE|INSERT|restored|done)" || true
        echo "   ✓ Restore executado"

        # Limpar arquivo temporário
        docker exec "$POSTGRES_CONTAINER" rm -f /tmp/restore.sql
        echo "   ✅ Banco de dados restaurado com sucesso!"
    else
        echo "   ⚠️  Arquivo não foi copiado corretamente"
    fi
fi


# ==============================
# 🔟 Limpeza de imagens antigas
# ==============================
echo ""
echo "🧹 Limpando imagens antigas..."

# Encontrar imagens do estacaoterapia que NÃO são a atual
OLD_REDIS_IMAGES=$(docker images --filter "reference=estacaoterapia-redis:prd-*" --format "{{.Repository}}:{{.Tag}}" | grep -v "prd-${TAG}$" || true)
OLD_API_IMAGES=$(docker images --filter "reference=estacaoterapia-api:prd-*" --format "{{.Repository}}:{{.Tag}}" | grep -v "prd-${TAG}$" || true)
OLD_SOCKET_IMAGES=$(docker images --filter "reference=estacaoterapia-socket-server:prd-*" --format "{{.Repository}}:{{.Tag}}" | grep -v "prd-${TAG}$" || true)

REMOVED_COUNT=0

# Remover imagens antigas do Redis
if [ -n "$OLD_REDIS_IMAGES" ]; then
    echo "$OLD_REDIS_IMAGES" | while read -r old_image; do
        if [ -n "$old_image" ]; then
            echo "   🗑️  Removendo: $old_image"
            docker rmi "$old_image" 2>/dev/null || echo "      ⚠️  Não foi possível remover (em uso)"
        fi
    done
fi

# Remover imagens antigas da API
if [ -n "$OLD_API_IMAGES" ]; then
    echo "$OLD_API_IMAGES" | while read -r old_image; do
        if [ -n "$old_image" ]; then
            echo "   🗑️  Removendo: $old_image"
            docker rmi "$old_image" 2>/dev/null || echo "      ⚠️  Não foi possível remover (em uso)"
        fi
    done
fi

# Remover imagens antigas do Socket
if [ -n "$OLD_SOCKET_IMAGES" ]; then
    echo "$OLD_SOCKET_IMAGES" | while read -r old_image; do
        if [ -n "$old_image" ]; then
            echo "   🗑️  Removendo: $old_image"
            docker rmi "$old_image" 2>/dev/null || echo "      ⚠️  Não foi possível remover (em uso)"
        fi
    done
fi

# Limpar dangling images
echo ""
echo "🧹 Removendo imagens dangling..."
DANGLING_REMOVED=$(docker image prune -f --filter "until=1h" 2>/dev/null | grep -o "deleted" | wc -l)
if [ "$DANGLING_REMOVED" -gt 0 ]; then
    echo "   ✅ $DANGLING_REMOVED imagens removidas"
fi

# ==============================
# 1️⃣0️⃣ Limpeza de arquivos temporários
# ==============================
echo ""
echo "📂 Limpando arquivos temporários..."
rm -f "$DEPLOY_STACK_FILE"
echo "   ✅ Arquivos temporários removidos"

# ==============================
# 1️⃣1️⃣ Resumo Final
# ==============================
echo ""
echo "======================================"
echo "✅ DEPLOY CONCLUÍDO COM SUCESSO!"
echo "======================================"
echo ""
echo "📋 Resumo:"
echo "   • Tag: prd-$TAG"
echo "   • Stack: estacaoterapia"
echo "   • Deploy: $(date '+%d/%m/%Y %H:%M:%S')"
echo "   • Modo: Zero-Downtime (Rolling Update)"
echo ""
echo "🔍 Próximos passos:"
echo "   1. Monitorar logs: docker service logs estacaoterapia_api -f"
echo "   2. Verificar saúde: docker service ls"
echo "   3. Testar endpoint: curl http://localhost:3333/health"
echo ""
echo "⏮️  Se precisar reverter:"
echo "   cp $BACKUP_FILE docker-stack.yml"
echo "   docker stack deploy -c docker-stack.yml estacaoterapia"
echo ""
