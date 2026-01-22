import cron from 'node-cron';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import prisma from '../prisma/client';
import { AgendaStatus } from '../generated/prisma';
import { getTokenGenerationQueue } from '../queues/tokenGenerationQueue';
import { acquireRedisLock, releaseRedisLock } from '../utils/redisLock';
import { TokenGenerationJobPayload } from '../types/tokenGeneration.types';

dayjs.extend(utc);
dayjs.extend(timezone);

const BRASILIA_TIMEZONE = 'America/Sao_Paulo';

const CRON_INTERVAL = process.env.TOKEN_CRON_INTERVAL ?? '*/1 * * * *';
const CRON_BATCH_SIZE = Number(process.env.TOKEN_CRON_BATCH_SIZE ?? '100');
const ENQUEUE_LOCK_TTL_SECONDS = Number(process.env.TOKEN_LOCK_TTL_SECONDS ?? '60');

const VALID_STATUSES: AgendaStatus[] = [
    AgendaStatus.Reservado,
    AgendaStatus.Andamento,
];

export async function scanAndEnqueueTokenGenerationJobs(): Promise<void> {
    const now = dayjs.tz(dayjs(), BRASILIA_TIMEZONE);
    const nowStr = now.format('YYYY-MM-DD HH:mm:ss');

    const queue = await getTokenGenerationQueue();
    if (!queue) {
        console.warn('[TokenCron] Fila indisponível. Skip desta execução.');
        return;
    }

    /**
     * Query SQL equivalente (otimizada):
     * SELECT "Id", "ConsultaId", "ScheduledAt"
     * FROM "ReservaSessao"
     * WHERE "ScheduledAt" IS NOT NULL
     *   AND "ScheduledAt" <= $1
     *   AND "Status" IN ('Reservado', 'Andamento')
     *   AND ("AgoraTokenPatient" IS NULL OR "AgoraTokenPatient" = ''
     *     OR "AgoraTokenPsychologist" IS NULL OR "AgoraTokenPsychologist" = '')
     * ORDER BY "ScheduledAt" ASC
     * LIMIT $2;
     */
    const reservas = await prisma.reservaSessao.findMany({
        where: {
            ScheduledAt: {
                not: null,
                lte: nowStr,
            },
            Status: {
                in: VALID_STATUSES,
            },
            OR: [
                { AgoraTokenPatient: null },
                { AgoraTokenPatient: '' },
                { AgoraTokenPsychologist: null },
                { AgoraTokenPsychologist: '' },
            ],
        },
        select: {
            Id: true,
            ConsultaId: true,
            ScheduledAt: true,
            Status: true,
        },
        orderBy: {
            ScheduledAt: 'asc',
        },
        take: CRON_BATCH_SIZE,
    });

    if (reservas.length === 0) {
        return;
    }

    console.log(
        `[TokenCron] Encontradas ${reservas.length} reservas para enfileirar`,
        { now: nowStr }
    );

    for (const reserva of reservas) {
        const lockKey = `lock:token-generation:enqueue:${reserva.Id}`;
        const lock = await acquireRedisLock(lockKey, ENQUEUE_LOCK_TTL_SECONDS);
        if (!lock) {
            continue;
        }

        const jobId = `token-gen-${reserva.Id}`;
        try {
            const existingJob = await queue.getJob(jobId);
            if (existingJob) {
                const state = await existingJob.getState();
                if (['waiting', 'active', 'delayed', 'paused'].includes(state)) {
                    continue;
                }
                if (state === 'completed') {
                    continue;
                }
                if (state === 'failed') {
                    await existingJob.remove();
                }
            }

            const payload: TokenGenerationJobPayload = {
                reservaSessaoId: reserva.Id,
                consultaId: reserva.ConsultaId,
                scheduledAt: reserva.ScheduledAt ?? null,
                source: 'cron',
                enqueuedAt: now.toISOString(),
            };

            await queue.add('generate-agora-token', payload, {
                jobId,
            });
        } catch (error) {
            console.error(
                `❌ [TokenCron] Erro ao enfileirar consulta ${reserva.ConsultaId}:`,
                error
            );
            await releaseRedisLock(lock);
        }
    }
}

export function startTokenGenerationCron(): void {
    if (!cron.validate(CRON_INTERVAL)) {
        throw new Error(`[TokenCron] CRON inválido: ${CRON_INTERVAL}`);
    }

    cron.schedule(CRON_INTERVAL, async () => {
        try {
            await scanAndEnqueueTokenGenerationJobs();
        } catch (error) {
            console.error('[TokenCron] Erro na execução do cron:', error);
        }
    });

    console.log(`✅ [TokenCron] Cron iniciado (${CRON_INTERVAL})`);
}
