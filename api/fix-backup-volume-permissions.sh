#!/bin/bash
set -euo pipefail

VOLUME_NAME="${BACKUPS_VOLUME:-backups_data}"
TARGET_UID="${BACKUPS_UID:-1000}"
TARGET_GID="${BACKUPS_GID:-1000}"

echo "🔧 Ajustando permissões do volume de backups: $VOLUME_NAME"

if ! docker volume inspect "$VOLUME_NAME" >/dev/null 2>&1; then
  echo "📦 Volume $VOLUME_NAME não existe. Criando..."
  docker volume create "$VOLUME_NAME" >/dev/null
fi

docker run --rm \
  -v "${VOLUME_NAME}:/data" \
  alpine:3.20 \
  sh -c "chown -R ${TARGET_UID}:${TARGET_GID} /data 2>/dev/null || true; chmod -R 775 /data 2>/dev/null || true"

echo "✅ Permissões ajustadas para $VOLUME_NAME"
