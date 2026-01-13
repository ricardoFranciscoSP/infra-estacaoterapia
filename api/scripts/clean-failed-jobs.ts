#!/usr/bin/env node

/**
 * Script para limpar jobs falhados das filas BullMQ
 * 
 * Uso:
 *   ts-node scripts/clean-failed-jobs.ts                    # Remove todos os jobs falhados de todas as filas
 *   ts-node scripts/clean-failed-jobs.ts consultationQueue  # Remove apenas da fila consultationQueue
 *   ts-node scripts/clean-failed-jobs.ts all 86400000       # Remove jobs mais antigos que 24h (86400000ms)
 */

import { cleanFailedJobs, cleanAllFailedJobs } from '../src/utils/queueStatus';

const args = process.argv.slice(2);
const queueName = args[0]; // Nome da fila ou 'all' para todas
const olderThanMs = args[1] ? parseInt(args[1]) : undefined;

async function main() {
    try {
        console.log('🧹 Limpando jobs falhados...\n');

        let result: Record<string, number>;

        if (queueName && queueName !== 'all') {
            // Remove de uma fila específica
            console.log(`📋 Fila: ${queueName}`);
            if (olderThanMs) {
                const hours = olderThanMs / (1000 * 60 * 60);
                console.log(`⏰ Removendo jobs mais antigos que ${hours}h\n`);
            } else {
                console.log('🗑️  Removendo todos os jobs falhados\n');
            }

            const count = await cleanFailedJobs(queueName, olderThanMs);
            result = { [queueName]: count };
        } else {
            // Remove de todas as filas
            console.log('📋 Filas: todas');
            if (olderThanMs) {
                const hours = olderThanMs / (1000 * 60 * 60);
                console.log(`⏰ Removendo jobs mais antigos que ${hours}h\n`);
            } else {
                console.log('🗑️  Removendo todos os jobs falhados\n');
            }

            result = await cleanAllFailedJobs(olderThanMs);
        }

        const totalRemoved = Object.values(result).reduce((sum, count) => sum + count, 0);

        console.log('\n✅ Limpeza concluída!\n');
        console.log('📊 Resultados:');
        for (const [queue, count] of Object.entries(result)) {
            console.log(`   ${queue}: ${count} job(s) removido(s)`);
        }
        console.log(`\n🎯 Total: ${totalRemoved} job(s) removido(s)`);

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Erro ao limpar jobs falhados:');
        if (error instanceof Error) {
            console.error(`   ${error.message}`);
            if (error.stack) {
                console.error(`\n   Stack: ${error.stack}`);
            }
        } else {
            console.error(error);
        }
        process.exit(1);
    }
}

main();




