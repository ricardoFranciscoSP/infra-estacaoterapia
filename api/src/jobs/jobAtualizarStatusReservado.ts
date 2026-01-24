import { getDelayedJobsQueue } from "../queues/delayedJobsQueue";
import prisma from "../prisma/client";
import { getEventSyncService } from "../services/eventSync.service";

const JOB_NAME = "refresh-reservado-status";
const JOB_ID = "refresh-reservado-status";
const JOB_EVERY_MS = 60_000;

/**
 * Agenda job recorrente para atualizar status de consultas Reservado
 * Executa a cada 1 minuto (timezone America/Sao_Paulo via SQL)
 */
export async function scheduleReservedStatusRefresh(): Promise<boolean> {
    try {
        const queue = await getDelayedJobsQueue();
        if (!queue) {
            console.error("[scheduleReservedStatusRefresh] delayedJobsQueue não disponível");
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

        console.log(`✅ [scheduleReservedStatusRefresh] Job agendado a cada ${JOB_EVERY_MS / 1000}s`);
        return true;
    } catch (error) {
        console.error("[scheduleReservedStatusRefresh] Erro ao agendar job:", error);
        return false;
    }
}

/**
 * Atualiza consultas em status Reservado quando o horário é atingido
 * Regra: agora (Brasília) >= data/hora da consulta
 * Atualiza para Agendada (ajuste se a regra mudar para EmAndamento)
 */
export async function handleReservedStatusRefresh(): Promise<number> {
    const updated = await prisma.$queryRaw<{ Id: string; PacienteId: string | null; PsicologoId: string | null; Status: string }[]>`
        UPDATE "Consulta"
        SET "Status" = 'Agendada',
            "UpdatedAt" = now()
        WHERE "Status" = 'Reservado'
          AND (
            "Date"::date < (now() at time zone 'America/Sao_Paulo')::date
            OR (
              "Date"::date = (now() at time zone 'America/Sao_Paulo')::date
              AND "Time" <= to_char(now() at time zone 'America/Sao_Paulo', 'HH24:MI')
            )
          )
        RETURNING "Id", "PacienteId", "PsicologoId", "Status";
    `;

    if (updated.length > 0) {
        const eventSync = getEventSyncService();
        await Promise.all(
            updated.map((consulta) =>
                eventSync.notifyConsultationStatusChange(consulta.Id, consulta.Status, {
                    status: consulta.Status,
                })
            )
        );
    }

    return updated.length;
}
