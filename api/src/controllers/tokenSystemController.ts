import { Router, Request, Response } from 'express';
import prisma from '../prisma/client';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { getSchedulersStatus } from '../config/setupSchedulers';
import { AuthorizationService } from '../services/authorization.service';
import { deriveUidFromUuid } from '../utils/uid.util';
import { ensureAgoraTokensForConsulta, generateFreshAgoraTokensForConsulta } from '../services/agoraToken.service';
import { getClientIp } from '../utils/getClientIp.util';
import { Prisma } from '../generated/prisma';

dayjs.extend(utc);
dayjs.extend(timezone);

const BRASILIA_TIMEZONE = 'America/Sao_Paulo';
const router = Router();
const authService = new AuthorizationService();

const parseTokenMetadata = (raw: string | null): Record<string, unknown> | null => {
    if (!raw) return null;
    try {
        return JSON.parse(raw) as Record<string, unknown>;
    } catch {
        return null;
    }
};

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
                await generateAgoraTokensForConsulta(
                    ConsultaId,
                    undefined,
                    'admin'
                );
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

        const normalizedPatientId = typeof patientId === 'string' ? patientId.trim() : '';
        const normalizedPsychologistId =
            typeof psychologistId === 'string' ? psychologistId.trim() : '';
        const normalizedConsultaId = typeof consultaId === 'string' ? consultaId.trim() : '';

        if (!normalizedConsultaId && (!normalizedPatientId || !normalizedPsychologistId)) {
            return res.status(400).json({
                error: 'patientId e psychologistId são obrigatórios quando consultaId não é informado',
                code: 'MISSING_REQUIRED_IDS',
            });
        }

        let consulta = null as null | {
            Id: string;
            PacienteId: string | null;
            PsicologoId: string | null;
            AgendaId: string | null;
            Status: string | null;
        };

        if (normalizedConsultaId) {
            consulta = await prisma.consulta.findUnique({
                where: { Id: normalizedConsultaId },
                select: {
                    Id: true,
                    PacienteId: true,
                    PsicologoId: true,
                    AgendaId: true,
                    Status: true,
                },
            });
        }

        if (consulta) {
            if (normalizedPatientId && consulta.PacienteId && consulta.PacienteId !== normalizedPatientId) {
                return res.status(409).json({
                    error: 'Consulta não pertence ao paciente informado',
                    code: 'CONSULTA_PATIENT_MISMATCH',
                });
            }
            if (
                normalizedPsychologistId &&
                consulta.PsicologoId &&
                consulta.PsicologoId !== normalizedPsychologistId
            ) {
                return res.status(409).json({
                    error: 'Consulta não pertence ao psicólogo informado',
                    code: 'CONSULTA_PSYCHOLOGIST_MISMATCH',
                });
            }
        }

        const resolvedPatientId = normalizedPatientId || consulta?.PacienteId || '';
        const resolvedPsychologistId = normalizedPsychologistId || consulta?.PsicologoId || '';

        if (!resolvedPatientId || !resolvedPsychologistId) {
            return res.status(400).json({
                error: 'patientId e psychologistId são obrigatórios',
                code: 'MISSING_REQUIRED_IDS',
            });
        } else {
            const reservaComTokenAusente = await prisma.reservaSessao.findFirst({
                where: {
                    PatientId: resolvedPatientId,
                    PsychologistId: resolvedPsychologistId,
                    OR: [
                        { AgoraTokenPatient: null },
                        { AgoraTokenPatient: '' },
                        { AgoraTokenPsychologist: null },
                        { AgoraTokenPsychologist: '' },
                    ],
                },
                orderBy: { ScheduledAt: 'desc' },
                include: {
                    Consulta: {
                        select: {
                            Id: true,
                            PacienteId: true,
                            PsicologoId: true,
                            AgendaId: true,
                            Status: true,
                        },
                    },
                },
            });

            if (reservaComTokenAusente?.Consulta) {
                consulta = reservaComTokenAusente.Consulta;
            }
        }

        if (!consulta) {
            consulta = await prisma.consulta.findFirst({
                where: {
                    PacienteId: resolvedPatientId,
                    PsicologoId: resolvedPsychologistId,
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

        if (!consulta) {
            consulta = await prisma.consulta.findFirst({
                where: {
                    PacienteId: resolvedPatientId,
                    PsicologoId: resolvedPsychologistId,
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
                code: 'CONSULTA_NOT_FOUND',
            });
        }

        let reservaSessao = await prisma.reservaSessao.findUnique({
            where: { ConsultaId: consulta.Id },
        });

        if (!reservaSessao) {
            const uidPaciente = deriveUidFromUuid(resolvedPatientId);
            const uidPsicologo = deriveUidFromUuid(resolvedPsychologistId);

            reservaSessao = await prisma.reservaSessao.create({
                data: {
                    ConsultaId: consulta.Id,
                    ReservationId: consulta.Id,
                    Status: 'Reservado',
                    PatientId: resolvedPatientId,
                    PsychologistId: resolvedPsychologistId,
                    AgoraChannel: `sala_${consulta.Id}`,
                    Uid: uidPaciente,
                    UidPsychologist: uidPsicologo,
                    AgendaId: consulta.AgendaId,
                },
            });
        } else {
            const updateData: {
                PatientId?: string;
                PsychologistId?: string;
                Uid?: number;
                UidPsychologist?: number;
                AgoraChannel?: string;
                AgendaId?: string | null;
            } = {};

            if (!reservaSessao.PatientId) {
                updateData.PatientId = resolvedPatientId;
            }
            if (!reservaSessao.PsychologistId) {
                updateData.PsychologistId = resolvedPsychologistId;
            }
            if (!reservaSessao.Uid) {
                updateData.Uid = deriveUidFromUuid(resolvedPatientId);
            }
            if (!reservaSessao.UidPsychologist) {
                updateData.UidPsychologist = deriveUidFromUuid(resolvedPsychologistId);
            }
            if (!reservaSessao.AgoraChannel) {
                updateData.AgoraChannel = `sala_${consulta.Id}`;
            }
            if (!reservaSessao.AgendaId && consulta.AgendaId) {
                updateData.AgendaId = consulta.AgendaId;
            }

            if (Object.keys(updateData).length > 0) {
                reservaSessao = await prisma.reservaSessao.update({
                    where: { Id: reservaSessao.Id },
                    data: updateData,
                });
            }
        }

        const actorIp = getClientIp(req);
        const tokenResult = await generateFreshAgoraTokensForConsulta(prisma, consulta.Id, {
            actorId: adminId,
            actorIp,
            source: 'manual',
        });

        await prisma.$queryRaw`
            INSERT INTO "ManualAgoraToken" (
                "ConsultaId",
                "PatientId",
                "PsychologistId",
                "ChannelName",
                "PatientToken",
                "PsychologistToken",
                "PatientUid",
                "PsychologistUid",
                "CreatedById",
                "IpAddress",
                "Source"
            ) VALUES (
                ${consulta.Id},
                ${resolvedPatientId},
                ${resolvedPsychologistId},
                ${tokenResult.channelName},
                ${tokenResult.patientToken},
                ${tokenResult.psychologistToken},
                ${tokenResult.patientUid},
                ${tokenResult.psychologistUid},
                ${adminId},
                ${actorIp},
                ${'manual'}
            )
        `;

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
 * GET /api/admin/token-system/tokens
 * Lista tokens gerados (manual + sistema) com paginação
 */
router.get('/tokens', async (req: Request, res: Response): Promise<Response> => {
    try {
        const limitParam = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 20;
        const pageParam = typeof req.query.page === 'string' ? parseInt(req.query.page, 10) : 1;
        const limit = Number.isNaN(limitParam) ? 20 : Math.min(Math.max(limitParam, 1), 100);
        const page = Number.isNaN(pageParam) ? 1 : Math.max(pageParam, 1);
        const offset = (page - 1) * limit;
        const fetchSize = page * limit;

        const consultaId = typeof req.query.consultaId === 'string' ? req.query.consultaId.trim() : '';
        const sourceRaw = typeof req.query.source === 'string' ? req.query.source.trim().toLowerCase() : 'all';
        const source = sourceRaw === 'manual' || sourceRaw === 'system' ? sourceRaw : 'all';

        const manualFilters: Prisma.Sql[] = [];
        if (consultaId) {
            manualFilters.push(Prisma.sql`m."ConsultaId" = ${consultaId}`);
        }
        const manualWhere =
            manualFilters.length > 0
                ? Prisma.sql`WHERE ${Prisma.join(manualFilters, ' AND ')}`
                : Prisma.empty;

        const systemWhereBase: {
            Module: 'SystemSettings';
            ActionType: 'Create';
            Description: { contains: string };
            AND?: Array<Record<string, unknown>>;
        } = {
            Module: 'SystemSettings',
            ActionType: 'Create',
            Description: { contains: 'Agora tokens gerados' },
        };

        if (consultaId) {
            systemWhereBase.AND = [
                { Metadata: { contains: consultaId } },
                { NOT: { Metadata: { contains: '"source":"manual"' } } },
            ];
        } else {
            systemWhereBase.AND = [{ NOT: { Metadata: { contains: '"source":"manual"' } } }];
        }

        if (source === 'manual') {
            const manualCountRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
                SELECT COUNT(*)::bigint as count
                FROM "ManualAgoraToken" m
                ${manualWhere}
            `;
            const totalCount = Number(manualCountRows[0]?.count ?? 0);

            const manualRows = await prisma.$queryRaw<
                Array<{
                    Id: string;
                    ConsultaId: string;
                    PatientId: string;
                    PsychologistId: string;
                    ChannelName: string;
                    PatientToken: string;
                    PsychologistToken: string;
                    PatientUid: number;
                    PsychologistUid: number;
                    CreatedAt: Date;
                    CreatedById: string;
                    Source: string;
                    UserNome: string | null;
                    UserEmail: string | null;
                    UserRole: string | null;
                }>
            >`
                SELECT
                    m."Id",
                    m."ConsultaId",
                    m."PatientId",
                    m."PsychologistId",
                    m."ChannelName",
                    m."PatientToken",
                    m."PsychologistToken",
                    m."PatientUid",
                    m."PsychologistUid",
                    m."CreatedAt",
                    m."CreatedById",
                    m."Source",
                    u."Nome" as "UserNome",
                    u."Email" as "UserEmail",
                    u."Role" as "UserRole"
                FROM "ManualAgoraToken" m
                LEFT JOIN "User" u ON u."Id" = m."CreatedById"
                ${manualWhere}
                ORDER BY m."CreatedAt" DESC
                LIMIT ${limit}
                OFFSET ${offset}
            `;

            const items = manualRows.map((row) => ({
                id: row.Id,
                timestamp: row.CreatedAt,
                description: `Tokens gerados manualmente para consulta ${row.ConsultaId}`,
                status: 'Sucesso',
                user: row.UserNome
                    ? {
                          id: row.CreatedById,
                          nome: row.UserNome,
                          email: row.UserEmail,
                          role: row.UserRole,
                      }
                    : null,
                metadata: {
                    consultaId: row.ConsultaId,
                    channelName: row.ChannelName,
                    patientId: row.PatientId,
                    psychologistId: row.PsychologistId,
                    patientUid: row.PatientUid,
                    psychologistUid: row.PsychologistUid,
                    patientToken: row.PatientToken,
                    psychologistToken: row.PsychologistToken,
                    source: row.Source ?? 'manual',
                    actorId: row.CreatedById,
                },
                origin: 'manual',
            }));

            return res.json({ count: totalCount, items });
        }

        if (source === 'system') {
            const totalCount = await prisma.adminActionLog.count({
                where: systemWhereBase,
            });
            const logs = await prisma.adminActionLog.findMany({
                where: systemWhereBase,
                orderBy: { Timestamp: 'desc' },
                take: limit,
                skip: offset,
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

            const items = logs.map((log) => ({
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
                metadata: parseTokenMetadata(log.Metadata),
                origin: 'system',
            }));

            return res.json({ count: totalCount, items });
        }

        const manualCountRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
            SELECT COUNT(*)::bigint as count
            FROM "ManualAgoraToken" m
            ${manualWhere}
        `;
        const manualCount = Number(manualCountRows[0]?.count ?? 0);
        const systemCount = await prisma.adminActionLog.count({
            where: systemWhereBase,
        });

        const manualRows = await prisma.$queryRaw<
            Array<{
                Id: string;
                ConsultaId: string;
                PatientId: string;
                PsychologistId: string;
                ChannelName: string;
                PatientToken: string;
                PsychologistToken: string;
                PatientUid: number;
                PsychologistUid: number;
                CreatedAt: Date;
                CreatedById: string;
                Source: string;
                UserNome: string | null;
                UserEmail: string | null;
                UserRole: string | null;
            }>
        >`
            SELECT
                m."Id",
                m."ConsultaId",
                m."PatientId",
                m."PsychologistId",
                m."ChannelName",
                m."PatientToken",
                m."PsychologistToken",
                m."PatientUid",
                m."PsychologistUid",
                m."CreatedAt",
                m."CreatedById",
                m."Source",
                u."Nome" as "UserNome",
                u."Email" as "UserEmail",
                u."Role" as "UserRole"
            FROM "ManualAgoraToken" m
            LEFT JOIN "User" u ON u."Id" = m."CreatedById"
            ${manualWhere}
            ORDER BY m."CreatedAt" DESC
            LIMIT ${fetchSize}
        `;

        const logs = await prisma.adminActionLog.findMany({
            where: systemWhereBase,
            orderBy: { Timestamp: 'desc' },
            take: fetchSize,
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

        const manualItems = manualRows.map((row) => ({
            id: row.Id,
            timestamp: row.CreatedAt,
            description: `Tokens gerados manualmente para consulta ${row.ConsultaId}`,
            status: 'Sucesso',
            user: row.UserNome
                ? {
                      id: row.CreatedById,
                      nome: row.UserNome,
                      email: row.UserEmail,
                      role: row.UserRole,
                  }
                : null,
            metadata: {
                consultaId: row.ConsultaId,
                channelName: row.ChannelName,
                patientId: row.PatientId,
                psychologistId: row.PsychologistId,
                patientUid: row.PatientUid,
                psychologistUid: row.PsychologistUid,
                patientToken: row.PatientToken,
                psychologistToken: row.PsychologistToken,
                source: row.Source ?? 'manual',
                actorId: row.CreatedById,
            },
            origin: 'manual',
        }));

        const systemItems = logs.map((log) => ({
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
            metadata: parseTokenMetadata(log.Metadata),
            origin: 'system',
        }));

        const merged = [...manualItems, ...systemItems].sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        const pagedItems = merged.slice(offset, offset + limit);

        return res.json({ count: manualCount + systemCount, items: pagedItems });
    } catch (error) {
        console.error('[tokenSystemTokens] Erro:', error);
        return res.status(500).json({
            error: 'Erro ao listar tokens',
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

        const items = logs.map((log) => ({
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
            metadata: parseTokenMetadata(log.Metadata),
        }));

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
