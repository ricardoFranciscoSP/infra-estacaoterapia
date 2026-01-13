import { getRedisClient } from '../config/redis.config';
import prisma from '../prisma/client';
import { DraftSessionStatus, CreateDraftSessionPayload, ConfirmDraftSessionPayload } from '../types/draftSession.types';
import { RedisClientType } from 'redis';

let redis: RedisClientType | null = null;
async function getReadyRedis(): Promise<RedisClientType | null> {
    if (process.env.NODE_ENV === 'development') return null;
    if (!redis) redis = await getRedisClient();
    return redis;
}

export class DraftSessionService {
    static async createDraftSession(payload: CreateDraftSessionPayload): Promise<string> {
        // Busca a agenda para pegar a data correta
        const agenda = await prisma.agenda.findUnique({ where: { Id: payload.IdAgenda } });
        if (!agenda) throw new Error('Agenda não encontrada');
        const draft = await prisma.draftSession.create({
            data: {
                PsychologistId: payload.PsychologistId,
                PatientId: null,
                IdAgenda: payload.IdAgenda,
                Status: DraftSessionStatus.draft,
            },
        });
        const key = `hold:${payload.PsychologistId}:${agenda.Data.toISOString()}`;
        const redisClient = await getReadyRedis();
        if (redisClient) {
            await redisClient.set(key, draft.Id, {
                EX: 300 // 5 minutos
            });
        } // Em desenvolvimento, ignora cache Redis
        return draft.Id;
    }

    static async confirmDraftSession(payload: ConfirmDraftSessionPayload): Promise<string> {
        const draft = await prisma.draftSession.findUnique({
            where: { Id: payload.draftId }
        });
        if (!draft) throw new Error('DraftSession não encontrada');
        const key = `hold:${draft.PsychologistId}:${draft.CreatedAt.toISOString()}`;
        let redisValue: string = draft.Id;
        const redisClient = await getReadyRedis();
        if (redisClient) {
            const value = await redisClient.get(key);
            if (!value || value !== draft.Id) throw new Error('Reserva expirada ou inválida');
            redisValue = typeof value === 'string' ? value : draft.Id;
        }

        // Chama o fluxo oficial de agendamento
        const { reservation } = await (await import('./reservation.service')).ReservationService.prototype.createReservation(draft.IdAgenda, payload.patientId);

        if (redisClient) {
            await redisClient.del(key);
        }
        await prisma.draftSession.update({
            where: { Id: payload.draftId },
            data: {
                Status: DraftSessionStatus.completed,
                PatientId: payload.patientId,
            },
        });
        return reservation.Id;
    }
}
