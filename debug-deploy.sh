#!/bin/bash
###############################################################################
# debug-deploy.sh - Debug para identificar problemas com deploy
###############################################################################

echo "🔍 DEBUG - Estrutura de Deploy"
echo "════════════════════════════════════════"
echo ""

echo "📂 Diretório atual:"
pwd
echo ""

echo "📋 Conteúdo do diretório atual:"
ls -lah
echo ""

echo "═══ API ═══"
echo "Verificando: ./api/"
if [ -d "api" ]; then
    echo "✅ Diretório api/ existe"
    echo ""
    echo "Scripts .sh em api/:"
    ls -lah api/*.sh 2>/dev/null || echo "Nenhum script encontrado"
    echo ""
    echo "Dockerfiles em api/:"
    ls -lah api/Dockerfile* 2>/dev/null || echo "Nenhum Dockerfile encontrado"
    echo ""
    echo "docker-stack.yml:"
    ls -lah api/docker-stack.yml 2>/dev/null || echo "docker-stack.yml não encontrado"
else
    echo "❌ Diretório api/ NÃO existe"
fi
echo ""

echo "═══ ESTACAO ═══"
echo "Verificando: ./estacao/"
if [ -d "estacao" ]; then
    echo "✅ Diretório estacao/ existe"
    echo ""
    echo "Scripts .sh em estacao/:"
    ls -lah estacao/*.sh 2>/dev/null || echo "Nenhum script encontrado"
    echo ""
    echo "Dockerfile em estacao/:"
    ls -lah estacao/Dockerfile 2>/dev/null || echo "Dockerfile não encontrado"
    echo ""
    echo "docker-stack.yml:"
    ls -lah estacao/docker-stack.yml 2>/dev/null || echo "docker-stack.yml não encontrado"
else
    echo "❌ Diretório estacao/ NÃO existe"
fi
echo ""

echo "═══ SCRIPTS RAIZ ═══"
echo "Scripts de deploy na raiz:"
ls -lah *.sh 2>/dev/null || echo "Nenhum script encontrado"
echo ""

echo "═══ TESTES DE CAMINHOS ═══"
echo "Testando caminhos relativos:"
echo ""

echo "[ -f 'api/deploy.sh' ]:"
if [ -f "api/deploy.sh" ]; then
    echo "  ✅ EXISTE"
    echo "  Permissões: $(ls -lah api/deploy.sh | awk '{print $1}')"
    echo "  Tamanho: $(ls -lah api/deploy.sh | awk '{print $5}')"
else
    echo "  ❌ NÃO EXISTE"
fi
echo ""

echo "[ -f 'estacao/deploy-stack.sh' ]:"
if [ -f "estacao/deploy-stack.sh" ]; then
    echo "  ✅ EXISTE"
    echo "  Permissões: $(ls -lah estacao/deploy-stack.sh | awk '{print $1}')"
    echo "  Tamanho: $(ls -lah estacao/deploy-stack.sh | awk '{print $5}')"
else
    echo "  ❌ NÃO EXISTE"
fi
echo ""

echo "═══ GIT STATUS ═══"
if [ -d .git ]; then
    echo "Branch: $(git branch --show-current 2>/dev/null || echo 'unknown')"
    echo "Último commit: $(git log -1 --oneline 2>/dev/null || echo 'unknown')"
    echo ""
    echo "Arquivos não trackeados ou modificados:"
    git status -s 2>/dev/null || echo "Erro ao obter status"
else
    echo "❌ Não é um repositório Git"
fi
echo ""

echo "═══ DOCKER INFO ═══"
echo "Docker version: $(docker --version 2>/dev/null || echo 'Docker não encontrado')"
echo "Docker Swarm:"
docker info 2>/dev/null | grep -i "swarm" || echo "Swarm não ativo"
echo ""

echo "═══ RESUMO ═══"
echo "✅ Checklist:"
echo ""
[ -d "api" ] && echo "  ✅ Diretório api/" || echo "  ❌ Diretório api/"
[ -f "api/deploy.sh" ] && echo "  ✅ api/deploy.sh" || echo "  ❌ api/deploy.sh"
[ -f "api/docker-stack.yml" ] && echo "  ✅ api/docker-stack.yml" || echo "  ❌ api/docker-stack.yml"
[ -d "estacao" ] && echo "  ✅ Diretório estacao/" || echo "  ❌ Diretório estacao/"
[ -f "estacao/deploy-stack.sh" ] && echo "  ✅ estacao/deploy-stack.sh" || echo "  ❌ estacao/deploy-stack.sh"
[ -f "estacao/docker-stack.yml" ] && echo "  ✅ estacao/docker-stack.yml" || echo "  ❌ estacao/docker-stack.yml"
[ -f "deploy-all.sh" ] && echo "  ✅ deploy-all.sh" || echo "  ❌ deploy-all.sh"
echo ""
echo "════════════════════════════════════════"
