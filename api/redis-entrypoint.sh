#!/bin/sh
set -e

echo "======================================"
echo "ðŸ” Carregando configuraÃ§Ã£o do Redis..."
echo "======================================"

# Ler senha do secret redis_password
if [ -f /run/secrets/redis_password ]; then
  REDIS_PASSWORD=$(cat /run/secrets/redis_password | tr -d '\n\r' | tr -d ' ')
  echo "âœ… Secret redis_password encontrado"
  echo "   ðŸ“ Tamanho da senha: $(echo -n "$REDIS_PASSWORD" | wc -c) caracteres"
  if [ -z "$REDIS_PASSWORD" ]; then
    echo "   âš ï¸  AVISO: Secret existe mas estÃ¡ vazio!"
    REDIS_PASSWORD=""
  else
    echo "   âœ… Senha carregada com sucesso"
  fi
else
  echo "âš ï¸  AVISO: Secret redis_password NÃƒO encontrado em /run/secrets/redis_password"
  echo "   ðŸ“‚ Verificando conteÃºdo de /run/secrets/..."
  ls -la /run/secrets/ 2>/dev/null || echo "   âŒ DiretÃ³rio /run/secrets/ nÃ£o existe!"
  REDIS_PASSWORD=""
fi

# Configurar variÃ¡veis padrÃ£o
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_MAXMEMORY="${REDIS_MAXMEMORY:-512mb}"
REDIS_MAXMEMORY_POLICY="${REDIS_MAXMEMORY_POLICY:-allkeys-lru}"

echo ""
echo "ðŸ“‹ ConfiguraÃ§Ã£o Redis verificada:"
echo "   â€¢ Porta: $REDIS_PORT"
echo "   â€¢ MaxMemory: $REDIS_MAXMEMORY"
echo "   â€¢ PolÃ­tica: $REDIS_MAXMEMORY_POLICY"
if [ -n "$REDIS_PASSWORD" ]; then
  echo "   â€¢ Senha: âœ… definida ($(echo -n "$REDIS_PASSWORD" | wc -c) caracteres)"
else
  echo "   â€¢ Senha: âŒ nÃ£o definida"
fi
echo ""

# Tentar configurar vm.overcommit_memory (opcional)
if [ -w /proc/sys/vm/overcommit_memory ]; then
  echo 1 > /proc/sys/vm/overcommit_memory 2>/dev/null || true
  echo "âœ… vm.overcommit_memory configurado"
else
  echo "âš ï¸  AVISO: NÃ£o foi possÃ­vel configurar vm.overcommit_memory (requer privilÃ©gios)"
fi

echo ""
echo "ðŸš€ Iniciando Redis..."
echo ""

# Construir comando Redis
if [ -n "$REDIS_PASSWORD" ]; then
  echo "ðŸ” Redis serÃ¡ iniciado COM autenticaÃ§Ã£o"
  exec redis-server \
    --port "$REDIS_PORT" \
    --requirepass "$REDIS_PASSWORD" \
    --appendonly yes \
    --appendfsync everysec \
    --maxmemory "$REDIS_MAXMEMORY" \
    --maxmemory-policy "$REDIS_MAXMEMORY_POLICY" \
    --save 900 1 \
    --save 300 10 \
    --save 60 10000 \
    --tcp-backlog 511 \
    --timeout 300 \
    --tcp-keepalive 300
else
  echo "âš ï¸  Redis serÃ¡ iniciado SEM autenticaÃ§Ã£o"
  exec redis-server \
    --port "$REDIS_PORT" \
    --appendonly yes \
    --appendfsync everysec \
    --maxmemory "$REDIS_MAXMEMORY" \
    --maxmemory-policy "$REDIS_MAXMEMORY_POLICY" \
    --save 900 1 \
    --save 300 10 \
    --save 60 10000 \
    --tcp-backlog 511 \
    --timeout 300 \
    --tcp-keepalive 300
fi