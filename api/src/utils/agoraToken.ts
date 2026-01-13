// src/utils/agoraToken.ts
import prisma from '../prisma/client';
import { AgoraService } from '../services/agora.service';
const agoraService = new AgoraService();

/**
 * Gera token RTC (vídeo/áudio) usando o AgoraService centralizado.
 * Este wrapper mantém compatibilidade com código existente enquanto
 * delega a geração do token para o serviço corrigido.
 * 
 * @param channelName - Nome do canal Agora
 * @param uid - UID único do usuário
 * @param consultaId - ID da consulta
 * @param userId - ID do usuário solicitante
 * @returns Token de acesso do Agora
 */
export async function generateAgoraRtcToken(
    channelName: string,
    uid: number,
    consultaId: string,
    userId: string
): Promise<string> {
    // Valida que a consulta existe e que o usuário tem permissão
    const consulta = await prisma.consulta.findUnique({
        where: { Id: consultaId },
        select: {
            Id: true,
            PacienteId: true,
            PsicologoId: true,
        },
    });

    if (!consulta) {
        throw new Error(`Consulta com id ${consultaId} não encontrada.`);
    }

    // Determina o role do usuário
    const isPatient = consulta.PacienteId === userId;
    const isPsychologist = consulta.PsicologoId === userId;

    if (!isPatient && !isPsychologist) {
        throw new Error(`Usuário ${userId} não autorizado para a consulta ${consultaId}.`);
    }

    const role: 'patient' | 'psychologist' = isPatient ? 'patient' : 'psychologist';

    // Delega geração do token para o AgoraService com o role apropriado
    return agoraService.generateToken(channelName, uid, role);
}