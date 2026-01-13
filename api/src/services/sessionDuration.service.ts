import { Server as SocketServer } from 'socket.io';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { getRedisClient } from '../config/redis.config';
import { getWebhookQueue } from '../workers/worker.webhook';
import prisma from '../prisma/client';
import type { RedisClientType } from 'redis';

dayjs.extend(utc);
dayjs.extend(timezone);

interface SessionDuration {
    consultaId: string;
    startTime: number;
    endTime?: number;
    status: 'active' | 'paused' | 'ended';
}

/**
 * Serviço para gerenciar duração de sessões em tempo real
 * Utiliza Redis para armazenar estado e Socket.io para notificar clientes
 * Dispara eventos de timer a cada segundo automaticamente
 */
export class SessionDurationService {
    private io: SocketServer | null = null;
    private redisClient: RedisClientType | null = null;
    private redisKey = (consultaId: string) => `session:duration:${consultaId}`;
    private timerKey = (consultaId: string) => `session:timer:${consultaId}`;

    constructor(io?: SocketServer) {
        this.io = io || null;
    }

    private async getRedis(): Promise<RedisClientType> {
        if (!this.redisClient) {
            this.redisClient = await getRedisClient();
        }
        return this.redisClient;
    }

    /**
     * Inicia a duração da sessão no Redis
     * Agenda jobs para disparar eventos de timer
     */
    async initializeSessionDuration(
        consultaId: string,
        scheduledAt: string,
        io: SocketServer
    ): Promise<void> {
        try {
            this.io = io;

            const scheduled = dayjs.tz(scheduledAt, 'America/Sao_Paulo');
            const startTime = scheduled.valueOf();

            // Armazena dados da sessão no Redis
            const sessionData: SessionDuration = {
                consultaId,
                startTime,
                status: 'active'
            };

            const redis = await this.getRedis();
            await redis.setEx(
                this.redisKey(consultaId),
                86400, // 24 horas de TTL
                JSON.stringify(sessionData)
            );

            console.log(`⏱️ [SessionDuration] Sessão iniciada no Redis para consulta ${consultaId}`);

            // Agenda job para disparar timer a cada segundo
            await this.scheduleTimerJobs(consultaId, scheduledAt);

        } catch (error) {
            console.error(`[SessionDuration] Erro ao inicializar duração da sessão:`, error);
        }
    }

    /**
     * Agenda jobs para disparar eventos de timer a cada segundo
     * Começa no horário agendado e continua até 2 horas depois
     */
    private async scheduleTimerJobs(
        consultaId: string,
        scheduledAt: string
    ): Promise<void> {
        try {
            const webhookQueue = getWebhookQueue();
            if (!webhookQueue) {
                console.error(`[SessionDuration] WebhookQueue não disponível`);
                return;
            }

            const scheduled = dayjs.tz(scheduledAt, 'America/Sao_Paulo');
            const now = dayjs.tz(dayjs(), 'America/Sao_Paulo');
            const startDelay = Math.max(0, scheduled.valueOf() - now.valueOf());

            // Cria job que disparará a cada segundo por até 2 horas
            await webhookQueue.add(
                'sessionTimerTick',
                {
                    consultaId,
                    scheduledAt,
                    tickNumber: 0
                },
                {
                    delay: startDelay,
                    jobId: `timer-start-${consultaId}`,
                    removeOnComplete: {
                        age: 7200, // Remove após 2 horas
                    },
                }
            );

            console.log(
                `✅ [SessionDuration] Jobs de timer agendados para consulta ${consultaId}. ` +
                `Início em ${Math.floor(startDelay / 1000)}s`
            );

        } catch (error) {
            console.error(`[SessionDuration] Erro ao agendar timer jobs:`, error);
        }
    }

    /**
     * Processa tick do timer (chamado a cada segundo)
     * Emite evento via Socket.io para todos os clientes da sala
     */
    async processTick(
        consultaId: string,
        tickNumber: number,
        io: SocketServer
    ): Promise<void> {
        try {
            this.io = io;

            // Recupera dados da sessão do Redis
            const redis = await this.getRedis();
            const sessionDataStr = await redis.get(this.redisKey(consultaId));
            if (!sessionDataStr) {
                console.warn(`[SessionDuration] Sessão não encontrada no Redis: ${consultaId}`);
                return;
            }

            const sessionData: SessionDuration = JSON.parse(sessionDataStr);

            // Se sessão não está ativa, interrompe
            if (sessionData.status !== 'active') {
                console.log(`[SessionDuration] Sessão não está ativa para ${consultaId}`);
                return;
            }

            // Calcula duração em segundos
            const elapsedSeconds = tickNumber;
            const elapsedMinutes = Math.floor(elapsedSeconds / 60);
            const remainingSeconds = elapsedSeconds % 60;

            // Formata tempo: MM:SS
            const formattedTime = `${String(elapsedMinutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;

            // Emite evento para a sala da consulta
            this.emitTimerUpdate(consultaId, {
                elapsedSeconds,
                elapsedMinutes,
                remainingSeconds,
                formattedTime,
                tickNumber,
                timestamp: new Date().toISOString()
            });

            // Verifica se passou de 2 horas (limite da sessão)
            const maxDuration = 7200; // 2 horas em segundos
            if (elapsedSeconds >= maxDuration) {
                await this.endSessionDuration(consultaId);
                console.log(`⏱️ [SessionDuration] Sessão atingiu duração máxima (2h)`);
                return;
            }

            // Agenda próximo tick (1 segundo depois)
            await this.scheduleNextTick(consultaId, tickNumber + 1);

        } catch (error) {
            console.error(`[SessionDuration] Erro ao processar tick:`, error);
        }
    }

    /**
     * Agenda o próximo tick do timer
     */
    private async scheduleNextTick(
        consultaId: string,
        nextTickNumber: number
    ): Promise<void> {
        try {
            const webhookQueue = getWebhookQueue();
            if (!webhookQueue) {
                console.error(`[SessionDuration] WebhookQueue não disponível para próximo tick`);
                return;
            }

            await webhookQueue.add(
                'sessionTimerTick',
                {
                    consultaId,
                    tickNumber: nextTickNumber
                },
                {
                    delay: 1000, // 1 segundo
                    jobId: `timer-tick-${consultaId}-${nextTickNumber}`,
                    removeOnComplete: true,
                }
            );

        } catch (error) {
            console.error(`[SessionDuration] Erro ao agendar próximo tick:`, error);
        }
    }

    /**
     * Emite atualização de timer via Socket.io
     */
    private emitTimerUpdate(
        consultaId: string,
        timerData: {
            elapsedSeconds: number;
            elapsedMinutes: number;
            remainingSeconds: number;
            formattedTime: string;
            tickNumber: number;
            timestamp: string;
        }
    ): void {
        try {
            if (!this.io) {
                console.warn(`[SessionDuration] Socket.io não disponível para emitir timer`);
                return;
            }

            const roomName = `consultation:${consultaId}`;

            // Emite para todos na sala da consulta
            this.io.to(roomName).emit('session:timer-update', {
                consultaId,
                ...timerData
            });

            // Log a cada 30 segundos para não poluir logs
            if (timerData.tickNumber % 30 === 0) {
                console.log(
                    `⏱️ [SessionDuration] Timer atualizado: ${timerData.formattedTime} ` +
                    `(consulta: ${consultaId})`
                );
            }

        } catch (error) {
            console.error(`[SessionDuration] Erro ao emitir timer update:`, error);
        }
    }

    /**
     * Pausa a duração da sessão
     */
    async pauseSessionDuration(consultaId: string): Promise<void> {
        try {
            const redis = await this.getRedis();
            const sessionDataStr = await redis.get(this.redisKey(consultaId));
            if (!sessionDataStr) {
                console.warn(`[SessionDuration] Sessão não encontrada para pausar: ${consultaId}`);
                return;
            }

            const sessionData: SessionDuration = JSON.parse(sessionDataStr);
            sessionData.status = 'paused';

            await redis.setEx(
                this.redisKey(consultaId),
                86400,
                JSON.stringify(sessionData)
            );

            console.log(`⏸️ [SessionDuration] Sessão pausada: ${consultaId}`);

        } catch (error) {
            console.error(`[SessionDuration] Erro ao pausar duração:`, error);
        }
    }

    /**
     * Retoma a duração da sessão
     */
    async resumeSessionDuration(consultaId: string): Promise<void> {
        try {
            const redis = await this.getRedis();
            const sessionDataStr = await redis.get(this.redisKey(consultaId));
            if (!sessionDataStr) {
                console.warn(`[SessionDuration] Sessão não encontrada para retomar: ${consultaId}`);
                return;
            }

            const sessionData: SessionDuration = JSON.parse(sessionDataStr);
            sessionData.status = 'active';

            await redis.setEx(
                this.redisKey(consultaId),
                86400,
                JSON.stringify(sessionData)
            );

            console.log(`▶️ [SessionDuration] Sessão retomada: ${consultaId}`);

        } catch (error) {
            console.error(`[SessionDuration] Erro ao retomar duração:`, error);
        }
    }

    /**
     * Encerra a duração da sessão
     */
    async endSessionDuration(consultaId: string): Promise<void> {
        try {
            const redis = await this.getRedis();
            const sessionDataStr = await redis.get(this.redisKey(consultaId));
            if (!sessionDataStr) {
                console.warn(`[SessionDuration] Sessão não encontrada para encerrar: ${consultaId}`);
                return;
            }

            const sessionData: SessionDuration = JSON.parse(sessionDataStr);
            sessionData.status = 'ended';
            sessionData.endTime = Date.now();

            // Persiste status final por 1 hora antes de deletar
            await redis.setEx(
                this.redisKey(consultaId),
                3600,
                JSON.stringify(sessionData)
            );

            if (this.io) {
                const roomName = `consultation:${consultaId}`;
                this.io.to(roomName).emit('session:ended', {
                    consultaId,
                    endTime: new Date().toISOString()
                });
            }

            console.log(`🏁 [SessionDuration] Sessão encerrada: ${consultaId}`);

        } catch (error) {
            console.error(`[SessionDuration] Erro ao encerrar duração:`, error);
        }
    }

    /**
     * Obtém a duração atual da sessão
     */
    async getSessionDuration(consultaId: string): Promise<SessionDuration | null> {
        try {
            const redis = await this.getRedis();
            const sessionDataStr = await redis.get(this.redisKey(consultaId));
            if (!sessionDataStr) {
                return null;
            }

            return JSON.parse(sessionDataStr) as SessionDuration;

        } catch (error) {
            console.error(`[SessionDuration] Erro ao obter duração:`, error);
            return null;
        }
    }

    /**
     * Limpa dados da sessão do Redis
     */
    async cleanupSession(consultaId: string): Promise<void> {
        try {
            const redis = await this.getRedis();
            await redis.del(this.redisKey(consultaId));
            await redis.del(this.timerKey(consultaId));
            console.log(`🧹 [SessionDuration] Sessão limpa do Redis: ${consultaId}`);

        } catch (error) {
            console.error(`[SessionDuration] Erro ao limpar sessão:`, error);
        }
    }
}
