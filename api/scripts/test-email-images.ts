#!/usr/bin/env node

/**
 * Script de diagnóstico de imagens em emails
 * 
 * Uso:
 *   node scripts/test-email-images.js
 *   # ou com ts-node:
 *   ts-node scripts/test-email-images.ts
 */

import fs from 'fs';
import path from 'path';

// Cores para terminal
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(color: string, ...args: any[]) {
    console.log(`${color}${args.join(' ')}${colors.reset}`);
}

// Encontra o diretório de templates
function getTemplatesDir(): string {
    const possiblePaths = [
        path.resolve(__dirname, '..', 'src', 'templates'),
        path.resolve(process.cwd(), 'src', 'templates'),
        path.resolve(process.cwd(), 'dist', 'templates'),
    ];

    for (const dirPath of possiblePaths) {
        if (fs.existsSync(dirPath)) {
            return dirPath;
        }
    }

    throw new Error('Diretório de templates não encontrado!');
}

function main() {
    console.clear();
    log(colors.cyan, '========================================');
    log(colors.cyan, '   🔍 DIAGNÓSTICO DE IMAGENS EM EMAILS');
    log(colors.cyan, '========================================\n');

    try {
        const templatesDir = getTemplatesDir();
        const assetsDir = path.join(templatesDir, 'assets');

        log(colors.blue, '📂 Diretórios:');
        log(colors.reset, `   Templates: ${templatesDir}`);
        log(colors.reset, `   Assets: ${assetsDir}\n`);

        // 1. Verifica se assets existe
        if (!fs.existsSync(assetsDir)) {
            log(colors.red, '❌ ERRO: Diretório assets não existe!');
            process.exit(1);
        }

        // 2. Lista imagens nos assets
        const files = fs.readdirSync(assetsDir, { withFileTypes: true });
        const imageExtensions = ['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp'];
        const images = files.filter(f =>
            f.isFile() && imageExtensions.includes(path.extname(f.name).toLowerCase())
        );

        log(colors.green, `✅ Imagens encontradas em assets: ${images.length}`);
        images.forEach(img => {
            const fullPath = path.join(assetsDir, img.name);
            const size = fs.statSync(fullPath).size;
            const sizeKB = (size / 1024).toFixed(2);
            log(colors.reset, `   • ${img.name} (${sizeKB} KB)`);
        });
        console.log();

        // 3. Lista templates HTML
        const templateFiles = files.filter(f =>
            f.isFile() && f.name.endsWith('.html')
        );

        log(colors.green, `✅ Templates encontrados: ${templateFiles.length}`);
        templateFiles.slice(0, 5).forEach(t => {
            log(colors.reset, `   • ${t.name}`);
        });
        if (templateFiles.length > 5) {
            log(colors.reset, `   ... e mais ${templateFiles.length - 5}`);
        }
        console.log();

        // 4. Analisa referências de CID em templates
        const imageMap = new Set(images.map(img => img.name));
        const cidRegex = /src="cid:([^"]+)"/g;
        const allCids = new Set<string>();
        const missingImages = new Set<string>();

        log(colors.blue, '🔍 Analisando referências CID nos templates...\n');

        templateFiles.forEach(template => {
            const filePath = path.join(templatesDir, template.name);
            const content = fs.readFileSync(filePath, 'utf-8');
            const matches = content.matchAll(cidRegex);

            for (const match of matches) {
                const imageName = match[1];
                allCids.add(imageName);

                if (!imageMap.has(imageName)) {
                    missingImages.add(imageName);
                    log(colors.yellow, `   ⚠️  ${template.name}: ${imageName} (❌ NÃO ENCONTRADO)`);
                } else {
                    log(colors.green, `   ✓ ${template.name}: ${imageName}`);
                }
            }
        });
        console.log();

        // 5. Resumo
        log(colors.bright + colors.cyan, '📊 RESUMO:');
        log(colors.reset, `   CIDs únicos referenciados: ${allCids.size}`);
        log(colors.reset, `   Imagens carregadas: ${images.length}`);

        if (missingImages.size === 0) {
            log(colors.green, `   ✅ TUDO OK! Todas as imagens referenciadas estão nos assets.\n`);
        } else {
            log(colors.red, `   ❌ ${missingImages.size} IMAGEM(NS) FALTANDO!\n`);
            log(colors.red, '   Imagens não encontradas:');
            missingImages.forEach(img => {
                log(colors.red, `      • ${img}`);
            });
            log(colors.reset, '\n   Ação: Copie as imagens faltantes para:');
            log(colors.reset, `   ${assetsDir}\n`);
        }

        // 6. Recomendações
        log(colors.blue, '💡 Recomendações:');
        log(colors.reset, '   1. Após adicionar imagens, reconstrua o projeto:');
        log(colors.reset, '      npm run build');
        log(colors.reset, '   2. Reinicie a aplicação:');
        log(colors.reset, '      npm run dev');
        log(colors.reset, '   3. Envie um email de teste\n');

        process.exit(missingImages.size > 0 ? 1 : 0);

    } catch (error) {
        log(colors.red, `❌ ERRO: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
}

main();
