# 🔄 Script de Restauração do Banco de Dados

## 📋 Descrição

Script para restaurar o backup do banco de dados PostgreSQL quando a API for iniciada.

## 📁 Localização do Backup

O backup está em: `./api/backups/estacaoterapia_prd.sql`

## 🔧 Script de Restauração

Crie o arquivo `api/restore-database.sh` com o seguinte conteúdo:

```bash
#!/bin/bash
# ============================================
# Script para Restaurar Backup do Banco de Dados
# Restaura o arquivo estacaoterapia_prd.sql no banco estacaoterapia
# ============================================

set -euo pipefail

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
BACKUP_FILE="./backups/estacaoterapia_prd.sql"
DB_NAME="${POSTGRES_DB:-estacaoterapia}"
DB_USER="${POSTGRES_USER:-estacaoterapia}"
DB_PASSWORD="${POSTGRES_PASSWORD:-}"
DB_HOST="${POSTGRES_HOST:-postgres}"
DB_PORT="${POSTGRES_PORT:-5432}"

# Função de log
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Verificar se o arquivo de backup existe
if [ ! -f "$BACKUP_FILE" ]; then
    log_warning "Arquivo de backup não encontrado: $BACKUP_FILE"
    log_info "Pulando restauração do banco de dados..."
    exit 0
fi

log_info "Iniciando restauração do banco de dados..."
log_info "Backup: $BACKUP_FILE"
log_info "Banco: $DB_NAME"
log_info "Host: $DB_HOST:$DB_PORT"

# Aguardar PostgreSQL estar disponível
log_info "Aguardando PostgreSQL estar disponível..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if PGPASSWORD="$DB_PASSWORD" pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
        log_success "PostgreSQL está disponível!"
        break
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        log_error "PostgreSQL não está disponível após $MAX_RETRIES tentativas"
        exit 1
    fi
    
    log_info "Aguardando PostgreSQL... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

# Verificar se o banco de dados existe, se não, criar
log_info "Verificando se o banco de dados '$DB_NAME' existe..."
if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    log_warning "Banco de dados '$DB_NAME' não existe. Criando..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || true
    log_success "Banco de dados '$DB_NAME' criado!"
else
    log_success "Banco de dados '$DB_NAME' já existe"
fi

# Restaurar backup
log_info "Restaurando backup do banco de dados..."
if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_FILE" 2>&1; then
    log_success "Backup restaurado com sucesso!"
else
    log_error "Erro ao restaurar backup"
    exit 1
fi

# Verificar se a restauração foi bem-sucedida
TABLE_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "0")
log_success "Banco de dados restaurado! Total de tabelas: $TABLE_COUNT"

exit 0
```

## 📝 Integração no Deploy

Para integrar o script de restore no processo de deploy da API, você precisa:

### 1. Adicionar o script no deploy.sh

No arquivo `api/deploy.sh`, adicione a chamada do script de restore **antes** do deploy do stack:

```bash
# Restaurar banco de dados se backup existir
if [ -f "./backups/estacaoterapia_prd.sql" ]; then
    log_info "Restaurando backup do banco de dados..."
    chmod +x ./restore-database.sh 2>/dev/null || true
    ./restore-database.sh || log_warning "Erro ao restaurar backup, continuando deploy..."
fi
```

### 2. Alternativa: Integrar no entrypoint.sh

Se preferir restaurar sempre que o container iniciar, adicione no `api/entrypoint.sh`:

```bash
# Restaurar banco de dados se backup existir
if [ -f "/app/backups/estacaoterapia_prd.sql" ]; then
    echo "Restaurando backup do banco de dados..."
    /app/restore-database.sh || echo "Erro ao restaurar backup, continuando..."
fi
```

### 3. Para Docker Swarm

No `docker-stack.yml`, adicione o volume do backup:

```yaml
api:
  volumes:
    - type: bind
      source: ./backups
      target: /app/backups
      read_only: true
```

## 🚀 Uso Manual

Para executar o script manualmente:

```bash
cd api/
chmod +x restore-database.sh
./restore-database.sh
```

## ⚙️ Variáveis de Ambiente

O script usa as seguintes variáveis de ambiente (com valores padrão):

- `POSTGRES_DB`: Nome do banco de dados (padrão: `estacaoterapia`)
- `POSTGRES_USER`: Usuário do PostgreSQL (padrão: `estacaoterapia`)
- `POSTGRES_PASSWORD`: Senha do PostgreSQL (obrigatório)
- `POSTGRES_HOST`: Host do PostgreSQL (padrão: `postgres`)
- `POSTGRES_PORT`: Porta do PostgreSQL (padrão: `5432`)

## 🔍 Verificação

Após a restauração, verifique se os dados foram restaurados:

```bash
# Conectar ao banco de dados
docker exec -it estacao-postgres psql -U estacaoterapia -d estacaoterapia

# Verificar tabelas
\dt

# Verificar contagem de registros em uma tabela
SELECT COUNT(*) FROM "Consulta";
```

## 📝 Notas

- O script verifica se o backup existe antes de tentar restaurar
- O script aguarda o PostgreSQL estar disponível antes de tentar restaurar
- O script cria o banco de dados se ele não existir
- O script usa `pg_isready` para verificar se o PostgreSQL está pronto
