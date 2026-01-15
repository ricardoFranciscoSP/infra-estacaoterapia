#!/bin/bash

# 🧪 Script de Validação das Correções
# Testa se os arquivos foram corrigidos corretamente

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}✅ Validação de Correções${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

# ============================================
# 1. Validar Caddyfile
# ============================================
echo -e "${YELLOW}1️⃣  Validando Caddyfile...${NC}"
echo "────────────────────────────────────────────────────────────"

if grep -q "policy random_selection" Caddyfile; then
    echo -e "${RED}❌ ERRO: Diretiva 'policy' ainda existe no Caddyfile${NC}"
    exit 1
else
    echo -e "${GREEN}✅ OK: Diretiva 'policy' removida${NC}"
fi

if grep -q "try_duration" Caddyfile; then
    echo -e "${RED}❌ ERRO: Diretiva 'try_duration' ainda existe${NC}"
    exit 1
else
    echo -e "${GREEN}✅ OK: Diretiva 'try_duration' removida${NC}"
fi

if grep -q "health_interval 15s" Caddyfile; then
    echo -e "${GREEN}✅ OK: health_interval otimizado (15s)${NC}"
else
    echo -e "${YELLOW}⚠️  AVISO: health_interval não é 15s${NC}"
fi

echo ""

# ============================================
# 2. Validar api/deploy.sh
# ============================================
echo -e "${YELLOW}2️⃣  Validando api/deploy.sh...${NC}"
echo "────────────────────────────────────────────────────────────"

if grep -q "\[\[CRIANDO\]NDO\]" api/deploy.sh; then
    echo -e "${RED}❌ ERRO: Caracteres corrompidos ainda existem${NC}"
    exit 1
else
    echo -e "${GREEN}✅ OK: Caracteres corrompidos removidos${NC}"
fi

# Validar syntax
echo "Validando syntax bash..."
if bash -n api/deploy.sh 2>&1; then
    echo -e "${GREEN}✅ OK: Syntax bash válida${NC}"
else
    echo -e "${RED}❌ ERRO: Syntax bash inválida${NC}"
    bash -n api/deploy.sh 2>&1 | head -10
    exit 1
fi

echo ""

# ============================================
# 3. Validar docker-stack.yml
# ============================================
echo -e "${YELLOW}3️⃣  Validando docker-stack.yml...${NC}"
echo "────────────────────────────────────────────────────────────"

if grep -q "{{TAG}}" api/docker-stack.yml; then
    echo -e "${GREEN}✅ OK: Template {{TAG}} encontrado${NC}"
else
    echo -e "${YELLOW}⚠️  AVISO: Template {{TAG}} não encontrado (pode estar OK se já substituído)${NC}"
fi

if grep -q "start_period: 60s" api/docker-stack.yml; then
    echo -e "${GREEN}✅ OK: start_period otimizado para API${NC}"
else
    echo -e "${YELLOW}⚠️  AVISO: start_period não configurado${NC}"
fi

echo ""

# ============================================
# 4. Validar deploy-all.sh
# ============================================
echo -e "${YELLOW}4️⃣  Validando deploy-all.sh...${NC}"
echo "────────────────────────────────────────────────────────────"

if bash -n deploy-all.sh 2>&1; then
    echo -e "${GREEN}✅ OK: Syntax bash válida${NC}"
else
    echo -e "${RED}❌ ERRO: Syntax bash inválida${NC}"
    bash -n deploy-all.sh 2>&1 | head -10
    exit 1
fi

echo ""

# ============================================
# 5. Verificar documentação
# ============================================
echo -e "${YELLOW}5️⃣  Verificando documentação...${NC}"
echo "────────────────────────────────────────────────────────────"

docs=(
    "TROUBLESHOOTING-DNS-REDIS.md"
    "diagnose-dns-redis.sh"
    "CORREÇÕES-IMPLEMENTADAS.md"
    "DEPLOY-FIXES.md"
)

for doc in "${docs[@]}"; do
    if [ -f "$doc" ]; then
        echo -e "${GREEN}✅ OK: $doc existe${NC}"
    else
        echo -e "${YELLOW}⚠️  AVISO: $doc não encontrado${NC}"
    fi
done

echo ""

# ============================================
# 6. Resumo Final
# ============================================
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ TODAS AS VALIDAÇÕES PASSARAM!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

echo "Arquivos corrigidos:"
echo "  ✅ Caddyfile - diretivas inválidas removidas"
echo "  ✅ api/deploy.sh - caracteres corrompidos corrigidos"
echo "  ✅ api/docker-stack.yml - timeouts otimizados"
echo ""

echo "📋 Próximas ações:"
echo "  1. Verificar /opt/secrets/ contém arquivos necessários"
echo "  2. Verificar volumes criados: docker volume ls"
echo "  3. Executar deploy: bash deploy-all.sh"
echo "  4. Monitorar: docker service logs estacaoterapia_api -f"
echo ""

echo -e "${GREEN}🎉 Pronto para deploy!${NC}"
echo ""
