import { getWebhookQueue } from '../workers/worker.webhook';
import prisma from '../prisma/client';
import dayjs, { Dayjs } from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

const BRASILIA_TIMEZONE = 'America/Sao_Paulo';

interface ScheduledTimeInfo {
    scheduledTime: Dayjs;
    source: 'ReservaSessao' | 'Agenda';
    sourceId: string;
}

/**
 * Obtém o horário agendado da consulta com fallback para Agenda
 * IMPORTANTE: SEMPRE respeita o campo ScheduledAt da ReservaSessao quando existir,
 * independente do horário ser "quebrado" (ex: 10:15, 14:30, etc.)
 * Fallback para Agenda (Data + Horario) APENAS quando ScheduledAt não existir
 * Sempre trabalha com timezone de Brasília
 */
async function getScheduledTime(consultaId: string): Promise<ScheduledTimeInfo | null> {
    try {
        // SEMPRE tenta primeiro com ReservaSessao.ScheduledAt (prioridade absoluta)
        // Isso garante que horários "quebrados" (ex: 10:15) sejam respeitados exatamente como estão
        const reservaSessao = await prisma.reservaSessao.findUnique({
            where: { ConsultaId: consultaId },
            select: {
                ScheduledAt: true,
                Id: true,
                Consulta: {
                    select: {
                        AgendaId: true,
                    },
                },
            },
        });

        // Se ScheduledAt existe, SEMPRE usa ele (nunca faz fallback para Agenda)
        // Isso garante que horários "quebrados" como 10:15 sejam respeitados
        if (reservaSessao?.ScheduledAt) {
            // 🎯 IMPORTANTE: Especifica o formato explicitamente para suportar horários "quebrados" (ex: 15:40:00)
            // ScheduledAt está no formato 'YYYY-MM-DD HH:mm:ss' (ex: '2026-01-05 15:40:00')
            const scheduledTime = dayjs.tz(
                reservaSessao.ScheduledAt,
                'YYYY-MM-DD HH:mm:ss',
                BRASILIA_TIMEZONE
            );

            // Valida se o ScheduledAt foi parseado corretamente
            if (!scheduledTime.isValid()) {
                console.error(
                    `[getScheduledTime] ScheduledAt inválido para consulta ${consultaId}: ${reservaSessao.ScheduledAt}`
                );
                // Mesmo com erro, não faz fallback - mantém a regra de sempre usar ScheduledAt quando existir
                return null;
            }

            console.log(
                `[getScheduledTime] ScheduledAt encontrado em ReservaSessao para consulta ${consultaId}:`,
                `${reservaSessao.ScheduledAt} -> ${scheduledTime.format('YYYY-MM-DD HH:mm:ss')} (${BRASILIA_TIMEZONE})`
            );

            return {
                scheduledTime,
                source: 'ReservaSessao',
                sourceId: reservaSessao.Id,
            };
        }

        // Fallback: Tenta com Agenda (Data + Horario) APENAS quando ScheduledAt não existe
        // Este fallback NUNCA é usado se ScheduledAt existir (mesmo que seja null ou vazio)
        if (reservaSessao?.Consulta?.AgendaId) {
            const agenda = await prisma.agenda.findUnique({
                where: { Id: reservaSessao.Consulta.AgendaId },
                select: {
                    Data: true,
                    Horario: true,
                    Id: true,
                },
            });

            if (agenda?.Data && agenda?.Horario) {
                // Data está no formato: "2025-12-26 03:00:00", Horario está no formato: "14:00"
                // Extrair a data e combinar com o horário
                const datePart = dayjs(agenda.Data).format('YYYY-MM-DD');
                const combinedDateTime = `${datePart} ${agenda.Horario}:00`;

                const scheduledTime = dayjs.tz(combinedDateTime, BRASILIA_TIMEZONE);

                console.log(
                    `[getScheduledTime] ScheduledAt obtido de Agenda para consulta ${consultaId}:`,
                    scheduledTime.format('YYYY-MM-DD HH:mm:ss')
                );

                return {
                    scheduledTime,
                    source: 'Agenda',
                    sourceId: agenda.Id,
                };
            }
        }

        console.warn(
            `[getScheduledTime] Não foi possível obter ScheduledAt para consulta ${consultaId}`
        );
        return null;
    } catch (error) {
        console.error(
            `[getScheduledTime] Erro ao obter tempo agendado para consulta ${consultaId}:`,
            error
        );
        return null;
    }
}

/**
 * Agenda a geração de tokens Agora para uma consulta no horário exato com timezone de Brasília
 * 
 * REGRA FUNDAMENTAL: SEMPRE respeita ReservaSessao.ScheduledAt quando existir,
 * independente do horário ser "quebrado" (ex: 10:15, 14:30, 16:45, etc.)
 * O ScheduledAt é usado EXATAMENTE como está armazenado no banco.
 * 
 * Fallback para Agenda (Data + Horario) APENAS quando ScheduledAt não existir.
 * Usa Redis com delay calculado em timezone de Brasília
 *
 * @param consultaId - ID da consulta
 * @returns Promise<boolean> - true se agendado com sucesso
 */
export async function scheduleAgoraTokenGenerationWithFallback(
    consultaId: string
): Promise<boolean> {
    try {
        const timeInfo = await getScheduledTime(consultaId);

        if (!timeInfo) {
            console.warn(
                `[scheduleAgoraTokenWithFallback] Não foi possível obter horário agendado para consulta ${consultaId}`
            );
            return false;
        }

        const now = dayjs.tz(dayjs(), BRASILIA_TIMEZONE);

        // Calcula o delay: tokens devem ser gerados EXATAMENTE no início da reserva (ScheduledAt)
        // O job será executado no horário exato do ScheduledAt
        const delayMs = Math.max(0, timeInfo.scheduledTime.valueOf() - now.valueOf());

        console.log(
            `[scheduleAgoraTokenWithFallback] Agendando geração de tokens para consulta ${consultaId}`,
            {
                source: timeInfo.source,
                scheduledTime: timeInfo.scheduledTime.format('YYYY-MM-DD HH:mm:ss'),
                timezone: BRASILIA_TIMEZONE,
                currentTime: now.format('YYYY-MM-DD HH:mm:ss'),
                delayMs,
                delaySeconds: Math.floor(delayMs / 1000),
                delayMinutes: Math.floor(delayMs / (1000 * 60)),
            }
        );

        // Tenta agendar no Redis
        try {
            const webhookQueue = getWebhookQueue();
            if (!webhookQueue) {
                console.warn(
                    `[scheduleAgoraTokenWithFallback] WebhookQueue não disponível para consulta ${consultaId}`
                );
                return false;
            }

            // Redis não suporta delays maiores que 7 dias
            const MAX_DELAY_DAYS = 7;
            const maxDelayMs = MAX_DELAY_DAYS * 24 * 60 * 60 * 1000;

            if (delayMs > maxDelayMs) {
                console.log(
                    `[scheduleAgoraTokenWithFallback] Delay muito grande para Redis (${Math.floor(
                        delayMs / (24 * 60 * 60 * 1000)
                    )} dias), será processado pelo cron fallback`
                );
                return false;
            }

            // Se o horário já passou ou está muito próximo (menos de 1 segundo), gera imediatamente
            // Caso contrário, agenda para o horário exato do ScheduledAt
            if (delayMs <= 1000) {
                console.log(
                    `[scheduleAgoraTokenWithFallback] Horário passou ou está muito próximo (${delayMs}ms), gerando tokens imediatamente`
                );
                const { generateAgoraTokensForConsulta } = await import(
                    './scheduleAgoraToken'
                );
                return await generateAgoraTokensForConsulta(consultaId);
            }

            // ✅ Agenda para o horário EXATO do ScheduledAt (não antes, não depois)
            // O delay já foi calculado corretamente para o horário exato
            console.log(
                `[scheduleAgoraTokenWithFallback] Agendando job para executar EXATAMENTE no ScheduledAt: ${timeInfo.scheduledTime.format('YYYY-MM-DD HH:mm:ss')}`
            );

            // Agenda no Redis
            await webhookQueue.add(
                'generateAgoraTokens',
                { consultaId },
                {
                    delay: delayMs,
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 5000,
                    },
                    jobId: `agora-token-${consultaId}`,
                    removeOnComplete: { age: 3600 },
                    removeOnFail: { age: 86400 },
                }
            );

            console.log(
                `✅ [scheduleAgoraTokenWithFallback] Job agendado com sucesso para consulta ${consultaId}`
            );
            return true;
        } catch (redisError) {
            console.error(
                `[scheduleAgoraTokenWithFallback] Erro ao agendar no Redis para consulta ${consultaId}:`,
                redisError
            );
            return false;
        }
    } catch (error) {
        console.error(
            `[scheduleAgoraTokenWithFallback] Erro geral ao agendar para consulta ${consultaId}:`,
            error
        );
        return false;
    }
}

/**
 * Obtém o horário de geração automática de agenda da configuração
 * Formato esperado no banco: "01:00" (HH:mm)
 * Retorna um objeto Dayjs ajustado para hoje com o horário especificado
 */
export async function getScheduledAgendaGenerationTime(): Promise<Dayjs | null> {
    try {
        const config = await prisma.configuracao.findFirst({
            select: { horarioGeracaoAutomaticaAgenda: true },
        });

        if (!config?.horarioGeracaoAutomaticaAgenda) {
            console.warn('[getScheduledAgendaGenerationTime] horarioGeracaoAutomaticaAgenda não configurado');
            return null;
        }

        // Transforma "01:00" em objeto Dayjs para hoje
        const [hours, minutes] = config.horarioGeracaoAutomaticaAgenda
            .split(':')
            .map((part) => parseInt(part, 10));

        if (isNaN(hours) || isNaN(minutes)) {
            console.error(
                `[getScheduledAgendaGenerationTime] Formato inválido: ${config.horarioGeracaoAutomaticaAgenda}`
            );
            return null;
        }

        const scheduledTime = dayjs.tz(dayjs(), BRASILIA_TIMEZONE)
            .hour(hours)
            .minute(minutes)
            .second(0)
            .millisecond(0);

        console.log(
            `[getScheduledAgendaGenerationTime] Horário de geração de Agenda: ${scheduledTime.format(
                'YYYY-MM-DD HH:mm:ss'
            )} (${BRASILIA_TIMEZONE})`
        );

        return scheduledTime;
    } catch (error) {
        console.error(
            '[getScheduledAgendaGenerationTime] Erro ao obter horário de geração:',
            error
        );
        return null;
    }
}

/**
 * Calcula o delay em ms até o próximo horário de execução diária
 */
export async function getDelayForNextAgendaGeneration(): Promise<number | null> {
    try {
        const scheduledTime = await getScheduledAgendaGenerationTime();
        if (!scheduledTime) return null;

        const now = dayjs.tz(dayjs(), BRASILIA_TIMEZONE);
        let targetTime = scheduledTime;

        // Se o horário de hoje já passou, agendar para amanhã
        if (targetTime.isBefore(now)) {
            targetTime = targetTime.add(1, 'day');
        }

        const delayMs = targetTime.valueOf() - now.valueOf();

        console.log('[getDelayForNextAgendaGeneration] Próxima execução:', {
            targetTime: targetTime.format('YYYY-MM-DD HH:mm:ss'),
            now: now.format('YYYY-MM-DD HH:mm:ss'),
            delayMs,
            delayHours: Math.floor(delayMs / (1000 * 60 * 60)),
            delayMinutes: Math.floor((delayMs % (1000 * 60 * 60)) / (1000 * 60)),
        });

        return delayMs;
    } catch (error) {
        console.error('[getDelayForNextAgendaGeneration] Erro:', error);
        return null;
    }
}
