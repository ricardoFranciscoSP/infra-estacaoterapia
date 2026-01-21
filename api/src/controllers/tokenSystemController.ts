import { Router, Request, Response } from 'express';
import prisma from '../prisma/client';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { getSchedulersStatus } from '../config/setupSchedulers';
import { AuthorizationService } from '../services/authorization.service';
import { deriveUidFromUuid } from '../utils/uid.util';
import { ensureAgoraTokensForConsulta } from '../services/agoraToken.service';
import { getClientIp } from '../utils/getClientIp.util';

dayjs.extend(utc);
dayjs.extend(timezone);

const BRASILIA_TIMEZONE = 'America/Sao_Paulo';
const router = Router();
const authService = new AuthorizationService();

/**
 * GET /api/admin/token-system/status
 * Retorna status do sistema de geração de tokens
 */
router.get('/status', async (req: Request, res: Response): Promise<Response> => {
    try {
        console.log('[tokenSystemStatus] Verificando status do sistema de tokens...');

        const now = dayjs.tz(dayjs(), BRASILIA_TIMEZONE);

        // Status dos agendadores
        const schedulersStatus = getSchedulersStatus();

        // Verifica ReservaSessao sem tokens
        const reservasComTokenAusente = await prisma.reservaSessao.count({
            where: {
                OR: [
                    { AgoraTokenPatient: null },
                    { AgoraTokenPsychologist: null },
                    { AgoraTokenPatient: '' },
                    { AgoraTokenPsychologist: '' },
                ],
            },
        });

        // Verifica ReservaSessao com tokens completos
        const reservasComTokens = await prisma.reservaSessao.count({
            where: {
                AND: [
                    { AgoraTokenPatient: { not: null } },
                    { AgoraTokenPsychologist: { not: null } },
                    { AgoraTokenPatient: { not: '' } },
                    { AgoraTokenPsychologist: { not: '' } },
                ],
            },
        });

        // Total de ReservaSessao
        const totalReservas = await prisma.reservaSessao.count();

        return res.json({
            status: 'ok',
            timestamp: now.format('YYYY-MM-DD HH:mm:ss'),
            timezone: BRASILIA_TIMEZONE,
            schedulers: schedulersStatus,
            tokens: {
                total: totalReservas,
                comTokens: reservasComTokens,
                semTokens: reservasComTokenAusente,
                percentualPreenchimento:
                    totalReservas > 0
                        ? ((reservasComTokens / totalReservas) * 100).toFixed(2) + '%'
                        : 'N/A',
            },
        });
    } catch (error) {
        console.error('[tokenSystemStatus] Erro ao verificar status:', error);
        return res.status(500).json({
            error: 'Erro ao verificar status',
            message: error instanceof Error ? error.message : 'Erro desconhecido',
        });
    }
});

/**
 * GET /api/admin/token-system/pending
 * Retorna lista de ReservaSessao que precisam de tokens
 */
router.get('/pending', async (req: Request, res: Response): Promise<Response> => {
    try {
        console.log('[tokenSystemPending] Listando ReservaSessao pendentes...');

        const now = dayjs.tz(dayjs(), BRASILIA_TIMEZONE);

        const pendentes = await prisma.reservaSessao.findMany({
            where: {
                OR: [
                    { AgoraTokenPatient: null },
                    { AgoraTokenPsychologist: null },
                    { AgoraTokenPatient: '' },
                    { AgoraTokenPsychologist: '' },
                ],
            },
            include: {
                Consulta: {
                    select: {
                        Id: true,
                        Status: true,
                        PacienteId: true,
                        PsicologoId: true,
                    },
                },
            },
            orderBy: { ScheduledAt: 'asc' },
            take: 50,
        });

        return res.json({
            timestamp: now.format('YYYY-MM-DD HH:mm:ss'),
            count: pendentes.length,
            items: pendentes.map((r) => ({
                id: r.Id,
                consultaId: r.ConsultaId,
                scheduledAt: r.ScheduledAt,
                status: r.Consulta?.Status,
                tokenPatient: r.AgoraTokenPatient ? '✓' : '✗',
                tokenPsychologist: r.AgoraTokenPsychologist ? '✓' : '✗',
            })),
        });
    } catch (error) {
        console.error('[tokenSystemPending] Erro ao listar pendentes:', error);
        return res.status(500).json({
            error: 'Erro ao listar pendentes',
            message: error instanceof Error ? error.message : 'Erro desconhecido',
        });
    }
});

/**
 * POST /api/admin/token-system/generate-missing
 * Força a geração de tokens faltantes (útil para debugging)
 */
router.post('/generate-missing', async (req: Request, res: Response): Promise<Response> => {
    try {
        console.log('[tokenSystemGenerateMissing] Forçando geração de tokens faltantes...');

        const { generateAgoraTokensForConsulta } = await import(
            '../utils/scheduleAgoraToken'
        );

        // Busca ReservaSessao sem tokens
        const pendentes = await prisma.reservaSessao.findMany({
            where: {
                OR: [
                    { AgoraTokenPatient: null },
                    { AgoraTokenPsychologist: null },
                    { AgoraTokenPatient: '' },
                    { AgoraTokenPsychologist: '' },
                ],
            },
            select: { ConsultaId: true },
            take: 100,
        });

        let sucessos = 0;
        let erros = 0;

        for (const { ConsultaId } of pendentes) {
            try {
                await generateAgoraTokensForConsulta(ConsultaId);
                sucessos++;
            } catch (error) {
                erros++;
                console.error(
                    `[tokenSystemGenerateMissing] Erro ao gerar tokens para ${ConsultaId}:`,
                    error
                );
            }
        }

        return res.json({
            message: 'Geração de tokens realizada',
            total: pendentes.length,
            sucessos,
            erros,
        });
    } catch (error) {
        console.error('[tokenSystemGenerateMissing] Erro:', error);
        return res.status(500).json({
            error: 'Erro ao gerar tokens',
            message: error instanceof Error ? error.message : 'Erro desconhecido',
        });
    }
});

/**
 * POST /api/admin/token-system/generate-manual
 * Gera tokens manualmente com base no par paciente/psicólogo
 */
router.post('/generate-manual', async (req: Request, res: Response): Promise<Response> => {
    try {
        const adminId = authService.getLoggedUserId(req);
        if (!adminId) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        const { patientId, psychologistId, consultaId } = req.body as {
            patientId?: string;
            psychologistId?: string;
            consultaId?: string;
        };

        if (!patientId || !psychologistId) {
            return res.status(400).json({
                error: 'patientId e psychologistId são obrigatórios',
            });
        }

        let consulta = null as null | {
            Id: string;
            PacienteId: string | null;
            PsicologoId: string | null;
            AgendaId: string | null;
            Status: string | null;
        };

        if (consultaId) {
            consulta = await prisma.consulta.findUnique({
                where: { Id: consultaId },
                select: {
                    Id: true,
                    PacienteId: true,
                    PsicologoId: true,
                    AgendaId: true,
                    Status: true,
                },
            });
        } else {
            consulta = await prisma.consulta.findFirst({
                where: {
                    PacienteId: patientId,
                    PsicologoId: psychologistId,
                    Status: { notIn: ['Cancelado', 'Realizada'] },
                },
                orderBy: { Date: 'desc' },
                select: {
                    Id: true,
                    PacienteId: true,
                    PsicologoId: true,
                    AgendaId: true,
                    Status: true,
                },
            });
        }

        if (!consulta || !consulta.Id) {
            return res.status(404).json({
                error: 'Consulta não encontrada para o par paciente/psicólogo',
            });
        }

        let reservaSessao = await prisma.reservaSessao.findUnique({
            where: { ConsultaId: consulta.Id },
        });

        if (!reservaSessao) {
            const uidPaciente = deriveUidFromUuid(patientId);
            const uidPsicologo = deriveUidFromUuid(psychologistId);

            reservaSessao = await prisma.reservaSessao.create({
                data: {
                    ConsultaId: consulta.Id,
                    ReservationId: consulta.Id,
                    Status: 'Reservado',
                    PatientId: patientId,
                    PsychologistId: psychologistId,
                    AgoraChannel: `sala_${consulta.Id}`,
                    Uid: uidPaciente,
                    UidPsychologist: uidPsicologo,
                    AgendaId: consulta.AgendaId,
                },
            });
        }

        const tokenResult = await ensureAgoraTokensForConsulta(prisma, consulta.Id, {
            actorId: adminId,
            actorIp: getClientIp(req),
            source: 'admin-manual',
        });

        console.log(`🧾 [token-system] Tokens gerados manualmente`, {
            consultaId: consulta.Id,
            patientToken: tokenResult.patientToken,
            psychologistToken: tokenResult.psychologistToken,
        });

        return res.status(200).json({
            success: true,
            consultaId: consulta.Id,
            channelName: tokenResult.channelName,
            patientToken: tokenResult.patientToken,
            psychologistToken: tokenResult.psychologistToken,
            patientUid: tokenResult.patientUid,
            psychologistUid: tokenResult.psychologistUid,
            tokensGenerated: tokenResult.tokensGenerated,
        });
    } catch (error) {
        console.error('[tokenSystemGenerateManual] Erro:', error);
        return res.status(500).json({
            error: 'Erro ao gerar tokens manualmente',
            message: error instanceof Error ? error.message : 'Erro desconhecido',
        });
    }
});

/**
 * GET /api/admin/token-system/generated
 * Lista tokens gerados a partir das auditorias
 */
router.get('/generated', async (req: Request, res: Response): Promise<Response> => {
    try {
        const limitParam = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 50;
        const limit = Number.isNaN(limitParam) ? 50 : Math.min(Math.max(limitParam, 1), 200);
        const consultaId = typeof req.query.consultaId === 'string' ? req.query.consultaId.trim() : '';

        const whereFilter: {
            Module: 'SystemSettings';
            Description: { contains: string };
            Metadata?: { contains: string };
        } = {
            Module: 'SystemSettings',
            Description: { contains: 'Agora tokens gerados' },
        };

        if (consultaId) {
            whereFilter.Metadata = { contains: consultaId };
        }

        const logs = await prisma.adminActionLog.findMany({
            where: whereFilter,
            orderBy: { Timestamp: 'desc' },
            take: limit,
            include: {
                User: {
                    select: {
                        Id: true,
                        Nome: true,
                        Email: true,
                        Role: true,
                    },
                },
            },
        });

        const items = logs.map((log) => {
            let metadata: Record<string, unknown> | null = null;
            if (log.Metadata) {
                try {
                    metadata = JSON.parse(log.Metadata) as Record<string, unknown>;
                } catch {
                    metadata = null;
                }
            }

            return {
                id: log.Id,
                timestamp: log.Timestamp,
                description: log.Description,
                status: log.Status,
                user: log.User
                    ? {
                        id: log.User.Id,
                        nome: log.User.Nome,
                        email: log.User.Email,
                        role: log.User.Role,
                    }
                    : null,
                metadata,
            };
        });

        return res.json({ count: items.length, items });
    } catch (error) {
        console.error('[tokenSystemGenerated] Erro:', error);
        return res.status(500).json({
            error: 'Erro ao listar tokens gerados',
            message: error instanceof Error ? error.message : 'Erro desconhecido',
        });
    }
});

export default router;
