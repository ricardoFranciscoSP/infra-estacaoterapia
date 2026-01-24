import { PrismaClient } from '../generated/prisma';
import { AgoraService } from './agora.service';
import { deriveUidFromUuid } from '../utils/uid.util';
import { logAudit } from '../utils/auditLogger.util';
import { ActionType, Module } from '../generated/prisma';

export interface EnsureAgoraTokensResult {
    patientToken: string;
    psychologistToken: string;
    patientUid: number;
    psychologistUid: number;
    tokensGenerated: boolean;
    channelName: string;
}

interface ReservaSessaoUpdateData {
    AgoraTokenPatient?: string;
    AgoraTokenPsychologist?: string;
    AgoraChannel?: string;
    Uid?: number;
    UidPsychologist?: number;
    PatientId?: string;
    PsychologistId?: string;
}

export interface EnsureAgoraTokensOptions {
    actorId?: string;
    actorIp?: string;
    source?: string;
}

export interface GenerateFreshAgoraTokensOptions {
    actorId?: string;
    actorIp?: string;
    source?: string;
}

/**
 * Gera novos tokens Agora para a consulta, sobrescrevendo os existentes.
 * - Sempre gera tokens novos para paciente e psicólogo.
 * - Atualiza UIDs e IDs ausentes quando possível.
 */
export async function generateFreshAgoraTokensForConsulta(
    prisma: PrismaClient,
    consultaId: string,
    options?: GenerateFreshAgoraTokensOptions
): Promise<EnsureAgoraTokensResult> {
    const reservaSessao = await prisma.reservaSessao.findUnique({
        where: { ConsultaId: consultaId },
        include: { Consulta: true },
    });

    if (!reservaSessao) {
        throw new Error(`ReservaSessao não encontrada para consulta ${consultaId}`);
    }

    const channelName = reservaSessao.AgoraChannel ?? `sala_${consultaId}`;
    const patientId = reservaSessao.PatientId ?? reservaSessao.Consulta?.PacienteId;
    const psychologistId = reservaSessao.PsychologistId ?? reservaSessao.Consulta?.PsicologoId;

    if (!patientId || !psychologistId) {
        throw new Error(
            `PatientId ou PsychologistId não encontrado para consulta ${consultaId}. ` +
                `PatientId: ${patientId || 'ausente'}, PsychologistId: ${psychologistId || 'ausente'}`
        );
    }

    const patientUid = reservaSessao.Uid ?? deriveUidFromUuid(patientId);
    const psychologistUid = reservaSessao.UidPsychologist ?? deriveUidFromUuid(psychologistId);

    if (!patientUid || !psychologistUid) {
        throw new Error(
            `Falha ao gerar UIDs para consulta ${consultaId}. PatientId: ${patientId}, PsychologistId: ${psychologistId}`
        );
    }

    const agoraService = new AgoraService();
    const patientToken = await agoraService.generateToken(channelName, patientUid, 'patient');
    const psychologistToken = await agoraService.generateToken(
        channelName,
        psychologistUid,
        'psychologist'
    );

    if (!patientToken || !psychologistToken) {
        throw new Error(`Tokens não disponíveis após geração para consulta ${consultaId}`);
    }

    const updateData: ReservaSessaoUpdateData = {
        AgoraTokenPatient: patientToken,
        AgoraTokenPsychologist: psychologistToken,
    };

    if (!reservaSessao.PatientId && patientId) {
        updateData.PatientId = patientId;
    }
    if (!reservaSessao.PsychologistId && psychologistId) {
        updateData.PsychologistId = psychologistId;
    }
    if (!reservaSessao.Uid && patientUid) {
        updateData.Uid = patientUid;
    }
    if (!reservaSessao.UidPsychologist && psychologistUid) {
        updateData.UidPsychologist = psychologistUid;
    }

    if (!reservaSessao.AgoraChannel) {
        updateData.AgoraChannel = channelName;
    }

    await prisma.reservaSessao.update({
        where: { Id: reservaSessao.Id },
        data: updateData,
    });

    const auditUserId = options?.actorId ?? patientId;
    const source = options?.source ?? 'system';

    console.log(`🧾 [AgoraTokens] Tokens gerados (forçado)`, {
        consultaId,
        channelName,
        patientToken,
        psychologistToken,
        source,
    });

    await logAudit({
        userId: auditUserId,
        actionType: ActionType.Create,
        module: Module.SystemSettings,
        description: `Agora tokens gerados para consulta ${consultaId}`,
        ipAddress: options?.actorIp,
        status: 'Sucesso',
        metadata: {
            consultaId,
            channelName,
            patientId,
            psychologistId,
            patientUid,
            psychologistUid,
            patientToken,
            psychologistToken,
            source,
            actorId: options?.actorId ?? null,
        },
    });

    return {
        patientToken,
        psychologistToken,
        patientUid,
        psychologistUid,
        tokensGenerated: true,
        channelName,
    };
}

/**
 * Garante que ambos os tokens (paciente e psicólogo) existam na ReservaSessao.
 * - Não regenera tokens já existentes.
 * - Gera somente os tokens ausentes.
 * - Atualiza UIDs e IDs ausentes quando possível.
 */
export async function ensureAgoraTokensForConsulta(
    prisma: PrismaClient,
    consultaId: string,
    options?: EnsureAgoraTokensOptions
): Promise<EnsureAgoraTokensResult> {
    const reservaSessao = await prisma.reservaSessao.findUnique({
        where: { ConsultaId: consultaId },
        include: { Consulta: true },
    });

    if (!reservaSessao) {
        throw new Error(`ReservaSessao não encontrada para consulta ${consultaId}`);
    }

    const channelName = reservaSessao.AgoraChannel ?? `sala_${consultaId}`;

    const patientId = reservaSessao.PatientId ?? reservaSessao.Consulta?.PacienteId;
    const psychologistId = reservaSessao.PsychologistId ?? reservaSessao.Consulta?.PsicologoId;

    if (!patientId || !psychologistId) {
        throw new Error(
            `PatientId ou PsychologistId não encontrado para consulta ${consultaId}. ` +
            `PatientId: ${patientId || 'ausente'}, PsychologistId: ${psychologistId || 'ausente'}`
        );
    }

    const patientUid = reservaSessao.Uid ?? deriveUidFromUuid(patientId);
    const psychologistUid = reservaSessao.UidPsychologist ?? deriveUidFromUuid(psychologistId);

    if (!patientUid || !psychologistUid) {
        throw new Error(
            `Falha ao gerar UIDs para consulta ${consultaId}. PatientId: ${patientId}, PsychologistId: ${psychologistId}`
        );
    }

    const hasPatientToken = !!reservaSessao.AgoraTokenPatient?.trim();
    const hasPsychologistToken = !!reservaSessao.AgoraTokenPsychologist?.trim();

    let patientToken = hasPatientToken ? reservaSessao.AgoraTokenPatient!.trim() : '';
    let psychologistToken = hasPsychologistToken ? reservaSessao.AgoraTokenPsychologist!.trim() : '';

    let tokensGenerated = false;
    const agoraService = new AgoraService();

    if (!hasPatientToken) {
        patientToken = await agoraService.generateToken(channelName, patientUid, 'patient');
        tokensGenerated = true;
    }

    if (!hasPsychologistToken) {
        psychologistToken = await agoraService.generateToken(channelName, psychologistUid, 'psychologist');
        tokensGenerated = true;
    }

    if (!patientToken || !psychologistToken) {
        throw new Error(`Tokens não disponíveis após verificação para consulta ${consultaId}`);
    }

    const updateData: ReservaSessaoUpdateData = {};

    if (!reservaSessao.PatientId && patientId) {
        updateData.PatientId = patientId;
    }
    if (!reservaSessao.PsychologistId && psychologistId) {
        updateData.PsychologistId = psychologistId;
    }
    if (!reservaSessao.Uid && patientUid) {
        updateData.Uid = patientUid;
    }
    if (!reservaSessao.UidPsychologist && psychologistUid) {
        updateData.UidPsychologist = psychologistUid;
    }
    if (!hasPatientToken) {
        updateData.AgoraTokenPatient = patientToken;
    }
    if (!hasPsychologistToken) {
        updateData.AgoraTokenPsychologist = psychologistToken;
    }

    if (Object.keys(updateData).length > 0) {
        await prisma.reservaSessao.update({
            where: { Id: reservaSessao.Id },
            data: updateData,
        });
    }

    if (tokensGenerated) {
        const auditUserId = options?.actorId ?? patientId;
        const source = options?.source ?? 'system';

        console.log(`🧾 [AgoraTokens] Tokens gerados`, {
            consultaId,
            channelName,
            patientToken,
            psychologistToken,
            source,
        });

        await logAudit({
            userId: auditUserId,
            actionType: ActionType.Create,
            module: Module.SystemSettings,
            description: `Agora tokens gerados para consulta ${consultaId}`,
            ipAddress: options?.actorIp,
            status: 'Sucesso',
            metadata: {
                consultaId,
                channelName,
                patientId,
                psychologistId,
                patientUid,
                psychologistUid,
                patientToken,
                psychologistToken,
                source,
                actorId: options?.actorId ?? null,
            },
        });
    }

    return {
        patientToken,
        psychologistToken,
        patientUid,
        psychologistUid,
        tokensGenerated,
        channelName,
    };
}
