/**
 * Job periódico para verificar inatividade baseado em ScheduledAt e JoinedAt
 * Verifica consultas que passaram 10 minutos do ScheduledAt e têm algum JoinedAt null
 */

import { getDelayedJobsQueue } from "../queues/delayedJobsQueue";
import prisma from "../prisma/client";
import { ConsultaStatusService } from "../services/consultaStatus.service";
import { getEventSyncService } from "../services/eventSync.service";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);

const JOB_NAME = "verificar-inatividade-scheduled-at";
const JOB_ID = "verificar-inatividade-scheduled-at";
const JOB_EVERY_MS = 60_000; // Executa a cada 1 minuto

/**
 * Agenda job recorrente para verificar inatividade baseado em ScheduledAt
 */
export async function scheduleVerificarInatividadeScheduledAt(): Promise<boolean> {
    try {
        const queue = await getDelayedJobsQueue();
        if (!queue) {
            console.error("[scheduleVerificarInatividadeScheduledAt] delayedJobsQueue não disponível");
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

        console.log(`✅ [scheduleVerificarInatividadeScheduledAt] Job agendado a cada ${JOB_EVERY_MS / 1000}s`);
        return true;
    } catch (error) {
        console.error("[scheduleVerificarInatividadeScheduledAt] Erro ao agendar job:", error);
        return false;
    }
}

/**
 * Verifica inatividade baseado em ScheduledAt e PatientJoinedAt/PsychologistJoinedAt
 * Cancela consultas que passaram 10 minutos do ScheduledAt e têm algum JoinedAt null
 */
export async function handleVerificarInatividadeScheduledAt(): Promise<number> {
    const agora = dayjs.tz(dayjs(), 'America/Sao_Paulo');
    const deadline = agora.subtract(10, 'minute');
    
    // Formata deadline para string no formato do ScheduledAt
    const deadlineStr = deadline.format('YYYY-MM-DD HH:mm:ss');

    try {
        // Busca ReservaSessao que:
        // 1. ScheduledAt <= agora - 10 minutos (passou dos 10 minutos)
        // 2. Tem pelo menos um JoinedAt null
        // 3. A consulta ainda não foi cancelada
        const reservasSessao = await prisma.reservaSessao.findMany({
            where: {
                ScheduledAt: {
                    lte: deadlineStr
                },
                OR: [
                    { PatientJoinedAt: null },
                    { PsychologistJoinedAt: null }
                ],
                Consulta: {
                    Status: {
                        notIn: [
                            'PacienteNaoCompareceu',
                            'PsicologoNaoCompareceu',
                            'CanceladaPacienteNoPrazo',
                            'CanceladaPsicologoNoPrazo',
                            'CanceladaPacienteForaDoPrazo',
                            'CanceladaPsicologoForaDoPrazo',
                            'CanceladaForcaMaior'
                        ]
                    }
                }
            },
            include: {
                Consulta: {
                    select: {
                        Id: true,
                        Status: true,
                        PacienteId: true,
                        PsicologoId: true
                    }
                }
            }
        });

        if (reservasSessao.length === 0) {
            return 0;
        }

        console.log(`🔍 [handleVerificarInatividadeScheduledAt] Encontradas ${reservasSessao.length} consultas para verificar`);

        const statusService = new ConsultaStatusService();
        const eventSync = getEventSyncService();
        let processadas = 0;

        for (const reservaSessao of reservasSessao) {
            try {
                const consultaId = reservaSessao.ConsultaId;
                const patientJoined = reservaSessao.PatientJoinedAt !== null;
                const psychologistJoined = reservaSessao.PsychologistJoinedAt !== null;

                // Verifica novamente se passaram 10 minutos (validação adicional)
                if (!reservaSessao.ScheduledAt) {
                    continue;
                }

                const scheduledAtDate = dayjs.tz(reservaSessao.ScheduledAt, 'YYYY-MM-DD HH:mm:ss', 'America/Sao_Paulo');
                if (!scheduledAtDate.isValid()) {
                    console.warn(`⚠️ [handleVerificarInatividadeScheduledAt] ScheduledAt inválido para consulta ${consultaId}: ${reservaSessao.ScheduledAt}`);
                    continue;
                }

                const deadlineDate = scheduledAtDate.add(10, 'minute');
                if (agora.isBefore(deadlineDate)) {
                    continue; // Ainda não passaram 10 minutos
                }

                // Se ambos entraram, não precisa cancelar
                if (patientJoined && psychologistJoined) {
                    continue;
                }

                // Determina missingRole
                let missingRole: 'Patient' | 'Psychologist' | 'Both';
                if (!patientJoined && !psychologistJoined) {
                    missingRole = 'Both';
                } else if (!patientJoined) {
                    missingRole = 'Patient';
                } else {
                    missingRole = 'Psychologist';
                }

                // Processa inatividade
                await statusService.processarInatividade(consultaId, missingRole);
                processadas++;

                console.log(`✅ [handleVerificarInatividadeScheduledAt] Consulta ${consultaId} cancelada por inatividade (${missingRole})`);

                // Notifica via Event Sync
                try {
                    await eventSync.notifyInactivityCancellation(
                        consultaId,
                        `Cancelamento automático por inatividade${missingRole === 'Both' ? ' de ambos' : missingRole === 'Patient' ? ' do paciente' : ' do psicólogo'}`,
                        missingRole
                    );
                } catch (notifyError) {
                    console.error(`❌ [handleVerificarInatividadeScheduledAt] Erro ao notificar:`, notifyError);
                }

            } catch (error) {
                console.error(`❌ [handleVerificarInatividadeScheduledAt] Erro ao processar consulta ${reservaSessao.ConsultaId}:`, error);
            }
        }

        return processadas;
    } catch (error) {
        console.error(`❌ [handleVerificarInatividadeScheduledAt] Erro geral:`, error);
        return 0;
    }
}
