#!/bin/bash
###############################################################################
# prepare-deploy.sh - Prepara ambiente para deploy
# Garante que todos os scripts tenham permissão de execução
###############################################################################

set -e

echo "🔧 Preparando ambiente para deploy..."
echo ""
echo "📂 Diretório atual: $(pwd)"
echo ""

# Detecta estrutura do projeto
if [ -f "api/deploy.sh" ]; then
    echo "✓ Estrutura detectada: Raiz com api/ e estacao/"
    API_PATH="api"
    ESTACAO_PATH="estacao"
elif [ -f "deploy.sh" ] && [ -f "docker-stack.yml" ]; then
    echo "✓ Estrutura detectada: Dentro do diretório api/"
    API_PATH="."
    ESTACAO_PATH="../estacao"
elif [ -f "deploy-stack.sh" ]; then
    echo "✓ Estrutura detectada: Dentro do diretório estacao/"
    API_PATH="../api"
    ESTACAO_PATH="."
else
    echo "❌ Estrutura não reconhecida!"
    echo "   Execute este script no diretório raiz do projeto"
    ls -la
    exit 1
fi

# Lista de scripts que devem ser executáveis
declare -A SCRIPTS=(
    ["deploy-all.sh"]="."
    ["start.sh"]="."
    ["prepare-deploy.sh"]="."
    ["api/deploy.sh"]="$API_PATH"
    ["api/entrypoint.sh"]="$API_PATH"
    ["api/cleanup-old-replicas.sh"]="$API_PATH"
    ["estacao/deploy.sh"]="$ESTACAO_PATH"
    ["estacao/deploy-stack.sh"]="$ESTACAO_PATH"
    ["estacao/diagnose-service.sh"]="$ESTACAO_PATH"
    ["estacao/diagnose-traefik.sh"]="$ESTACAO_PATH"
    ["estacao/get-latest-tag.sh"]="$ESTACAO_PATH"
    ["estacao/validate-deployment.sh"]="$ESTACAO_PATH"
)

# Contador
TOTAL=0
SUCCESS=0
NOTFOUND=0

echo ""
echo "📋 Verificando e ajustando permissões..."
echo ""

# Scripts na raiz
for script in deploy-all.sh start.sh prepare-deploy.sh; do
    TOTAL=$((TOTAL + 1))
    if [ -f "$script" ]; then
        chmod +x "$script" 2>/dev/null && {
            echo "  ✅ $script"
            SUCCESS=$((SUCCESS + 1))
        } || {
            echo "  ⚠️  $script (falha ao dar permissão)"
        }
    else
        echo "  ⏭️  $script (não encontrado)"
        NOTFOUND=$((NOTFOUND + 1))
    fi
done

# Scripts da API
if [ -d "$API_PATH" ]; then
    echo ""
    echo "📦 Scripts da API ($API_PATH):"
    for script in deploy.sh entrypoint.sh cleanup-old-replicas.sh; do
        TOTAL=$((TOTAL + 1))
        file_path="$API_PATH/$script"
        if [ -f "$file_path" ]; then
            chmod +x "$file_path" 2>/dev/null && {
                echo "  ✅ $script"
                SUCCESS=$((SUCCESS + 1))
            } || {
                echo "  ⚠️  $script (falha ao dar permissão)"
            }
        else
            echo "  ⏭️  $script (não encontrado)"
            NOTFOUND=$((NOTFOUND + 1))
        fi
    done
fi

# Scripts do Frontend
if [ -d "$ESTACAO_PATH" ]; then
    echo ""
    echo "🎨 Scripts do Frontend ($ESTACAO_PATH):"
    for script in deploy.sh deploy-stack.sh diagnose-service.sh diagnose-traefik.sh get-latest-tag.sh validate-deployment.sh; do
        TOTAL=$((TOTAL + 1))
        file_path="$ESTACAO_PATH/$script"
        if [ -f "$file_path" ]; then
            chmod +x "$file_path" 2>/dev/null && {
                echo "  ✅ $script"
                SUCCESS=$((SUCCESS + 1))
            } || {
                echo "  ⚠️  $script (falha ao dar permissão)"
            }
        else
            echo "  ⏭️  $script (não encontrado)"
            NOTFOUND=$((NOTFOUND + 1))
        fi
    done
fi

echo ""
echo "═══════════════════════════════════════════"
echo "📊 Resumo:"
echo "   Total verificados: $TOTAL"
echo "   ✅ Preparados: $SUCCESS"
echo "   ⏭️  Não encontrados: $NOTFOUND"
echo "═══════════════════════════════════════════"

if [ "$SUCCESS" -gt 0 ]; then
    echo ""
    echo "✅ Ambiente preparado!"
    echo ""
    echo "🚀 Próximo passo:"
    if [ -f "deploy-all.sh" ]; then
        echo "   ./deploy-all.sh"
    elif [ -f "../deploy-all.sh" ]; then
        echo "   cd .. && ./deploy-all.sh"
    fi
fi
