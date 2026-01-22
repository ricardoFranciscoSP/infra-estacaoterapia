/**
 * Job para verificar presença de participantes na consulta
 * 
 * 🎯 REGRA ÚNICA DE CANCELAMENTO AUTOMÁTICO:
 * - Cancela APENAS se PatientJoinedAt IS NULL AND PsychologistJoinedAt IS NULL
 * - E já se passaram 10 minutos desde ScheduledAt
 * - NÃO cancela se pelo menos um dos dois entrou na sala
 * 
 * ⚠️ IMPORTANTE: Esta é a ÚNICA regra válida de cancelamento automático
 */

import prisma from '../prisma/client';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { ConsultaRoomService } from '../services/consultaRoom.service';
import { ConsultaStatusService } from '../services/consultaStatus.service';
import { WebSocketNotificationService } from '../services/websocketNotification.service';
import { AgendaStatus } from '../types/permissions.types';
import { BRASILIA_TIMEZONE, nowBrasiliaTimestamp, nowBrasiliaDate, nowBrasilia, toBrasiliaISO } from '../utils/timezone.util';

dayjs.extend(utc);
dayjs.extend(timezone);

interface VerificacaoPresencaPayload {
    consultaId: string;
    scheduledAt: string;
}

/**
 * Verifica presença de participantes na consulta após 10 minutos
 * 
 * 🎯 REGRA ÚNICA: Cancela APENAS se ambos NULL após 10 minutos
 * 
 * @param payload Dados da consulta
 */
export async function verificarPresencaConsulta(payload: VerificacaoPresencaPayload): Promise<void> {
    const { consultaId, scheduledAt } = payload;
    const startTime = nowBrasiliaTimestamp();

    console.log(`🔍 [verificarPresencaConsulta] INICIANDO verificação de presença (10 minutos)`, {
        consultaId,
        scheduledAt,
        timestamp: toBrasiliaISO()
    });

    try {
        // Busca a ReservaSessao com todos os dados necessários
        const reservaSessao = await prisma.reservaSessao.findUnique({
            where: { ConsultaId: consultaId },
            include: {
                Consulta: {
                    include: {
                        Paciente: {
                            select: {
                                Id: true,
                                Nome: true
                            }
                        },
                        Psicologo: {
                            select: {
                                Id: true,
                                Nome: true
                            }
                        }
                    }
                }
            }
        });

        if (!reservaSessao || !reservaSessao.Consulta) {
            console.warn(`⚠️ [verificarPresencaConsulta] ReservaSessao ou Consulta não encontrada para ${consultaId}`);
            return;
        }

        const consulta = reservaSessao.Consulta;
        const agora = dayjs.tz(dayjs(), BRASILIA_TIMEZONE);
        // 🎯 IMPORTANTE: Especifica o formato explicitamente para suportar horários "quebrados" (ex: 15:40:00)
        const scheduledAtDate = dayjs.tz(scheduledAt, 'YYYY-MM-DD HH:mm:ss', BRASILIA_TIMEZONE);
        
        if (!scheduledAtDate.isValid()) {
            console.error(`❌ [verificarPresencaConsulta] ScheduledAt inválido para consulta ${consultaId}: ${scheduledAt}`);
            return;
        }

        // Verifica se já passaram 10 minutos desde ScheduledAt
        const deadline = scheduledAtDate.add(10, 'minute');
        if (agora.isBefore(deadline)) {
            console.log(`⏳ [verificarPresencaConsulta] Ainda não passaram 10 minutos desde ScheduledAt para ${consultaId}`);
            return;
        }

        // 🎯 REGRA ÚNICA: Verifica se AMBOS estão NULL
        const patientJoined = reservaSessao.PatientJoinedAt !== null && reservaSessao.PatientJoinedAt !== undefined;
        const psychologistJoined = reservaSessao.PsychologistJoinedAt !== null && reservaSessao.PsychologistJoinedAt !== undefined;

        console.log(`🔍 [verificarPresencaConsulta] Status de presença (10 minutos após ScheduledAt)`, {
            consultaId,
            patientJoined,
            psychologistJoined,
            patientJoinedAt: reservaSessao.PatientJoinedAt,
            psychologistJoinedAt: reservaSessao.PsychologistJoinedAt,
            scheduledAt
        });

        // ✅ Se pelo menos um entrou, NÃO cancela (regra principal)
        if (patientJoined || psychologistJoined) {
            console.log(`✅ [verificarPresencaConsulta] Pelo menos um participante entrou na consulta ${consultaId} - NÃO cancela`);
            console.log(`   - PatientJoinedAt: ${patientJoined ? '✅ Preenchido' : '❌ NULL'}`);
            console.log(`   - PsychologistJoinedAt: ${psychologistJoined ? '✅ Preenchido' : '❌ NULL'}`);
            return;
        }

        // 🛑 Só chega aqui se AMBOS estão NULL após 10 minutos
        // Esta é a ÚNICA situação em que cancela automaticamente
        console.log(`🛑 [verificarPresencaConsulta] AMBOS os participantes estão NULL após 10 minutos - CANCELANDO consulta ${consultaId}`);

        // Verifica se já foi processada (idempotência)
        const consultaAtual = await prisma.consulta.findUnique({
            where: { Id: consultaId },
            select: { Status: true }
        });

        const statusAtual = consultaAtual?.Status as string | undefined;
        const jaProcessada = statusAtual === 'CanceladaForcaMaior' ||
            statusAtual?.toString().startsWith('Cancelada') ||
            statusAtual === 'Realizada' ||
            statusAtual === 'Concluido';

        if (jaProcessada) {
            console.log(`ℹ️ [verificarPresencaConsulta] Consulta ${consultaId} já foi processada (status: ${statusAtual})`);
            return;
        }

        // 🎯 Motivo do cancelamento: ambos não compareceram
        const motivo = 'Paciente e psicólogo não compareceram após 10 minutos do início da consulta';

        console.log(`🛑 [verificarPresencaConsulta] Cancelando consulta: ${consultaId} - ${motivo}`);

        // Envia notificação via Socket.IO antes de fechar
        const wsNotify = new WebSocketNotificationService();
        const message = 'A consulta foi cancelada automaticamente. Nenhum participante compareceu após 10 minutos do início.';

        try {
            await wsNotify.emitConsultation(`consultation:${consultaId}`, {
                event: 'consultation:inactivity',
                consultationId: consultaId,
                message,
                missingRole: 'Both',
                status: 'Cancelado',
                countdown: 30
            });

            // Notifica ambos os usuários diretamente
            if (consulta.PacienteId) {
                await wsNotify.emitToUser(consulta.PacienteId, 'consultation:inactivity', {
                    event: 'consultation:inactivity',
                    consultationId: consultaId,
                    message,
                    missingRole: 'Both',
                    status: 'Cancelado'
                });
            }

            if (consulta.PsicologoId) {
                await wsNotify.emitToUser(consulta.PsicologoId, 'consultation:inactivity', {
                    event: 'consultation:inactivity',
                    consultationId: consultaId,
                    message,
                    missingRole: 'Both',
                    status: 'Cancelado'
                });
            }
        } catch (notifyError) {
            console.error(`❌ [verificarPresencaConsulta] Erro ao enviar notificação:`, notifyError);
            // Continua mesmo se a notificação falhar
        }

        // Fecha a sala usando ConsultaRoomService
        const roomService = new ConsultaRoomService();
        try {
            await roomService.closeRoom(consultaId, 'timeout', 'both');
        } catch (roomError) {
            console.error(`❌ [verificarPresencaConsulta] Erro ao fechar sala:`, roomError);
            // Continua para atualizar status mesmo se fechar sala falhar
        }

        // Atualiza status usando ConsultaStatusService
        const statusService = new ConsultaStatusService();
        try {
            await statusService.processarInatividade(consultaId, 'Both');
        } catch (statusError) {
            console.error(`❌ [verificarPresencaConsulta] Erro ao processar inatividade:`, statusError);
            // Fallback: atualiza manualmente
            await prisma.$transaction(async (tx) => {
                await tx.consulta.update({
                    where: { Id: consultaId },
                    data: { Status: 'CanceladaForcaMaior' as never }
                });

                await tx.reservaSessao.update({
                    where: { ConsultaId: consultaId },
                    data: {
                        Status: AgendaStatus.Cancelado,
                        AgoraTokenPatient: null,
                        AgoraTokenPsychologist: null,
                        Uid: null,
                        UidPsychologist: null
                    }
                });

                if (consulta.AgendaId) {
                    await tx.agenda.update({
                        where: { Id: consulta.AgendaId },
                        data: {
                            Status: AgendaStatus.Cancelado,
                            PacienteId: null
                        }
                    });
                }
            });
        }

        // Cria registro de cancelamento
        try {
            await prisma.cancelamentoSessao.create({
                data: {
                    Protocolo: `AUTO-${nowBrasiliaTimestamp()}`,
                    Motivo: motivo,
                    Data: nowBrasiliaDate(),
                    Horario: nowBrasilia().format('HH:mm'),
                    SessaoId: consultaId,
                    PacienteId: consulta.PacienteId || '',
                    PsicologoId: consulta.PsicologoId || '',
                    AutorId: '', // Sistema
                    Status: 'Deferido',
                    Tipo: 'Sistema'
                }
            });
        } catch (cancelError) {
            console.error(`❌ [verificarPresencaConsulta] Erro ao criar cancelamento:`, cancelError);
        }

        const duration = nowBrasiliaTimestamp() - startTime;
        console.log(`✅ [verificarPresencaConsulta] Verificação concluída com sucesso`, {
            consultaId,
            motivo: 'Ambos os participantes não compareceram após 10 minutos',
            duracao: `${duration}ms`,
            timestamp: toBrasiliaISO()
        });

    } catch (error: unknown) {
        const err = error as { message?: string };
        const duration = nowBrasiliaTimestamp() - startTime;
        console.error(`❌ [verificarPresencaConsulta] ERRO na verificação de presença`, {
            consultaId,
            error: err?.message || String(error),
            stack: err instanceof Error ? err.stack : undefined,
            duracao: `${duration}ms`,
            timestamp: toBrasiliaISO()
        });
        throw error;
    }
}

/**
 * Agenda verificação de presença para uma consulta
 * 
 * 🎯 REGRA: Agenda APENAS uma verificação 10 minutos após ScheduledAt
 * - Não agenda verificação no início
 * - Cancela APENAS se ambos NULL após 10 minutos
 * 
 * @param consultaId ID da consulta
 * @param scheduledAt Data/hora agendada no formato 'YYYY-MM-DD HH:mm:ss'
 */
export async function agendarVerificacaoPresenca(consultaId: string, scheduledAt: string): Promise<boolean> {
    try {
        // 🎯 IMPORTANTE: Especifica o formato explicitamente para suportar horários "quebrados" (ex: 15:40:00)
        const scheduled = dayjs.tz(scheduledAt, 'YYYY-MM-DD HH:mm:ss', BRASILIA_TIMEZONE);
        
        if (!scheduled.isValid()) {
            console.error(`❌ [agendarVerificacaoPresenca] ScheduledAt inválido para consulta ${consultaId}: ${scheduledAt}`);
            return false;
        }
        
        const now = dayjs.tz(dayjs(), BRASILIA_TIMEZONE);

        // Agenda verificação EXATAMENTE 10 minutos após ScheduledAt
        const verificacao10min = scheduled.add(10, 'minute');
        const delay10min = Math.max(0, verificacao10min.valueOf() - now.valueOf());

        const { getWebhookQueue } = await import('../workers/worker.webhook');
        const queue = getWebhookQueue();

        if (!queue) {
            console.error(`[agendarVerificacaoPresenca] WebhookQueue não disponível`);
            return false;
        }

        // Agenda verificação 10 minutos após ScheduledAt (se ainda não passou)
        if (delay10min > 0 && delay10min < 7 * 24 * 60 * 60 * 1000) { // Máximo 7 dias
            await queue.add(
                'verificarPresencaConsulta',
                {
                    consultaId,
                    scheduledAt
                } as VerificacaoPresencaPayload,
                {
                    delay: delay10min,
                    attempts: 2,
                    backoff: {
                        type: 'fixed',
                        delay: 5000
                    },
                    jobId: `presenca-10min-${consultaId}`,
                    removeOnComplete: { age: 86400 },
                    removeOnFail: { age: 86400 }
                }
            );
            console.log(`✅ [agendarVerificacaoPresenca] Verificação 10 minutos após ScheduledAt agendada para ${consultaId} (${verificacao10min.format('YYYY-MM-DD HH:mm:ss')} ${BRASILIA_TIMEZONE})`);
        } else {
            console.warn(`⚠️ [agendarVerificacaoPresenca] Não foi possível agendar verificação para ${consultaId} - horário já passou ou muito distante`);
        }

        return true;
    } catch (error: unknown) {
        const err = error as { message?: string };
        console.error(`❌ [agendarVerificacaoPresenca] Erro ao agendar verificação:`, err?.message || String(error));
        return false;
    }
}

