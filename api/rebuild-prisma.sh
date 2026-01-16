#!/bin/bash
set -e

echo "🧹 Limpando Prisma Client antigo..."
rm -rf src/generated/prisma
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma/client

echo "🔄 Regenerando Prisma Client..."
npx prisma generate --schema=./prisma/schema.prisma

echo "✅ Prisma Client regenerado com sucesso!"
echo ""
echo "📝 Verificando arquivos gerados:"
if [ -d "src/generated/prisma" ]; then
    ls -lh src/generated/prisma/ | head -10
    echo ""
    echo "✅ Client gerado em: src/generated/prisma/"
else
    echo "❌ ERRO: Client não foi gerado!"
    exit 1
fi

echo ""
echo "🔨 Recompilando TypeScript..."
npm run build

echo ""
echo "✅ Build completo com sucesso!"
