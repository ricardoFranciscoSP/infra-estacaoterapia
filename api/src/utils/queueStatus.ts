// src/utils/queueStatus.ts
import { Queue, Job } from 'bullmq';
import { getBullMQConnectionOptions } from '../config/redis.config';

const ALL_QUEUE_NAMES = [
    'agendaQueue',
    'webhookProcessor',
    'consultationQueue',
    'renovacao-controle-consulta',
    'pagamento-controle-consulta',
    'notificacao-controle-consulta',
    'emailQueue',
    'notificationQueue',
    'tokenGenerationQueue',
    'delayedJobs',
    'databaseJobs',
];

/**
 * Limpa jobs delayed antigos de uma fila BullMQ
 */
export async function cleanDelayedJobs(queueName: string, olderThanMs = 24 * 60 * 60 * 1000) {
    const redisConnection = getBullMQConnectionOptions();
    const queue = new Queue(queueName, { connection: redisConnection });
    const delayedJobs = await queue.getJobs(['delayed']);
    const now = Date.now();
    for (const job of delayedJobs) {
        if (job.timestamp < now - olderThanMs) {
            await job.remove();
            console.log(`[BullMQ] Removido job delayed antigo: ${job.id} da fila ${queueName}`);
        }
    }
    await queue.close();
}

/**
 * Remove jobs falhados de uma fila BullMQ
 * @param queueName Nome da fila
 * @param olderThanMs Opcional: remove apenas jobs mais antigos que X ms (padrão: remove todos)
 * @returns Número de jobs removidos
 */
export async function cleanFailedJobs(queueName: string, olderThanMs?: number): Promise<number> {
    const redisConnection = getBullMQConnectionOptions();

    let queue: Queue | null = null;
    let removedCount = 0;

    try {
        queue = new Queue(queueName, { connection: redisConnection });
        const failedJobs = await queue.getJobs(['failed'], 0, -1); // -1 para pegar todos
        
        const now = Date.now();
        
        for (const job of failedJobs) {
            // Se olderThanMs foi especificado, remove apenas jobs mais antigos
            if (olderThanMs !== undefined) {
                const jobAge = now - (job.timestamp || 0);
                if (jobAge < olderThanMs) {
                    continue; // Pula jobs muito recentes
                }
            }
            
            await job.remove();
            removedCount++;
            console.log(`[BullMQ] Removido job falhado: ${job.id} (${job.name}) da fila ${queueName}`);
        }

        return removedCount;
    } catch (error) {
        console.error(`❌ Erro ao limpar jobs falhados da fila ${queueName}:`, error);
        throw error;
    } finally {
        if (queue) {
            try {
                await queue.close();
            } catch (closeError) {
                console.warn(`⚠️ Erro ao fechar fila ${queueName}:`, closeError);
            }
        }
    }
}

/**
 * Remove jobs falhados de todas as filas BullMQ
 * @param olderThanMs Opcional: remove apenas jobs mais antigos que X ms (padrão: remove todos)
 * @returns Objeto com o número de jobs removidos por fila
 */
export async function cleanAllFailedJobs(olderThanMs?: number): Promise<Record<string, number>> {
    const queueNames = ALL_QUEUE_NAMES;

    const results: Record<string, number> = {};

    for (const queueName of queueNames) {
        try {
            const count = await cleanFailedJobs(queueName, olderThanMs);
            results[queueName] = count;
        } catch (error) {
            console.error(`❌ Erro ao limpar jobs falhados da fila ${queueName}:`, error);
            results[queueName] = 0;
        }
    }

    return results;
}

export interface QueueStatus {
    queueName: string;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
}

export interface WorkerStatus {
    name: string;
    isRunning: boolean;
    concurrency?: number;
}

/**
 * Lista o status de todas as filas BullMQ
 */
export async function getAllQueuesStatus(): Promise<QueueStatus[]> {
    const redisConnection = getBullMQConnectionOptions();

    const queueNames = ALL_QUEUE_NAMES;

    const statuses: QueueStatus[] = [];

    for (const queueName of queueNames) {
        try {
            const queue = new Queue(queueName, { connection: redisConnection });
            const [waiting, active, completed, failed, delayed] = await Promise.all([
                queue.getWaitingCount(),
                queue.getActiveCount(),
                queue.getCompletedCount(),
                queue.getFailedCount(),
                queue.getDelayedCount(),
            ]);

            statuses.push({
                queueName,
                waiting,
                active,
                completed,
                failed,
                delayed,
            });

            await queue.close();
        } catch (error) {
            console.error(`❌ Erro ao obter status da fila ${queueName}:`, error);
        }
    }

    return statuses;
}

/**
 * Imprime o status de todas as filas no console
 */
export async function logAllQueuesStatus(): Promise<void> {
    console.log('\n📊 ===== STATUS DAS FILAS BULLMQ =====');
    const statuses = await getAllQueuesStatus();

    if (statuses.length === 0) {
        console.log('⚠️ Nenhuma fila encontrada ou Redis não disponível');
        return;
    }

    for (const status of statuses) {
        const total = status.waiting + status.active + status.completed + status.failed + status.delayed;
        if (total > 0 || status.active > 0) {
            console.log(`\n📋 Fila: ${status.queueName}`);
            console.log(`   ⏳ Waiting: ${status.waiting}`);
            console.log(`   🔄 Active: ${status.active}`);
            console.log(`   ✅ Completed: ${status.completed}`);
            console.log(`   ❌ Failed: ${status.failed}`);
            console.log(`   ⏰ Delayed: ${status.delayed}`);
        }
    }
    console.log('\n=====================================\n');
}

export interface FailedJobInfo {
    jobId: string;
    queueName: string;
    name: string;
    data: unknown;
    failedReason: string;
    attemptsMade: number;
    timestamp: number;
    processedOn?: number;
    finishedOn?: number;
}

/**
 * Lista todos os jobs falhados de uma fila específica
 */
export async function getFailedJobs(queueName: string, limit = 100): Promise<FailedJobInfo[]> {
    const redisConnection = getBullMQConnectionOptions();

    try {
        const queue = new Queue(queueName, { connection: redisConnection });
        const failedJobs = await queue.getJobs(['failed'], 0, limit - 1);
        
        const jobsInfo: FailedJobInfo[] = failedJobs.map((job: Job) => ({
            jobId: job.id || 'unknown',
            queueName,
            name: job.name || 'unknown',
            data: job.data,
            failedReason: job.failedReason || 'Unknown error',
            attemptsMade: job.attemptsMade || 0,
            timestamp: job.timestamp || 0,
            processedOn: job.processedOn,
            finishedOn: job.finishedOn,
        }));

        await queue.close();
        return jobsInfo;
    } catch (error) {
        console.error(`❌ Erro ao obter jobs falhados da fila ${queueName}:`, error);
        return [];
    }
}

/**
 * Lista todos os jobs falhados de todas as filas
 */
export async function getAllFailedJobs(limit = 100): Promise<FailedJobInfo[]> {
    const redisConnection = getBullMQConnectionOptions();

    const queueNames = ALL_QUEUE_NAMES;

    const allFailedJobs: FailedJobInfo[] = [];

    for (const queueName of queueNames) {
        const failedJobs = await getFailedJobs(queueName, limit);
        allFailedJobs.push(...failedJobs);
    }

    // Ordena por timestamp (mais recente primeiro)
    return allFailedJobs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

/**
 * Imprime todos os jobs falhados no console
 */
export async function logAllFailedJobs(): Promise<void> {
    console.log('\n❌ ===== JOBS FALHADOS =====\n');
    
    const failedJobs = await getAllFailedJobs();
    
    if (failedJobs.length === 0) {
        console.log('✅ Nenhum job falhado encontrado!');
        console.log('\n=====================================\n');
        return;
    }

    // Agrupa por fila
    const jobsByQueue = failedJobs.reduce((acc, job) => {
        if (!acc[job.queueName]) {
            acc[job.queueName] = [];
        }
        acc[job.queueName].push(job);
        return acc;
    }, {} as Record<string, FailedJobInfo[]>);

    for (const [queueName, jobs] of Object.entries(jobsByQueue)) {
        console.log(`\n📋 Fila: ${queueName} (${jobs.length} jobs falhados)`);
        console.log('─'.repeat(80));
        
        for (const job of jobs) {
            const date = job.timestamp ? new Date(job.timestamp).toLocaleString('pt-BR') : 'N/A';
            console.log(`\n  🔴 Job ID: ${job.jobId}`);
            console.log(`     Nome: ${job.name}`);
            console.log(`     Data: ${JSON.stringify(job.data, null, 2).split('\n').join('\n     ')}`);
            console.log(`     Tentativas: ${job.attemptsMade}`);
            console.log(`     Data/Hora: ${date}`);
            console.log(`     Erro: ${job.failedReason}`);
            if (job.processedOn) {
                const processedDate = new Date(job.processedOn).toLocaleString('pt-BR');
                console.log(`     Processado em: ${processedDate}`);
            }
            if (job.finishedOn) {
                const finishedDate = new Date(job.finishedOn).toLocaleString('pt-BR');
                console.log(`     Finalizado em: ${finishedDate}`);
            }
        }
    }

    console.log('\n=====================================\n');
}

export interface JobInfo {
    jobId: string;
    queueName: string;
    name: string;
    data: unknown;
    status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
    attemptsMade: number;
    timestamp: number;
    processedOn?: number;
    finishedOn?: number;
    failedReason?: string;
    delay?: number;
}

/**
 * Lista jobs de uma fila específica com um status específico
 */
export async function getJobsByStatus(
    queueName: string,
    status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed',
    limit = 100
): Promise<JobInfo[]> {
    const redisConnection = getBullMQConnectionOptions();

    let queue: Queue | null = null;
    try {
        queue = new Queue(queueName, { connection: redisConnection });
        const jobs = await queue.getJobs([status], 0, limit - 1);
        
        const jobsInfo: JobInfo[] = jobs.map((job: Job) => ({
            jobId: job.id || 'unknown',
            queueName,
            name: job.name || 'unknown',
            data: job.data,
            status,
            attemptsMade: job.attemptsMade || 0,
            timestamp: job.timestamp || 0,
            processedOn: job.processedOn,
            finishedOn: job.finishedOn,
            failedReason: job.failedReason,
            delay: job.opts?.delay,
        }));

        return jobsInfo;
    } catch (error) {
        console.error(`❌ Erro ao obter jobs ${status} da fila ${queueName}:`, error);
        if (error instanceof Error) {
            console.error(`❌ Mensagem de erro: ${error.message}`);
            console.error(`❌ Stack trace: ${error.stack}`);
        }
        return [];
    } finally {
        if (queue) {
            try {
                await queue.close();
            } catch (closeError) {
                console.warn(`⚠️ Erro ao fechar fila ${queueName}:`, closeError);
            }
        }
    }
}

/**
 * Lista todos os jobs de todas as filas com um status específico
 */
export async function getAllJobsByStatus(
    status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed',
    limit = 100
): Promise<JobInfo[]> {
    try {
        const redisConnection = getBullMQConnectionOptions();

        const queueNames = ALL_QUEUE_NAMES;

        const allJobs: JobInfo[] = [];

        for (const queueName of queueNames) {
            try {
                const jobs = await getJobsByStatus(queueName, status, limit);
                allJobs.push(...jobs);
            } catch (error) {
                console.error(`❌ Erro ao buscar jobs da fila ${queueName} com status ${status}:`, error);
                // Continua com as outras filas mesmo se uma falhar
            }
        }

        // Ordena por timestamp (mais recente primeiro)
        return allJobs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } catch (error) {
        console.error(`❌ Erro em getAllJobsByStatus para status ${status}:`, error);
        return [];
    }
}

/**
 * Lista todos os jobs de todas as filas com todos os status
 */
export async function getAllJobs(limit = 100): Promise<JobInfo[]> {
    try {
        const statuses: Array<'waiting' | 'active' | 'completed' | 'failed' | 'delayed'> = [
            'waiting',
            'active',
            'completed',
            'failed',
            'delayed',
        ];

        const allJobs: JobInfo[] = [];

        for (const status of statuses) {
            try {
                const jobs = await getAllJobsByStatus(status, limit);
                allJobs.push(...jobs);
            } catch (error) {
                console.error(`❌ Erro ao buscar jobs com status ${status}:`, error);
                // Continua com os outros status mesmo se um falhar
            }
        }

        // Ordena por timestamp (mais recente primeiro)
        return allJobs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } catch (error) {
        console.error('❌ Erro em getAllJobs:', error);
        return [];
    }
}

/**
 * Zera todas as filas BullMQ (deploy seguro)
 * Remove jobs em qualquer status para evitar travamentos no boot
 */
export async function resetAllQueues(): Promise<Record<string, boolean>> {
    const redisConnection = getBullMQConnectionOptions();
    const results: Record<string, boolean> = {};

    for (const queueName of ALL_QUEUE_NAMES) {
        let queue: Queue | null = null;
        try {
            queue = new Queue(queueName, { connection: redisConnection });
            await queue.obliterate({ force: true });
            console.log(`🧹 [BullMQ] Fila zerada: ${queueName}`);
            results[queueName] = true;
        } catch (error) {
            console.error(`❌ Erro ao zerar fila ${queueName}:`, error);
            results[queueName] = false;

            // Fallback: tenta limpar por status caso obliterate falhe
            if (queue) {
                try {
                    await Promise.all([
                        queue.clean(0, 100000, 'completed'),
                        queue.clean(0, 100000, 'failed'),
                        queue.clean(0, 100000, 'wait'),
                        queue.clean(0, 100000, 'active'),
                        queue.clean(0, 100000, 'delayed'),
                        queue.clean(0, 100000, 'paused'),
                    ]);
                    console.log(`🧹 [BullMQ] Fallback clean executado: ${queueName}`);
                } catch (fallbackError) {
                    console.error(`❌ Fallback clean falhou para ${queueName}:`, fallbackError);
                }
            }
        } finally {
            if (queue) {
                try {
                    await queue.close();
                } catch (closeError) {
                    console.warn(`⚠️ Erro ao fechar fila ${queueName}:`, closeError);
                }
            }
        }
    }

    return results;
}

