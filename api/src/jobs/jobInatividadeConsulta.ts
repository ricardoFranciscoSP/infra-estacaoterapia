import { getDelayedJobsQueue } from "../queues/delayedJobsQueue";
import prisma from "../prisma/client";
import { ConsultaStatusService } from "../services/consultaStatus.service";
import { getEventSyncService } from "../services/eventSync.service";

const JOB_NAME = "consulta-inatividade-failsafe";
const JOB_ID = "consulta-inatividade-failsafe";
const JOB_EVERY_MS = 60_000;

/**
 * Agenda job recorrente para fail-safe de inatividade (10 minutos)
 * Executa a cada 1 minuto
 */
export async function scheduleInatividadeFailsafe(): Promise<boolean> {
    try {
        const queue = await getDelayedJobsQueue();
        if (!queue) {
            console.error("[scheduleInatividadeFailsafe] delayedJobsQueue não disponível");
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

        console.log(`✅ [scheduleInatividadeFailsafe] Job agendado a cada ${JOB_EVERY_MS / 1000}s`);
        return true;
    } catch (error) {
        console.error("[scheduleInatividadeFailsafe] Erro ao agendar job:", error);
        return false;
    }
}

/**
 * Fail-safe de inatividade após 10 minutos do InicioEm
 * Usa ConsultaStatusService.processarInatividade para garantir consistência
 * e atualização correta de todas as tabelas (Consulta, ReservaSessao, Agenda)
 */
export async function handleInatividadeFailsafe(): Promise<number> {
    try {
        // Busca consultas em EmAndamento que passaram 10 minutos do InicioEm
        // e têm algum JoinedAt null
        const consultasInativas = await prisma.$queryRaw<{ 
            Id: string; 
            ConsultaId: string;
            PatientJoinedAt: Date | null;
            PsychologistJoinedAt: Date | null;
        }[]>`
            SELECT 
                c."Id",
                rs."ConsultaId",
                rs."PatientJoinedAt",
                rs."PsychologistJoinedAt"
            FROM "Consulta" c
            INNER JOIN "ReservaSessao" rs ON rs."ConsultaId" = c."Id"
            WHERE c."Status" = 'EmAndamento'
              AND c."InicioEm" <= (now() at time zone 'America/Sao_Paulo') - interval '10 minutes'
              AND (
                rs."PatientJoinedAt" IS NULL 
                OR rs."PsychologistJoinedAt" IS NULL
              )
              AND c."Status" NOT IN (
                'PacienteNaoCompareceu',
                'PsicologoNaoCompareceu',
                'CanceladaPacienteNoPrazo',
                'CanceladaPsicologoNoPrazo',
                'CanceladaPacienteForaDoPrazo',
                'CanceladaPsicologoForaDoPrazo',
                'CanceladaForcaMaior'
              )
        `;

        if (consultasInativas.length === 0) {
            return 0;
        }

        console.log(`🔍 [handleInatividadeFailsafe] Encontradas ${consultasInativas.length} consultas inativas`);

        const statusService = new ConsultaStatusService();
        const eventSync = getEventSyncService();
        let processadas = 0;

        for (const consulta of consultasInativas) {
            try {
                const patientJoined = consulta.PatientJoinedAt !== null;
                const psychologistJoined = consulta.PsychologistJoinedAt !== null;

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

                // Usa processarInatividade para garantir consistência
                // Isso atualiza: Consulta, ReservaSessao (via trigger), Agenda (via trigger)
                await statusService.processarInatividade(consulta.Id, missingRole);
                processadas++;

                console.log(`✅ [handleInatividadeFailsafe] Consulta ${consulta.Id} cancelada por inatividade (${missingRole})`);

                // Notifica via Event Sync
                try {
                    await eventSync.notifyInactivityCancellation(
                        consulta.Id,
                        `Cancelamento automático por inatividade${missingRole === 'Both' ? ' de ambos' : missingRole === 'Patient' ? ' do paciente' : ' do psicólogo'}`,
                        missingRole
                    );
                } catch (notifyError) {
                    console.error(`❌ [handleInatividadeFailsafe] Erro ao notificar:`, notifyError);
                }

            } catch (error) {
                console.error(`❌ [handleInatividadeFailsafe] Erro ao processar consulta ${consulta.Id}:`, error);
            }
        }

        return processadas;
    } catch (error) {
        console.error(`❌ [handleInatividadeFailsafe] Erro geral:`, error);
        return 0;
    }
}
