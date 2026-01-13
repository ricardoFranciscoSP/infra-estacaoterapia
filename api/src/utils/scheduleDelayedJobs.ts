/**
 * Utilitários para agendar delayed jobs quando entidades são criadas
 * Zero polling - cada job é agendado UMA ÚNICA VEZ
 */

import { delayedJobsQueue } from "../queues/delayedJobsQueue";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { BRASILIA_TIMEZONE } from "./timezone.util";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Agenda job de expiração de compra (30 minutos após criação)
 */
export async function schedulePurchaseExpiration(
    purchaseId: string,
    createdAt: Date
): Promise<void> {
    if (!delayedJobsQueue) {
        console.log(
            "[scheduleDelayedJobs] Não agendando expiração de compra: delayedJobsQueue não inicializada."
        );
        return;
    }

    try {
        const createdAtBr = dayjs.tz(createdAt, BRASILIA_TIMEZONE);
        const expirationTime = createdAtBr.add(30, "minute");
        const nowBr = dayjs.tz(dayjs(), BRASILIA_TIMEZONE);
        const delayMs = Math.max(0, expirationTime.valueOf() - nowBr.valueOf());

        // JobId único para evitar duplicatas
        const jobId = `expire-purchase:${purchaseId}`;

        await delayedJobsQueue.add(
            "expire-purchase",
            { purchaseId },
            {
                jobId,
                delay: delayMs,
            }
        );

        console.log(
            `✅ [scheduleDelayedJobs] Job de expiração agendado para compra ${purchaseId} em ${delayMs}ms (${expirationTime.format("YYYY-MM-DD HH:mm:ss")})`
        );
    } catch (error) {
        console.error(
            `❌ [scheduleDelayedJobs] Erro ao agendar expiração de compra ${purchaseId}:`,
            error
        );
    }
}

/**
 * Agenda jobs de cancelamento e finalização quando consulta é criada
 * - Cancelamento por no-show: 10 minutos após ScheduledAt
 * - Finalização: 50 minutos após ScheduledAt
 */
export async function scheduleConsultationJobs(
    consultationId: string,
    scheduledAt: string | Date
): Promise<void> {
    if (!delayedJobsQueue) {
        console.log(
            "[scheduleDelayedJobs] Não agendando jobs de consulta: delayedJobsQueue não inicializada."
        );
        return;
    }

    try {
        // Converte ScheduledAt para Date se for string
        const scheduledAtDate =
            typeof scheduledAt === "string"
                ? dayjs.tz(scheduledAt, "YYYY-MM-DD HH:mm:ss", BRASILIA_TIMEZONE).toDate()
                : scheduledAt;

        const scheduledAtBr = dayjs.tz(scheduledAtDate, BRASILIA_TIMEZONE);
        const nowBr = dayjs.tz(dayjs(), BRASILIA_TIMEZONE);

        // Job de cancelamento por no-show: 10 minutos após ScheduledAt
        const cancelTime = scheduledAtBr.add(10, "minute");
        const cancelDelayMs = Math.max(0, cancelTime.valueOf() - nowBr.valueOf());

        // Job de finalização: 50 minutos após ScheduledAt
        const finalizeTime = scheduledAtBr.add(50, "minute");
        const finalizeDelayMs = Math.max(0, finalizeTime.valueOf() - nowBr.valueOf());

        // JobIds únicos para evitar duplicatas
        const cancelJobId = `cancel-consultation-no-show:${consultationId}`;
        const finalizeJobId = `finalize-consultation:${consultationId}`;

        // Só agenda se o horário ainda não passou
        if (cancelDelayMs > 0) {
            await delayedJobsQueue.add(
                "cancel-consultation-no-show",
                { consultationId },
                {
                    jobId: cancelJobId,
                    delay: cancelDelayMs,
                }
            );

            console.log(
                `✅ [scheduleDelayedJobs] Job de cancelamento por no-show agendado para consulta ${consultationId} em ${cancelDelayMs}ms (${cancelTime.format("YYYY-MM-DD HH:mm:ss")})`
            );
        } else {
            console.log(
                `⚠️ [scheduleDelayedJobs] Horário de cancelamento já passou para consulta ${consultationId} - não agendando`
            );
        }

        if (finalizeDelayMs > 0) {
            await delayedJobsQueue.add(
                "finalize-consultation",
                { consultationId },
                {
                    jobId: finalizeJobId,
                    delay: finalizeDelayMs,
                }
            );

            console.log(
                `✅ [scheduleDelayedJobs] Job de finalização agendado para consulta ${consultationId} em ${finalizeDelayMs}ms (${finalizeTime.format("YYYY-MM-DD HH:mm:ss")})`
            );
        } else {
            console.log(
                `⚠️ [scheduleDelayedJobs] Horário de finalização já passou para consulta ${consultationId} - não agendando`
            );
        }
    } catch (error) {
        console.error(
            `❌ [scheduleDelayedJobs] Erro ao agendar jobs de consulta ${consultationId}:`,
            error
        );
    }
}

/**
 * Remove jobs pendentes de uma consulta (quando cancelada ou reagendada)
 */
export async function removeConsultationJobs(
    consultationId: string
): Promise<void> {
    if (!delayedJobsQueue) {
        return;
    }

    try {
        const cancelJobId = `cancel-consultation-no-show:${consultationId}`;
        const finalizeJobId = `finalize-consultation:${consultationId}`;

        // Remove jobs pendentes
        const cancelJob = await delayedJobsQueue.getJob(cancelJobId);
        const finalizeJob = await delayedJobsQueue.getJob(finalizeJobId);

        if (cancelJob) {
            await cancelJob.remove();
            console.log(
                `✅ [scheduleDelayedJobs] Job de cancelamento removido para consulta ${consultationId}`
            );
        }

        if (finalizeJob) {
            await finalizeJob.remove();
            console.log(
                `✅ [scheduleDelayedJobs] Job de finalização removido para consulta ${consultationId}`
            );
        }
    } catch (error) {
        console.error(
            `❌ [scheduleDelayedJobs] Erro ao remover jobs de consulta ${consultationId}:`,
            error
        );
    }
}

/**
 * Agenda expiração de consulta após cancelamento de plano (30 dias)
 */
export async function scheduleConsultationExpirationAfterPlanCancellation(
    consultationId: string,
    expirationDate: Date
): Promise<void> {
    if (!delayedJobsQueue) {
        console.log(
            "[scheduleDelayedJobs] Não agendando expiração de consulta: delayedJobsQueue não inicializada."
        );
        return;
    }

    try {
        const expirationDateBr = dayjs.tz(expirationDate, BRASILIA_TIMEZONE);
        const nowBr = dayjs.tz(dayjs(), BRASILIA_TIMEZONE);
        const delayMs = Math.max(0, expirationDateBr.valueOf() - nowBr.valueOf());

        // JobId único para evitar duplicatas
        const jobId = `expire-consultation-after-plan-cancellation:${consultationId}`;

        await delayedJobsQueue.add(
            "expire-consultation-after-plan-cancellation",
            {
                consultationId,
                expirationDate: expirationDateBr.format("YYYY-MM-DD"),
            },
            {
                jobId,
                delay: delayMs,
            }
        );

        console.log(
            `✅ [scheduleDelayedJobs] Job de expiração agendado para consulta ${consultationId} em ${delayMs}ms (${expirationDateBr.format("YYYY-MM-DD HH:mm:ss")})`
        );
    } catch (error) {
        console.error(
            `❌ [scheduleDelayedJobs] Erro ao agendar expiração de consulta ${consultationId}:`,
            error
        );
    }
}

/**
 * Agenda expiração de assinatura de plano quando DataFim é atingida
 */
export async function schedulePlanSubscriptionExpiration(
    assinaturaPlanoId: string,
    dataFim: Date
): Promise<void> {
    if (!delayedJobsQueue) {
        console.log(
            "[scheduleDelayedJobs] Não agendando expiração de assinatura: delayedJobsQueue não inicializada."
        );
        return;
    }

    try {
        const dataFimBr = dayjs.tz(dataFim, BRASILIA_TIMEZONE);
        const nowBr = dayjs.tz(dayjs(), BRASILIA_TIMEZONE);
        const delayMs = Math.max(0, dataFimBr.valueOf() - nowBr.valueOf());

        // JobId único para evitar duplicatas
        const jobId = `expire-plan-subscription:${assinaturaPlanoId}`;

        await delayedJobsQueue.add(
            "expire-plan-subscription",
            { assinaturaPlanoId },
            {
                jobId,
                delay: delayMs,
            }
        );

        console.log(
            `✅ [scheduleDelayedJobs] Job de expiração agendado para assinatura ${assinaturaPlanoId} em ${delayMs}ms (${dataFimBr.format("YYYY-MM-DD HH:mm:ss")})`
        );
    } catch (error) {
        console.error(
            `❌ [scheduleDelayedJobs] Erro ao agendar expiração de assinatura ${assinaturaPlanoId}:`,
            error
        );
    }
}

