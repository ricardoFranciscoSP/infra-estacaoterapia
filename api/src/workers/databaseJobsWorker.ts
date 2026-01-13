/**
 * Worker BullMQ para processar jobs da tabela Job do banco de dados
 * Substitui o polling com setTimeout por BullMQ otimizado
 */

import { Worker } from "bullmq";
import { getDatabaseJobsQueue } from "../queues/databaseJobsQueue";
import { waitForIORedisReady } from "../config/redis.config";
import prisma from "../prisma/client";
import { WebSocketNotificationService } from "../services/websocketNotification.service";
import { WebHookService } from "../services/webhook.service";
import { nowBrasiliaDate, BRASILIA_TIMEZONE } from "../utils/timezone.util";
import { notificationQueue } from "../queues/bullmqCentral";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Tipos de payloads para cada tipo de job
 */
interface NotificationUserPayload {
    userId: string;
    title: string;
    message: string;
}

interface NotificationAllPayload {
    title: string;
    message: string;
}

type JobHandler<T> = (payload: T) => Promise<void>;

interface JobHandlers {
    "notification:user": JobHandler<NotificationUserPayload>;
    "notification:all": JobHandler<NotificationAllPayload>;
    "update_status_tabelas": JobHandler<{ jobId: string }>;
    "update_status_tabelas_retry": JobHandler<{ jobId: string }>;
}

/**
 * Cria os handlers de job
 */
const createJobHandlers = (
    wsService: WebSocketNotificationService
): JobHandlers => {
    return {
        "notification:user": async (payload: NotificationUserPayload) => {
            if (notificationQueue) {
                await notificationQueue.add("notification:user", payload);
            }
        },
        "notification:all": async (payload: NotificationAllPayload) => {
            if (notificationQueue) {
                await notificationQueue.add("notification:all", payload);
            }
        },
        "update_status_tabelas": async (payload: { jobId: string }) => {
            console.log(
                `🔍 [DatabaseJobsWorker] ========== PROCESSANDO JOB 'update_status_tabelas' ==========`
            );
            console.log(`🔍 [DatabaseJobsWorker] JobId: ${payload.jobId}`);
            console.log(
                `🔍 [DatabaseJobsWorker] Timestamp: ${nowBrasiliaDate().toISOString()} (${BRASILIA_TIMEZONE})`
            );

            // O método atualizarStatusTabelasPorJob já atualiza o status do Job internamente
            await WebHookService.atualizarStatusTabelasPorJob(payload.jobId);

            console.log(
                `✅ [DatabaseJobsWorker] Job 'update_status_tabelas' concluído para jobId: ${payload.jobId}`
            );
        },
        "update_status_tabelas_retry": async (payload: { jobId: string }) => {
            console.log(
                `🔄 [DatabaseJobsWorker] ========== PROCESSANDO JOB 'update_status_tabelas_retry' ==========`
            );
            console.log(`🔄 [DatabaseJobsWorker] JobId: ${payload.jobId}`);
            console.log(
                `🔄 [DatabaseJobsWorker] Timestamp: ${nowBrasiliaDate().toISOString()} (${BRASILIA_TIMEZONE})`
            );

            // O método atualizarStatusTabelasPorJobRetry já atualiza o status do Job internamente
            await WebHookService.atualizarStatusTabelasPorJobRetry(
                payload.jobId
            );

            console.log(
                `✅ [DatabaseJobsWorker] Job 'update_status_tabelas_retry' concluído para jobId: ${payload.jobId}`
            );
        },
    };
};

let worker: Worker | null = null;
let started = false;

/**
 * Inicializa o worker de jobs do banco de dados
 */
export async function startDatabaseJobsWorker(): Promise<void> {
    if (started) {
        console.log("⚠️ [DatabaseJobsWorker] Worker já está rodando");
        return;
    }

    const connection = await waitForIORedisReady(60000).catch((err) => {
        console.error("[DatabaseJobsWorker] Redis indisponível ou não respondeu ao ping:", err);
        return null;
    });
    if (!connection) {
        console.log(
            "[DatabaseJobsWorker] Worker não inicializado: Redis indisponível."
        );
        return;
    }

    const queue = await getDatabaseJobsQueue();
    if (!queue) {
        console.log(
            "[DatabaseJobsWorker] Worker não inicializado: databaseJobsQueue não disponível."
        );
        return;
    }

    started = true;
    // Usa serviço de batching para otimizar notificações
    const { getWebSocketNotificationBatchService } = require('../services/websocketNotificationBatch.service');
    const wsService = getWebSocketNotificationBatchService();
    const handlers = createJobHandlers(wsService);
    const concurrency = Number(
        process.env.DATABASE_JOBS_WORKER_CONCURRENCY ?? "5"
    );

    worker = new Worker(
        queue.name,
        async (job) => {
            const jobStartTime = Date.now();
            const { jobId, jobType, payload } = job.data;

            console.log(
                `[DatabaseJobsWorker] INICIANDO job: ${job.id} (${jobType})`,
                { jobId }
            );

            try {
                // Busca o job no banco
                const dbJob = await prisma.job.findUnique({
                    where: { Id: jobId },
                });

                if (!dbJob) {
                    console.warn(
                        `⚠️ [DatabaseJobsWorker] Job ${jobId} não encontrado no banco`
                    );
                    return;
                }

                // Atualiza status para processing
                await prisma.job.update({
                    where: { Id: jobId },
                    data: { Status: "processing" },
                });

                const handler = handlers[jobType as keyof JobHandlers];
                if (!handler) {
                    console.warn(
                        `⚠️ [DatabaseJobsWorker] Nenhum handler registrado para o job: ${jobType}`
                    );
                    await prisma.job.update({
                        where: { Id: jobId },
                        data: {
                            Status: "failed",
                            LastError: "Handler not found",
                        },
                    });
                    return;
                }

                // Processa o job
                if (jobType === "notification:user") {
                    await (handler as JobHandler<NotificationUserPayload>)(
                        payload as NotificationUserPayload
                    );
                } else if (jobType === "notification:all") {
                    await (handler as JobHandler<NotificationAllPayload>)(
                        payload as NotificationAllPayload
                    );
                } else if (
                    jobType === "update_status_tabelas" ||
                    jobType === "update_status_tabelas_retry"
                ) {
                    await (handler as JobHandler<{ jobId: string }>)({
                        jobId,
                    });
                } else {
                    throw new Error(`Tipo de job desconhecido: ${jobType}`);
                }

                // Atualiza status para completed (se não foi atualizado pelo handler)
                if (
                    jobType !== "update_status_tabelas" &&
                    jobType !== "update_status_tabelas_retry"
                ) {
                    await prisma.job.update({
                        where: { Id: jobId },
                        data: { Status: "completed" },
                    });
                }

                const duration = Date.now() - jobStartTime;
                console.log(
                    `✅ [DatabaseJobsWorker] Job ${job.id} (${jobType}) concluído em ${duration}ms`
                );
            } catch (error: any) {
                const dbJob = await prisma.job.findUnique({
                    where: { Id: jobId },
                });

                if (!dbJob) {
                    console.error(
                        `❌ [DatabaseJobsWorker] Job ${jobId} não encontrado para atualizar erro`
                    );
                    return;
                }

                const attempts = dbJob.Attempts + 1;
                const errorMessage = error?.message || "Erro desconhecido";

                if (attempts < dbJob.MaxAttempts) {
                    // Reagenda com backoff exponencial
                    const delaySeconds = Math.min(10 * Math.pow(2, attempts), 300); // Max 5 minutos
                    const runAt = dayjs
                        .tz(dayjs(), BRASILIA_TIMEZONE)
                        .add(delaySeconds, "second")
                        .toDate();

                    await prisma.job.update({
                        where: { Id: jobId },
                        data: {
                            Status: "pending",
                            Attempts: attempts,
                            LastError: errorMessage,
                            RunAt: runAt,
                        },
                    });

                    // Reagenda no BullMQ
                    await queue.add(
                        jobType,
                        { jobId, jobType, payload },
                        {
                            jobId: `db-job:${jobId}`,
                            delay: delaySeconds * 1000,
                        }
                    );
                } else {
                    await prisma.job.update({
                        where: { Id: jobId },
                        data: {
                            Status: "failed",
                            Attempts: attempts,
                            LastError: errorMessage,
                        },
                    });
                }

                const duration = Date.now() - jobStartTime;
                console.error(
                    `❌ [DatabaseJobsWorker] Erro ao processar job ${jobType} após ${duration}ms:`,
                    errorMessage
                );
                throw error; // Re-throw para que BullMQ tente novamente
            }
        },
        { connection, concurrency }
    );

    worker.on("active", (job) => {
        console.log(
            `[DatabaseJobsWorker] Job ATIVO: ${job.id} (${job.name})`,
            job.data
        );
    });

    worker.on("completed", (job) => {
        console.log(
            `✅ [DatabaseJobsWorker] Job CONCLUÍDO: ${job.id} (${job.name})`
        );
    });

    worker.on("failed", (job, error) => {
        console.error(
            `❌ [DatabaseJobsWorker] Job FALHOU: ${job?.id} (${job?.name})`,
            error
        );
    });

    console.log("🚀 [DatabaseJobsWorker] Worker iniciado (BullMQ - zero polling)");
}

/**
 * Para o worker
 */
export async function stopDatabaseJobsWorker(): Promise<void> {
    if (worker) {
        await worker.close();
        worker = null;
        started = false;
        console.log("🛑 [DatabaseJobsWorker] Worker parado");
    }
}

