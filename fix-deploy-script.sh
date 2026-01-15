#!/bin/bash

# Script para corrigir problemas no deploy.sh

echo "Corrigindo api/deploy.sh..."

# Backup
cp api/deploy.sh api/deploy.sh.backup-$(date +%s)

# Corrigir caracteres corrompidos
sed -i 's/\[\[CRIANDO\]NDO\]/[CRIANDO]/g' api/deploy.sh
sed -i 's/\[\[ERRO\] ao/[ERRO ao/g' api/deploy.sh
sed -i 's/ \[CRIANDO\] Criando/ [CRIANDO] Criando/g' api/deploy.sh

# Corrigir [VOLUMES] [INFO] duplicado
sed -i 's/\[VOLUMES\] \[INFO\]/[VOLUMES]/g' api/deploy.sh

# Verificar syntax
echo ""
echo "Validando syntax..."
if bash -n api/deploy.sh 2>&1; then
    echo "✅ Script corrigido com sucesso!"
else
    echo "❌ Ainda há erros de syntax. Verificando..."
    bash -n api/deploy.sh 2>&1 | head -20
fi
