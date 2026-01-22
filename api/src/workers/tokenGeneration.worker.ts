import { Worker } from 'bullmq';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import prisma from '../prisma/client';
import { AgendaStatus } from '../generated/prisma';
import { waitForIORedisReady } from '../config/redis.config';
import { getTokenGenerationQueue } from '../queues/tokenGenerationQueue';
import { acquireRedisLock, releaseRedisLock } from '../utils/redisLock';
import { ensureAgoraTokensForConsulta } from '../services/agoraToken.service';
import { TokenGenerationJobPayload } from '../types/tokenGeneration.types';

dayjs.extend(utc);
dayjs.extend(timezone);

const BRASILIA_TIMEZONE = 'America/Sao_Paulo';
const PROCESSING_LOCK_TTL_SECONDS = Number(process.env.TOKEN_PROCESS_LOCK_TTL_SECONDS ?? '120');

const VALID_STATUSES: AgendaStatus[] = [
    AgendaStatus.Reservado,
    AgendaStatus.Andamento,
];

let worker: Worker<TokenGenerationJobPayload> | null = null;
let started = false;

export async function startTokenGenerationWorker(): Promise<void> {
    if (started) {
        console.log('⚠️ [TokenWorker] Worker já está rodando');
        return;
    }

    const connection = await waitForIORedisReady(60000).catch((err) => {
        console.error('[TokenWorker] Redis indisponível ou não respondeu ao ping:', err);
        return null;
    });
    if (!connection) {
        console.log('[TokenWorker] Worker não inicializado: Redis indisponível.');
        return;
    }

    const queue = await getTokenGenerationQueue();
    if (!queue) {
        console.log(
            '[TokenWorker] Worker não inicializado: tokenGenerationQueue não disponível.'
        );
        return;
    }

    started = true;
    const concurrency = Number(process.env.TOKEN_WORKER_CONCURRENCY ?? '3');

    worker = new Worker<TokenGenerationJobPayload>(
        queue.name,
        async (job) => {
            const { reservaSessaoId, consultaId } = job.data;
            const now = dayjs.tz(dayjs(), BRASILIA_TIMEZONE).format('YYYY-MM-DD HH:mm:ss');

            const lockKey = `lock:token-generation:process:${reservaSessaoId}`;
            const lock = await acquireRedisLock(lockKey, PROCESSING_LOCK_TTL_SECONDS);
            if (!lock) {
                console.warn(
                    `⚠️ [TokenWorker] Lock já existe para reserva ${reservaSessaoId}. Skip.`
                );
                return;
            }

            try {
                const reserva = await prisma.reservaSessao.findUnique({
                    where: { Id: reservaSessaoId },
                    select: {
                        Id: true,
                        ConsultaId: true,
                        ScheduledAt: true,
                        Status: true,
                        AgoraTokenPatient: true,
                        AgoraTokenPsychologist: true,
                    },
                });

                if (!reserva) {
                    console.warn(
                        `⚠️ [TokenWorker] ReservaSessao não encontrada: ${reservaSessaoId}`
                    );
                    return;
                }

                if (reserva.ConsultaId !== consultaId) {
                    console.warn(
                        `⚠️ [TokenWorker] ConsultaId divergente para reserva ${reservaSessaoId}`
                    );
                }

                if (!VALID_STATUSES.includes(reserva.Status)) {
                    console.warn(
                        `⚠️ [TokenWorker] Status inválido para reserva ${reservaSessaoId}: ${reserva.Status}`
                    );
                    return;
                }

                if (reserva.AgoraTokenPatient && reserva.AgoraTokenPsychologist) {
                    console.log(
                        `ℹ️ [TokenWorker] Tokens já existem para reserva ${reservaSessaoId}`
                    );
                    return;
                }

                if (reserva.ScheduledAt && reserva.ScheduledAt > now) {
                    console.log(
                        `ℹ️ [TokenWorker] ScheduledAt ainda não chegou para ${reservaSessaoId}`
                    );
                    return;
                }

                await ensureAgoraTokensForConsulta(prisma, consultaId, {
                    source: 'cron',
                });

                console.log(
                    `✅ [TokenWorker] Tokens garantidos para consulta ${consultaId}`
                );
            } finally {
                await releaseRedisLock(lock);
            }
        },
        {
            connection,
            concurrency,
        }
    );

    worker.on('failed', (job, err) => {
        console.error(
            `❌ [TokenWorker] Job ${job?.id ?? 'unknown'} falhou:`,
            err
        );
    });

    console.log(`✅ [TokenWorker] Worker iniciado (concurrency=${concurrency})`);
}

export { worker as tokenGenerationWorker };
