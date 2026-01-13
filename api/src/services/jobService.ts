/**
 * Serviço para criar e gerenciar jobs
 * REFATORADO: Agora usa BullMQ ao invés de apenas tabela Job
 */

import prisma from "../prisma/client";
import { databaseJobsQueue } from "../queues/databaseJobsQueue";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { BRASILIA_TIMEZONE } from "../utils/timezone.util";

dayjs.extend(utc);
dayjs.extend(timezone);

export class JobService {
    /**
     * Cria um job genérico
     * REFATORADO: Agora agenda no BullMQ ao invés de apenas criar no banco
     */
    static async createJob(
        type: string,
        payload: Record<string, any>,
        runAt: Date = new Date(),
        options?: { maxAttempts?: number }
    ) {
        // Cria o job no banco
        const dbJob = await prisma.job.create({
            data: {
                Type: type,
                Payload: payload,
                RunAt: runAt,
                Cron: null, // ✅ REMOVIDO: Não usa mais cron
                MaxAttempts: options?.maxAttempts ?? 3,
            },
        });

        // Agenda no BullMQ com delay calculado
        if (databaseJobsQueue) {
            const nowBr = dayjs.tz(dayjs(), BRASILIA_TIMEZONE);
            const runAtBr = dayjs.tz(runAt, BRASILIA_TIMEZONE);
            const delayMs = Math.max(0, runAtBr.valueOf() - nowBr.valueOf());

            try {
                await databaseJobsQueue.add(
                    type,
                    {
                        jobId: dbJob.Id,
                        jobType: type,
                        payload: payload,
                    },
                    {
                        jobId: `db-job:${dbJob.Id}`, // ID único para evitar duplicatas
                        delay: delayMs,
                    }
                );

                console.log(
                    `✅ [JobService] Job ${dbJob.Id} (${type}) agendado no BullMQ com delay de ${delayMs}ms`
                );
            } catch (error) {
                console.error(
                    `❌ [JobService] Erro ao agendar job ${dbJob.Id} no BullMQ:`,
                    error
                );
                // Não falha a criação do job no banco se o BullMQ falhar
            }
        }

        return dbJob;
    }

    /**
     * Cria um job de notificação para um usuário
     */
    static async createNotificationJob(
        userId: string,
        message: string,
        delaySeconds?: number
    ) {
        const runAt = delaySeconds
            ? dayjs.tz(dayjs(), BRASILIA_TIMEZONE)
                  .add(delaySeconds, "second")
                  .toDate()
            : new Date();

        return this.createJob(
            "notification:user",
            { userId, message },
            runAt,
            { maxAttempts: 3 }
        );
    }

    /**
     * Busca jobs pendentes
     * DEPRECADO: Não use mais - jobs são processados via BullMQ
     */
    static async getPendingJobs(type?: string) {
        console.warn(
            "⚠️ [JobService] getPendingJobs está deprecado - jobs são processados via BullMQ"
        );
        return prisma.job.findMany({
            where: {
                Status: "pending",
                RunAt: { lte: new Date() },
                ...(type ? { Type: type } : {}),
            },
            orderBy: { RunAt: "asc" },
        });
    }

    /**
     * Marca um job como concluído
     */
    static async completeJob(jobId: string) {
        return prisma.job.update({
            where: { Id: jobId },
            data: { Status: "completed" },
        });
    }

    /**
     * Marca um job como falho
     */
    static async failJob(jobId: string, error: string) {
        return prisma.job.update({
            where: { Id: jobId },
            data: {
                Status: "failed",
                LastError: error,
            },
        });
    }
}
