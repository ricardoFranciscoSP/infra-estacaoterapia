import { Router, Request, Response } from 'express';
import prisma from '../prisma/client';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { getSchedulersStatus } from '../config/setupSchedulers';

dayjs.extend(utc);
dayjs.extend(timezone);

const BRASILIA_TIMEZONE = 'America/Sao_Paulo';
const router = Router();

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

export default router;
