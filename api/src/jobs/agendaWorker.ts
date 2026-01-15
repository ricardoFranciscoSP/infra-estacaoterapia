import { Queue, Worker, Job } from "bullmq";
import { getBullMQConnectionOptions } from "../config/redis.config";
import { GerarAgendaService } from "../services/gerarAgenda.service";
import { prismaAgendaRepository } from "../repositories/prismaAgenda.repository";
import { prismaUserRepository } from "../repositories/prismaUser.repository";

export const AGENDA_QUEUE_NAME = "agendaQueue";

const redisConnection = getBullMQConnectionOptions();
export let agendaQueue: Queue | null = null;
agendaQueue = new Queue(AGENDA_QUEUE_NAME, { connection: redisConnection });

let agendaWorkerStarted = false;
export let agendaWorker: Worker | null = null;

// Adiciona job recorrente para geração de agendas dos psicólogos
export async function scheduleMonthlyAgendaJob() {
    if (!agendaQueue) {
        console.log('[BullMQ] Não agendando job mensal: agendaQueue não inicializada.');
        return;
    }

    // Remove todos os jobs repeatables duplicados antes de criar um novo
    const repeatables = await agendaQueue.getRepeatableJobs();
    for (const job of repeatables) {
        if (job.name === 'generateMonthlyAgenda') {
            await agendaQueue.removeRepeatableByKey(job.key);
            console.log(`[BullMQ] Repeatable removido: ${job.name} (${job.key})`);
        }
    }

    // Agenda o job para rodar todo dia 01 do mês às 00:00 (pattern: minuto hora dia mês dia-da-semana)
    const pattern = '0 0 1 * *'; // 00:00 no dia 01 de cada mês
    await agendaQueue.add(
        'generateMonthlyAgenda',
        {},
        {
            repeat: { pattern },
            removeOnComplete: true,
            removeOnFail: true,
        }
    );

    console.log(`✅ [BullMQ] Job mensal de geração de agendas agendado para rodar todo dia 01 às 00:00 (pattern: ${pattern})`);
}

// Worker para processar o job
export function startAgendaWorker() {
    if (agendaWorkerStarted) {
        console.log("⚠️ [AgendaWorker] Worker já está rodando");
        return;
    }

    if (!agendaQueue) {
        console.log('[BullMQ] AgendaWorker não inicializado: agendaQueue não disponível.');
        return;
    }

    agendaWorkerStarted = true;
    agendaWorker = new Worker(
        AGENDA_QUEUE_NAME,
        async (job: Job) => {
            const jobStartTime = Date.now();
            console.log(`[AgendaWorker] INICIANDO job: ${job.id} (${job.name})`, job.data);

            if (job.name === "generateMonthlyAgenda") {
                try {
                    console.log(`[AgendaWorker] ⏳ Iniciando geração de agendas...`);
                    const service = new GerarAgendaService(prismaAgendaRepository, prismaUserRepository);

                    // Adiciona timeout de 10 minutos para evitar travamento indefinido
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Job timeout após 10 minutos')), 10 * 60 * 1000);
                    });

                    const result = await Promise.race([
                        service.generateAgendas(),
                        timeoutPromise
                    ]) as Awaited<ReturnType<typeof service.generateAgendas>>;

                    const duration = Date.now() - jobStartTime;

                    // Type guard para verificar se há erro
                    if ('error' in result && result.error) {
                        console.error(`❌ [AgendaWorker] Erro ao gerar agendas: ${result.error}`);
                        throw new Error(result.error);
                    }

                    // Agora sabemos que result tem 'message' e 'resultados'
                    console.log(`✅ [AgendaWorker] Agenda mensal gerada. Psicólogos processados: ${result.resultados?.length || 0}`);
                    console.log(`⏱️ [AgendaWorker] Job ${job.id} concluído em ${duration}ms`);

                    // Log final para confirmar que o job realmente terminou
                    console.log(`🎯 [AgendaWorker] Job ${job.id} FINALIZADO com sucesso`);
                } catch (error) {
                    const duration = Date.now() - jobStartTime;
                    console.error(`❌ [AgendaWorker] Erro ao processar job ${job.id} após ${duration}ms:`, error);
                    throw error; // Re-throw para o BullMQ marcar como falha
                }
            } else {
                console.log(`[AgendaWorker] Job desconhecido: ${job.name}`);
            }
        },
        { connection: redisConnection }
    );

    agendaWorker.on("active", (job: Job) => {
        console.log(`[AgendaWorker] Job ATIVO: ${job.id} (${job.name})`, job.data);
    });
    agendaWorker.on("completed", (job: Job) => {
        console.log(`✅ [AgendaWorker] Job CONCLUÍDO: ${job.id} (${job.name})`);
        console.log(`🏁 [AgendaWorker] Job ${job.id} marcado como COMPLETED pelo BullMQ`);

        // Log status das filas após conclusão
        import('../utils/queueStatus').then(({ logAllQueuesStatus }) => {
            logAllQueuesStatus().catch(err => {
                console.error('❌ Erro ao logar status das filas:', err);
            });
        });
    });
    agendaWorker.on("failed", (job: Job | undefined, error: Error) => {
        console.error(`❌ [AgendaWorker] Job FALHOU: ${job?.id} (${job?.name})`, error);
    });

    agendaWorker.on("error", (error: Error) => {
        console.error("🚨 [AgendaWorker] Worker error:", error);
    });

    // Não registrar shutdown aqui - já está sendo tratado globalmente no server.ts
    // Múltiplos handlers de SIGINT/SIGTERM podem causar conflitos

    console.log("✅ [AgendaWorker] Worker iniciado");
}
