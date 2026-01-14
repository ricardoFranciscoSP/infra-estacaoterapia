import { Worker, QueueEvents } from "bullmq";
import { webhookQueue } from "../queues/bullmqCentral";
import { SessionMonitoringService } from "../services/sessionMonitoring.service";
import { generateAgoraTokensForConsulta } from "../utils/scheduleAgoraToken";
import { Server as SocketServer } from "socket.io";
import { attachQueueEventsLogging } from "../utils/bullmqLogs";

let started = false;
let worker: Worker | null = null;
let events: QueueEvents | null = null;
let io: SocketServer | undefined = undefined;

/**
 * Inicializa o worker para processar jobs de sessão
 * - Geração de tokens Agora
 * - Monitoramento de presença
 * - Timer de duração da sessão
 */
export async function startSessionWorker(socketServer?: SocketServer) {
    if (started) return;
    started = true;

    if (!webhookQueue) {
        console.log("[BullMQ] Session Worker não pode ser inicializado: webhookQueue indisponível");
        return;
    }

    io = socketServer;
    const concurrency = Number(process.env.SESSION_WORKER_CONCURRENCY ?? "3");
    const sessionMonitoring = new SessionMonitoringService(io);

    worker = new Worker(
        webhookQueue.name,
        async (job) => {
            const startTime = Date.now(); // Métrica de performance, não precisa ser em Brasília

            try {
                console.log(`⏱️ [SessionWorker] Processando job ${job.id} - tipo: ${job.name}`);

                // Rotas para diferentes tipos de jobs
                switch (job.name) {
                    case "generateAgoraTokens":
                        await handleGenerateTokens(job);
                        break;

                    case "checkPresence":
                        await handleCheckPresence(job, sessionMonitoring);
                        break;

                    case "verificarPresencaConsulta":
                        await handleVerificarPresencaConsulta(job);
                        break;

                    case "sessionTimerTick":
                        await handleSessionTimerTick(job, sessionMonitoring, io);
                        break;

                    default:
                        console.warn(`[SessionWorker] Job tipo desconhecido: ${job.name}`);
                        break;
                }

                const duration = Date.now() - startTime;
                console.log(`✅ [SessionWorker] Job ${job.id} (${job.name}) concluído em ${duration}ms`);

            } catch (error: unknown) {
                const duration = Date.now() - startTime;
                console.error(
                    `❌ [SessionWorker] Erro ao processar job ${job.id} (${job.name}) após ${duration}ms:`,
                    error
                );
                throw error;
            }
        },
        {
            connection: webhookQueue.opts.connection,
            concurrency,
        }
    );

    events = new QueueEvents(webhookQueue.name, {
        connection: webhookQueue.opts.connection,
    });
    attachQueueEventsLogging(webhookQueue.name, events);

    events.on("failed", ({ jobId, failedReason }) =>
        console.error(`❌ [SessionWorker] Job failed: ${jobId} - ${failedReason}`)
    );

    events.on("completed", ({ jobId }) =>
        console.log(`✅ [SessionWorker] Job completed: ${jobId}`)
    );

    worker.on("error", (err: unknown) => {
        console.error("🚨 [SessionWorker] Worker error:", err);
    });

    const shutdown = async () => {
        console.log("🛑 Finalizando Session Worker...");
        await Promise.allSettled([worker?.close?.(), events?.close?.()]);
        console.log("👋 Session Worker finalizado.");
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    console.log("✅ Session worker iniciado com concorrência:", concurrency);
}

/**
 * Handler: Gera tokens Agora 15 segundos antes da sessão começar
 */
async function handleGenerateTokens(
    job: {
        id?: string | number;
        data: Record<string, unknown>;
    }
): Promise<void> {
    const { consultaId } = job.data as {
        consultaId: string;
    };

    if (!consultaId) {
        throw new Error("consultaId é obrigatório para gerar tokens");
    }

    try {
        console.log(`🎫 [SessionWorker] Gerando tokens para consulta ${consultaId}`);

        const success = await generateAgoraTokensForConsulta(consultaId);

        if (!success) {
            throw new Error(
                `Falha ao gerar tokens para consulta ${consultaId}`
            );
        }

        console.log(`✅ [SessionWorker] Tokens gerados com sucesso para ${consultaId}`);
    } catch (error: unknown) {
        console.error(
            `❌ [SessionWorker] Erro ao gerar tokens para ${consultaId}:`,
            error
        );
        throw error;
    }
}

/**
 * Handler: Verifica presença na sessão após 10 minutos (legado)
 */
async function handleCheckPresence(
    job: {
        id?: string | number;
        data: Record<string, unknown>;
    },
    sessionMonitoring: SessionMonitoringService
): Promise<void> {
    const { consultaId, patientId, psychologistId } = job.data as {
        consultaId: string;
        patientId: string;
        psychologistId: string;
    };

    if (!consultaId || !patientId || !psychologistId) {
        throw new Error(
            "consultaId, patientId e psychologistId são obrigatórios"
        );
    }

    try {
        console.log(
            `👁️ [SessionWorker] Verificando presença na consulta ${consultaId}`
        );

        await sessionMonitoring.checkSessionPresence(
            consultaId,
            patientId,
            psychologistId
        );

        console.log(
            `✅ [SessionWorker] Verificação de presença concluída para ${consultaId}`
        );
    } catch (error: unknown) {
        console.error(
            `❌ [SessionWorker] Erro ao verificar presença para ${consultaId}:`,
            error
        );
        throw error;
    }
}

/**
 * Handler: Verifica presença de participantes na consulta (novo)
 * Executa no início (ScheduledAt) e 10 minutos após
 */
async function handleVerificarPresencaConsulta(
    job: {
        id?: string | number;
        data: Record<string, unknown>;
    }
): Promise<void> {
    const payload = job.data as {
        consultaId: string;
        scheduledAt: string;
        tipoVerificacao: 'inicio' | '10minutos';
    };

    if (!payload.consultaId || !payload.scheduledAt || !payload.tipoVerificacao) {
        throw new Error(
            "consultaId, scheduledAt e tipoVerificacao são obrigatórios"
        );
    }

    try {
        console.log(
            `👁️ [SessionWorker] Verificando presença na consulta ${payload.consultaId} (${payload.tipoVerificacao})`
        );

        const { verificarPresencaConsulta } = await import('../jobs/verificarPresencaConsulta');
        await verificarPresencaConsulta(payload);

        console.log(
            `✅ [SessionWorker] Verificação de presença concluída para ${payload.consultaId}`
        );
    } catch (error: unknown) {
        console.error(
            `❌ [SessionWorker] Erro ao verificar presença para ${payload.consultaId}:`,
            error
        );
        throw error;
    }
}

/**
 * Handler: Processa tick do timer de duração
 * Dispara a cada segundo enquanto a sessão estiver ativa
 */
async function handleSessionTimerTick(
    job: {
        id?: string | number;
        data: Record<string, unknown>;
    },
    sessionMonitoring: SessionMonitoringService,
    socketServer: SocketServer | undefined
): Promise<void> {
    const { consultaId, tickNumber = 0 } = job.data as {
        consultaId: string;
        tickNumber?: number;
    };

    if (!consultaId) {
        throw new Error("consultaId é obrigatório para processar timer tick");
    }

    if (!socketServer) {
        console.warn(
            `[SessionWorker] Socket.io não disponível para timer tick de ${consultaId}`
        );
        return;
    }

    try {
        const tick = Math.floor(Number(tickNumber) || 0);

        // Log apenas a cada 30 segundos para não poluir logs
        if (tick % 30 === 0) {
            console.log(
                `⏱️ [SessionWorker] Processando timer tick ${tick} para consulta ${consultaId}`
            );
        }

        await sessionMonitoring.processTick(consultaId, tick, socketServer);

    } catch (error: unknown) {
        console.error(
            `❌ [SessionWorker] Erro ao processar timer tick para ${consultaId}:`,
            error
        );
        // Não re-lança erro para evitar timeout infinito do timer
    }
}

/**
 * Define o Socket.io para o worker já iniciado
 * Útil quando o Socket.io é criado após o worker já estar rodando
 */
export function setWorkerSocketServer(socketServer: SocketServer): void {
    io = socketServer;
    console.log("✅ [SessionWorker] Socket.io definido para o worker");
}
