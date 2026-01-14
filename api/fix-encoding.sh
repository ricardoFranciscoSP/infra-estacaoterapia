#!/bin/bash

# Script para corrigir encoding de arquivos .env na VPS
# Remove BOM UTF-8 e converte para UTF-8 puro

SECRETS_DIR="/opt/secrets"

echo "🔧 Corrigindo encoding dos arquivos .env..."
echo ""

fix_encoding() {
    local file=$1
    local filename=$(basename "$file")
    
    if [ ! -f "$file" ]; then
        echo "⚠️  Arquivo não encontrado: $file"
        return 1
    fi
    
    echo "📝 Processando: $filename"
    
    # Backup do arquivo original
    cp "$file" "${file}.backup"
    echo "   ✓ Backup criado: ${filename}.backup"
    
    # Remover BOM UTF-8 e converter para UTF-8 puro
    # Remove os primeiros 3 bytes se forem EF BB BF (BOM UTF-8)
    if head -c 3 "$file" | xxd -p | grep -q "efbbbf"; then
        echo "   🔍 BOM UTF-8 detectado, removendo..."
        tail -c +4 "$file" > "${file}.tmp"
        mv "${file}.tmp" "$file"
    fi
    
    # Converter para UTF-8 puro (caso esteja em outro encoding)
    iconv -f UTF-8 -t UTF-8 -c "$file" -o "${file}.tmp" 2>/dev/null || \
    iconv -f ISO-8859-1 -t UTF-8 "$file" -o "${file}.tmp" 2>/dev/null || \
    cp "$file" "${file}.tmp"
    
    mv "${file}.tmp" "$file"
    
    echo "   ✅ Encoding corrigido"
    echo ""
}

# Corrigir arquivos principais
fix_encoding "$SECRETS_DIR/postgres.env"
fix_encoding "$SECRETS_DIR/estacao_api.env"
fix_encoding "$SECRETS_DIR/estacao_socket.env"

echo ""
echo "✅ Processo concluído!"
echo ""
echo "📋 Para verificar os arquivos:"
echo "   cat $SECRETS_DIR/estacao_api.env | head -n 10"
echo ""
echo "📋 Se precisar restaurar backup:"
echo "   cp $SECRETS_DIR/estacao_api.env.backup $SECRETS_DIR/estacao_api.env"
