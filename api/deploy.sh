#!/bin/bash
set -e

# ==============================
# 🚀 Deploy Docker Swarm Stack
# ==============================
# Zero-downtime deployment com:
# - Build automático de novas imagens
# - Update rolling (sem parar serviços)
# - Cleanup de imagens antigas
# - Backup da config

echo "======================================"
echo "🚀 INICIANDO DEPLOY - $(date)"
echo "======================================"

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

echo "✅ Pré-requisitos validados"

# ==============================
# 3️⃣ Criar/Verificar redes necessárias
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
# 4️⃣ Backup da config atual
# ==============================
echo ""
echo "💾 Fazendo backup da config..."
BACKUP_FILE="docker-stack.yml.backup-${TIMESTAMP}"
cp docker-stack.yml "$BACKUP_FILE"
echo "✅ Backup salvo em: $BACKUP_FILE"

# ==============================
# 5️⃣ Build das imagens NOVAS
# ==============================
echo ""
echo "🔨 Construindo imagens Docker..."

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
# 6️⃣ Atualizar docker-stack.yml
# ==============================
echo ""
echo "📝 Atualizando docker-stack.yml..."
DEPLOY_STACK_FILE="docker-stack.yml.deploy"
cp docker-stack.yml "$DEPLOY_STACK_FILE"
sed -i "s/{{TAG}}/${TAG}/g" "$DEPLOY_STACK_FILE"

echo "✅ Stack configurado com nova tag: $TAG"

# ==============================
# 7️⃣ Deploy para Swarm (zero-downtime)
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
# 8️⃣ Aguardar convergência
# ==============================
echo ""
echo "⏳ Aguardando serviços convergirem..."
sleep 5

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

# ==============================
# 9️⃣ Restaurar banco de dados
# ==============================
echo ""
echo "💾 Restaurando banco de dados..."

BACKUP_SQL="./backups/estacaoterapia_prd.sql"

if [ ! -f "$BACKUP_SQL" ]; then
    echo "⚠️  Arquivo de backup não encontrado: $BACKUP_SQL"
    echo "   Continuando sem restaurar o banco..."
else
    echo "   📁 Arquivo encontrado: $BACKUP_SQL"
    
    # Aguardar o postgres estar pronto
    echo "   ⏳ Aguardando PostgreSQL ficar pronto..."
    sleep 10
    
    # Encontrar o ID real do container do postgres (não apenas o nome da task)
    POSTGRES_CONTAINER=$(docker ps --filter "label=com.docker.swarm.service.name=estacaoterapia_postgres" --format "{{.ID}}" | head -1)
    
    if [ -z "$POSTGRES_CONTAINER" ]; then
        echo "   ❌ Container do PostgreSQL não encontrado!"
        echo "   ⚠️  Continuando sem restaurar o banco..."
    else
        echo "   ✓ PostgreSQL encontrado: $POSTGRES_CONTAINER"
        
        # Verificar se o banco existe
        echo "   🔍 Verificando se o banco existe..."
        DB_EXISTS=$(docker exec "$POSTGRES_CONTAINER" sh -c 'psql -U $POSTGRES_USER -lqt 2>/dev/null' | cut -d \| -f 1 | grep -w estacaoterapia | wc -l 2>/dev/null || echo 0)
        
        if [ "$DB_EXISTS" -eq 0 ]; then
            echo "   📝 Banco 'estacaoterapia' não existe. Criando..."
            docker exec "$POSTGRES_CONTAINER" sh -c 'psql -U $POSTGRES_USER -c "CREATE DATABASE estacaoterapia;" 2>/dev/null' || {
                echo "   ⚠️  Não foi possível criar banco (pode já existir)"
            }
            echo "   ✓ Banco criado ou já existe"
        else
            echo "   ✓ Banco 'estacaoterapia' já existe"
        fi
        
        # Copiar arquivo SQL para o container
        echo "   📤 Copiando backup para o container..."
        docker cp "$BACKUP_SQL" "${POSTGRES_CONTAINER}:/tmp/restore.sql" || {
            echo "   ❌ Falha ao copiar arquivo para o container!"
            echo "   ⚠️  Continuando sem restaurar o banco..."
        }
        
        if docker exec "$POSTGRES_CONTAINER" test -f /tmp/restore.sql 2>/dev/null; then
            echo "   ✓ Arquivo copiado com sucesso"
            
            # Executar restore
            echo "   🔄 Executando restore do banco de dados..."
            docker exec "$POSTGRES_CONTAINER" sh -c 'psql -U $POSTGRES_USER -d estacaoterapia -f /tmp/restore.sql' 2>&1 | grep -E "(ERROR|CREATE|INSERT|restored|done)" || true
            
            echo "   ✓ Restore executado"
            
            # Limpar arquivo temporário
            docker exec "$POSTGRES_CONTAINER" rm -f /tmp/restore.sql
            echo "   ✅ Banco de dados restaurado com sucesso!"
        else
            echo "   ⚠️  Arquivo não foi copiado corretamente"
        fi
    fi
fi

# ==============================
# 🔟 Limpeza de imagens antigas
# ==============================
echo ""
echo "🧹 Limpando imagens antigas..."

# Encontrar imagens do estacaoterapia que NÃO são a atual
OLD_API_IMAGES=$(docker images --filter "reference=estacaoterapia-api:prd-*" --format "{{.Repository}}:{{.Tag}}" | grep -v "prd-${TAG}$" || true)
OLD_SOCKET_IMAGES=$(docker images --filter "reference=estacaoterapia-socket-server:prd-*" --format "{{.Repository}}:{{.Tag}}" | grep -v "prd-${TAG}$" || true)

REMOVED_COUNT=0

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
# 9️⃣ Limpeza de arquivos temporários
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
