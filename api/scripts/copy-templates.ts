import fs from 'fs';
import path from 'path';

const srcDir = path.join(__dirname, '..', 'src', 'templates');
const distDir = path.join(__dirname, '..', 'dist', 'templates');

/**
 * Função recursiva para copiar diretórios, preservando arquivos .js já compilados
 */
function copyRecursiveSync(src: string, dest: string): void {
    const exists = fs.existsSync(src);
    const stats = exists ? fs.statSync(src) : null;
    const isDirectory = stats !== null && stats.isDirectory();

    if (isDirectory) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }

        fs.readdirSync(src).forEach((childItemName) => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        const ext = path.extname(src).toLowerCase();

        // Ignora arquivos .ts (são compilados pelo TypeScript)
        if (ext === '.ts') {
            return;
        }

        // Preserva arquivos .js existentes (compilados pelo TypeScript)
        if (ext === '.js' && fs.existsSync(dest)) {
            return;
        }

        const destDirPath = path.dirname(dest);
        if (!fs.existsSync(destDirPath)) {
            fs.mkdirSync(destDirPath, { recursive: true });
        }

        fs.copyFileSync(src, dest);
    }
}

/**
 * Remove arquivos não-JS do diretório de destino
 */
function removeNonJsFiles(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
        return;
    }

    fs.readdirSync(dirPath).forEach((file) => {
        const curPath = path.join(dirPath, file);
        const stat = fs.lstatSync(curPath);

        if (stat.isDirectory()) {
            removeNonJsFiles(curPath);
        } else {
            const ext = path.extname(file).toLowerCase();
            if (ext !== '.js' && ext !== '.js.map') {
                fs.unlinkSync(curPath);
            }
        }
    });
}

try {
    console.log('📁 Copiando templates...');
    console.log(`   Origem: ${srcDir}`);
    console.log(`   Destino: ${distDir}`);

    if (!fs.existsSync(srcDir)) {
        console.error(`❌ Erro: Diretório de origem não encontrado: ${srcDir}`);
        process.exit(1);
    }

    // Limpa apenas arquivos não-JS no destino para preservar compilados
    if (fs.existsSync(distDir)) {
        removeNonJsFiles(distDir);
        console.log('   Arquivos não-JS removidos (preservando arquivos compilados)');
    }

    copyRecursiveSync(srcDir, distDir);

    console.log('✅ Templates copiados com sucesso!');
} catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ Erro ao copiar templates:', errorMessage);
    process.exit(1);
}
