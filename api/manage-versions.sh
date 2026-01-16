#!/bin/bash
set -euo pipefail

# ============================================
# GERENCIAR VERSÕES DE IMAGENS
# ============================================
# Usar:
#   ./manage-versions.sh list
#   ./manage-versions.sh rollback <TAG>
#   ./manage-versions.sh cleanup [KEEP_COUNT]
#   ./manage-versions.sh tag-latest <TAG>

STACK_NAME="estacaoterapia"
KEEP_VERSIONS="${2:-1}"

action="${1:-help}"

echo "🐳 GERENCIADOR DE VERSÕES - $STACK_NAME"
echo "========================================"
echo ""

list_versions() {
  echo "📦 VERSÕES DISPONÍVEIS:"
  echo ""
  
  for service in redis api socket pgbouncer; do
    echo "▶ estacaoterapia-$service"
    docker images --format "{{.Tag}}" --filter "reference=estacaoterapia-$service" | \
      grep "prd-" | sort -r | while read tag; do
        # Extrair timestamp para mostrar quando foi criado
        timestamp=$(echo "$tag" | cut -d'-' -f2-4)
        hash=$(echo "$tag" | cut -d'-' -f5-)
        
        # Verificar se está em uso
        in_use=""
        if docker service ls --format "{{.Image}}" | grep -q "estacaoterapia-$service:$tag"; then
          in_use=" ✅ [EM USO]"
        fi
        
        echo "  - $tag$in_use"
      done
  done
}

rollback() {
  local tag="$1"
  
  if [ -z "$tag" ]; then
    echo "❌ Use: $0 rollback <TAG>"
    echo "   Ex: $0 rollback 20260115091234-abc1234"
    exit 1
  fi
  
  echo "↩️  ROLLBACK PARA TAG: prd-$tag"
  echo ""
  
  for service in redis api socket pgbouncer; do
    full_name="${STACK_NAME}_${service}"
    image="estacaoterapia-$service:prd-$tag"
    
    if docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^$image\$"; then
      echo "   🔄 $full_name <- $image"
      docker service update --image "$image" "$full_name" || {
        echo "   ❌ Erro ao atualizar $full_name"
      }
    else
      echo "   ⚠️  Imagem não encontrada: $image"
    fi
  done
  
  echo ""
  echo "✅ Rollback iniciado!"
}

cleanup() {
  echo "🧹 LIMPANDO VERSÕES (mantendo últimas $KEEP_VERSIONS + atual)..."
  echo ""
  
  for service in redis api socket pgbouncer; do
    prefix="estacaoterapia-$service"
    
    to_remove=$(docker images --format "{{.Repository}}:{{.Tag}}" | \
      grep "^$prefix:prd-" | \
      sort -r | \
      tail -n +$((KEEP_VERSIONS + 1)))
    
    if [ -z "$to_remove" ]; then
      echo "   ℹ️  $prefix: Nada para remover"
      continue
    fi
    
    echo "   🗑️  $prefix:"
    echo "$to_remove" | while read -r image; do
      echo "      - $image"
      docker rmi "$image" 2>/dev/null || true
    done
  done
  
  echo ""
  echo "✅ Limpeza concluída!"
}

tag_latest() {
  local tag="$1"
  
  if [ -z "$tag" ]; then
    echo "❌ Use: $0 tag-latest <TAG>"
    exit 1
  fi
  
  echo "🏷️  TAGGING VERSÃO prd-$tag COMO 'latest'..."
  echo ""
  
  for service in redis api socket pgbouncer; do
    image="estacaoterapia-$service:prd-$tag"
    
    if docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^$image\$"; then
      docker tag "$image" "estacaoterapia-$service:latest"
      echo "   ✅ estacaoterapia-$service:latest <- prd-$tag"
    else
      echo "   ⚠️  Imagem não encontrada: $image"
    fi
  done
  
  echo ""
  echo "✅ Tags atualizadas!"
}

show_stats() {
  echo "📊 ESTATÍSTICAS:"
  echo ""
  
  echo "   Total de imagens estacaoterapia:"
  docker images --format "{{.Repository}}" | grep "^estacaoterapia-" | sort -u | wc -l
  
  echo ""
  echo "   Espaço em disco (imagens):"
  docker images --format "{{.Size}}" --filter "reference=estacaoterapia*" | \
    awk '{s+=$1} END {print "      " s/1024/1024 " MB"}'
  
  echo ""
  echo "   Imagens orfãs (dangling):"
  count=$(docker images --format "{{.ID}}" --filter "dangling=true" | wc -l)
  echo "      $count imagens"
  
  if [ "$count" -gt 0 ]; then
    echo "   Para remover: docker image prune -f --filter dangling=true"
  fi
}

help() {
  cat <<EOF
🐳 GERENCIADOR DE VERSÕES - Estação Terapia

COMANDO: $0 <ação> [opções]

AÇÕES:
  list              Lista todas as versões disponíveis
  rollback <TAG>    Volta para uma versão anterior (ex: 20260115091234-abc1234)
  cleanup [N]       Remove versões antigas (padrão: mantém 1 anterior, use cleanup 3 para manter 3)
  tag-latest <TAG>  Marca uma versão como 'latest'
  stats             Mostra estatísticas de espaço
  help              Mostra esta mensagem

EXEMPLOS:
  $0 list
  $0 rollback 20260115091234-abc1234
  $0 cleanup 3
  $0 tag-latest 20260115091234-abc1234
  $0 stats

SERVIÇOS GERENCIADOS:
  - estacaoterapia-redis
  - estacaoterapia-api
  - estacaoterapia-socket
  - estacaoterapia-pgbouncer
EOF
}

case "$action" in
  list)      list_versions ;;
  rollback)  rollback "$KEEP_VERSIONS" ;;
  cleanup)   cleanup ;;
  tag-latest) tag_latest "$KEEP_VERSIONS" ;;
  stats)     show_stats ;;
  *)         help ;;
esac
