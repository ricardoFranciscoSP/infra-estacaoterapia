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
    consultaId: string
): Promise<boolean> {
    try {
        // Busca a reserva de sessão e dados relacionados
        const reservaSessao = await prisma.reservaSessao.findUnique({
            where: { ConsultaId: consultaId },
            include: {
                Consulta: true,
            },
        });

        if (!reservaSessao) {
            console.warn(
                `[generateAgoraTokensForConsulta] ReservaSessao não encontrada para consulta ${consultaId}`
            );
            return false;
        }

        // Verifica se os tokens já foram gerados
        if (
            reservaSessao.AgoraTokenPatient &&
            reservaSessao.AgoraTokenPsychologist
        ) {
            console.log(
                `[generateAgoraTokensForConsulta] Tokens já existem para consulta ${consultaId}, pulando geração`
            );
            return true;
        }

        // Determina o canal e UIDs
        const channelName = reservaSessao.AgoraChannel ?? `sala_${consultaId}`;

        // Deriva UIDs caso ainda não existam
        const { deriveUidFromUuid } = await import('./uid.util');
        let patientUid = reservaSessao.Uid;
        let psychologistUid = reservaSessao.UidPsychologist;

        if (!patientUid && reservaSessao.PatientId) {
            patientUid = deriveUidFromUuid(reservaSessao.PatientId);
        }
        if (!psychologistUid && reservaSessao.PsychologistId) {
            psychologistUid = deriveUidFromUuid(
                reservaSessao.PsychologistId
            );
        }

        if (!patientUid || !psychologistUid) {
            throw new Error(
                `Falha ao determinar UIDs para consulta ${consultaId}. PatientId: ${reservaSessao.PatientId}, PsychologistId: ${reservaSessao.PsychologistId}`
            );
        }

        // Gera tokens via AgoraService
        const { AgoraService } = await import('../services/agora.service');
        const agoraService = new AgoraService();
        const patientToken = await agoraService.generateToken(
            channelName,
            patientUid,
            'patient'
        );
        const psychologistToken = await agoraService.generateToken(
            channelName,
            psychologistUid,
            'psychologist'
        );

        // Atualiza ReservaSessao com tokens e UIDs
        await prisma.reservaSessao.update({
            where: { Id: reservaSessao.Id },
            data: {
                AgoraTokenPatient: patientToken,
                AgoraTokenPsychologist: psychologistToken,
                Uid: patientUid,
                UidPsychologist: psychologistUid,
            },
        });

        console.log(
            `✅ [generateAgoraTokensForConsulta] Tokens gerados com sucesso para consulta ${consultaId}`
        );
        return true;
    } catch (error) {
        console.error(
            `❌ [generateAgoraTokensForConsulta] Erro ao gerar tokens para consulta ${consultaId}:`,
            error
        );
        throw error;
    }
}
