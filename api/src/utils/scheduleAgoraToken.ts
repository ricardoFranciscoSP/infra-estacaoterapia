import { getWebhookQueue } from '../workers/worker.webhook';
import prisma from '../prisma/client';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { scheduleAgoraTokenGenerationWithFallback } from './scheduleAgoraTokenWithFallback';

dayjs.extend(utc);
dayjs.extend(timezone);

const BRASILIA_TIMEZONE = 'America/Sao_Paulo';

/**
 * Agenda a geração de tokens Agora para uma consulta
 * Usa a nova função com fallback para Agenda
 * Com fuso horário de Brasília (America/Sao_Paulo)
 *
 * @param consultaId - ID da consulta
 * @param scheduledAtStr - Deprecated, não usado (fallback automático para Agenda)
 * @returns Promise<boolean> - true se agendado com sucesso
 */
export async function scheduleAgoraTokenGeneration(
    consultaId: string,
    scheduledAtStr?: string | null | undefined
): Promise<boolean> {
    // Delega para a nova função com fallback e timezone correto
    return await scheduleAgoraTokenGenerationWithFallback(consultaId);
}

/**
 * Gera os tokens Agora diretamente
 * Usados pelo worker Redis e pelo cron fallback
 * Com tipo safety - sem Any
 *
 * @param consultaId - ID da consulta
 * @returns Promise<boolean> - true se tokens foram gerados com sucesso
 */
export async function generateAgoraTokensForConsulta(
    consultaId: string,
    jobId?: string
): Promise<boolean> {
    try {
        const { ensureAgoraTokensForConsulta } = await import('../services/agoraToken.service');
        await ensureAgoraTokensForConsulta(prisma, consultaId, { source: 'schedule' });

        // Atualiza status das tabelas (Consulta, ReservaSessao, Agenda) para EmAndamento
        try {
            const { ConsultaStatusService } = await import('../services/consultaStatus.service');
            const statusService = new ConsultaStatusService();
            await statusService.iniciarConsulta(consultaId);
        } catch (statusError) {
            console.error(
                `❌ [generateAgoraTokensForConsulta] Erro ao atualizar status para EmAndamento:`,
                statusError
            );
        }

        if (jobId) {
            await prisma.job.update({
                where: { Id: jobId },
                data: { Status: "completed" }
            }).catch(() => undefined);
        }

        console.log(
            `✅ [generateAgoraTokensForConsulta] Tokens garantidos com sucesso para consulta ${consultaId}`
        );
        return true;
    } catch (error) {
        console.error(
            `❌ [generateAgoraTokensForConsulta] Erro ao gerar tokens para consulta ${consultaId}:`,
            error
        );
        if (jobId) {
            await prisma.job.update({
                where: { Id: jobId },
                data: {
                    Status: "failed",
                    LastError: error instanceof Error ? error.message : String(error)
                }
            }).catch(() => undefined);
        }
        throw error;
    }
}
