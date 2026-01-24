import { getDelayedJobsQueue } from "../queues/delayedJobsQueue";
import prisma from "../prisma/client";
import { WebSocketNotificationService } from "../services/websocketNotification.service";
import { getEventSyncService } from "../services/eventSync.service";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const JOB_NAME = "notificar-tempo-restante";
const JOB_ID = "notificar-tempo-restante";
const JOB_EVERY_MS = 60_000; // Executa a cada 1 minuto

/**
 * Agenda job recorrente para notificar tempo restante nas consultas
 * Executa a cada 1 minuto para verificar consultas nos últimos 15 minutos
 */
export async function scheduleNotificarTempoRestante(): Promise<boolean> {
    try {
        const queue = await getDelayedJobsQueue();
        if (!queue) {
            console.error("[scheduleNotificarTempoRestante] delayedJobsQueue não disponível");
            return false;
        }

        await queue.add(
            JOB_NAME,
            { scheduledAt: new Date().toISOString() },
            {
                repeat: { every: JOB_EVERY_MS },
                jobId: JOB_ID,
                removeOnComplete: { age: 86400 },
                removeOnFail: { age: 86400 },
            }
        );

        console.log(`✅ [scheduleNotificarTempoRestante] Job agendado a cada ${JOB_EVERY_MS / 1000}s`);
        return true;
    } catch (error) {
        console.error("[scheduleNotificarTempoRestante] Erro ao agendar job:", error);
        return false;
    }
}

/**
 * Verifica consultas em andamento e envia notificações de tempo restante
 * Notifica quando faltam 15, 10 e 5 minutos para o fim da consulta
 */
export async function handleNotificarTempoRestante(): Promise<number> {
    const agora = dayjs.tz(dayjs(), 'America/Sao_Paulo');
    
    try {
        // Busca duração padrão da consulta (50 minutos padrão) ANTES de fazer a query
        let duracaoMinutos = 50;
        try {
            const config = await prisma.configuracao.findUnique({
                where: { Chave: 'duracaoConsultaMin' },
                select: { Valor: true }
            });
            if (config?.Valor) {
                const parsed = parseInt(config.Valor);
                if (!isNaN(parsed) && parsed > 0) {
                    duracaoMinutos = parsed;
                }
            }
        } catch (err) {
            console.warn("⚠️ [handleNotificarTempoRestante] Erro ao buscar duração padrão, usando 50 minutos");
        }

        // Busca consultas em andamento que têm ambos os participantes na sala
        // Filtra consultas que estão próximas do fim (últimos 20 minutos para capturar os 15 minutos restantes)
        // Calcula limites: consultas que começaram há pelo menos (duração - 20) minutos
        // e no máximo (duração + 5) minutos atrás
        const limiteInferior = agora.subtract(duracaoMinutos + 5, 'minute');
        const limiteSuperior = agora.subtract(duracaoMinutos - 20, 'minute');

        const reservasSessao = await prisma.reservaSessao.findMany({
            where: {
                PatientJoinedAt: { not: null },
                PsychologistJoinedAt: { not: null },
                ScheduledAt: { 
                    not: null,
                    gte: limiteInferior.format('YYYY-MM-DD HH:mm:ss'),
                    lte: limiteSuperior.format('YYYY-MM-DD HH:mm:ss')
                },
                Consulta: {
                    Status: {
                        in: ['EmAndamento', 'Reservado']
                    }
                }
            },
            include: {
                Consulta: {
                    select: {
                        Id: true,
                        Status: true,
                        Date: true,
                        Time: true
                    }
                }
            }
        });

        if (reservasSessao.length === 0) {
            return 0;
        }

        console.log(`🔍 [handleNotificarTempoRestante] Verificando ${reservasSessao.length} consultas em andamento`);

        const wsNotify = new WebSocketNotificationService();
        const eventSync = getEventSyncService();
        let notificadas = 0;

        for (const reservaSessao of reservasSessao) {
            try {
                const consultationId = reservaSessao.ConsultaId;
                const scheduledAt = reservaSessao.ScheduledAt;

                if (!scheduledAt) {
                    continue;
                }

                // Calcula o fim da consulta (ScheduledAt + duração)
                const scheduledAtDate = dayjs.tz(scheduledAt, 'YYYY-MM-DD HH:mm:ss', 'America/Sao_Paulo');
                if (!scheduledAtDate.isValid()) {
                    console.warn(`⚠️ [handleNotificarTempoRestante] ScheduledAt inválido para consulta ${consultationId}: ${scheduledAt}`);
                    continue;
                }

                const fimConsulta = scheduledAtDate.add(duracaoMinutos, 'minute');
                const minutosRestantes = Math.ceil(fimConsulta.diff(agora, 'minute', true));

                // Só processa se estiver nos últimos 15 minutos (entre 0 e 15 minutos restantes)
                if (minutosRestantes > 15 || minutosRestantes < 0) {
                    continue;
                }

                // Thresholds de notificação: 15, 10, 5 minutos
                // Verifica se está exatamente em um dos thresholds (com margem de ±0.5 minutos)
                let minutosParaNotificar: number | null = null;

                // Verifica se está em um dos thresholds (com tolerância de ±0.5 minutos)
                if (minutosRestantes >= 14.5 && minutosRestantes <= 15.5) {
                    minutosParaNotificar = 15;
                } else if (minutosRestantes >= 9.5 && minutosRestantes <= 10.5) {
                    minutosParaNotificar = 10;
                } else if (minutosRestantes >= 4.5 && minutosRestantes <= 5.5) {
                    minutosParaNotificar = 5;
                }

                if (minutosParaNotificar === null) {
                    continue;
                }

                // Verifica no Redis se já foi enviada notificação para este threshold
                const { ConsultaRoomService } = await import('../services/consultaRoom.service');
                const roomService = new ConsultaRoomService();
                const durationData = await roomService.getSessionDuration(consultationId);
                const lastWarning = durationData?.lastWarningMinutesSent;

                // Se já foi enviada para este threshold, pula
                if (lastWarning === minutosParaNotificar) {
                    continue;
                }

                // Prepara mensagem
                const mensagem = minutosParaNotificar === 15
                    ? "A sessão se encerra em 15 minutos"
                    : minutosParaNotificar === 10
                    ? "A sessão se encerra em 10 minutos"
                    : "A sessão se encerra em 5 minutos";

                // Envia notificação via socket
                await wsNotify.emitConsultation(`consultation:${consultationId}`, {
                    event: "time-remaining-warning",
                    consultationId,
                    message: mensagem,
                    minutesRemaining: minutosParaNotificar,
                    timestamp: agora.toISOString()
                });

                // Publica via Event Sync para Socket.io
                await eventSync.publishEvent('consultation:time-remaining', {
                    consultationId,
                    minutesRemaining: minutosParaNotificar,
                    message: mensagem
                });

                // Salva no Redis que foi enviada esta notificação
                await roomService.saveLastWarningMinutes(consultationId, minutosParaNotificar);

                notificadas++;
                console.log(`✅ [handleNotificarTempoRestante] Notificação de ${minutosParaNotificar} minutos enviada para consulta ${consultationId} (restam ${minutosRestantes.toFixed(1)} minutos)`);

            } catch (error) {
                console.error(`❌ [handleNotificarTempoRestante] Erro ao processar consulta ${reservaSessao.ConsultaId}:`, error);
            }
        }

        return notificadas;
    } catch (error) {
        console.error(`❌ [handleNotificarTempoRestante] Erro geral:`, error);
        return 0;
    }
}
