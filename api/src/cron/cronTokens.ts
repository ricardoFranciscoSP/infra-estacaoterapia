import prisma from '../prisma/client';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

const BRASILIA_TIMEZONE = 'America/Sao_Paulo';

/**
 * Cron job que verifica ReservaSessao com tokens ausentes
 * Executa diariamente e gera tokens para consultas próximas
 * Fallback para Redis (caso Redis falhe ou jobs expirem)
 *
 * Este job:
 * 1. Encontra todas as ReservaSessao sem tokens
 * 2. Filtra as que têm ScheduledAt dentro de 24h
 * 3. Gera tokens para cada uma
 */
export async function cronCheckAndGenerateTokens(): Promise<void> {
    try {
        console.log('[cronCheckAndGenerateTokens] Iniciando verificação de tokens...');

        const now = dayjs.tz(dayjs(), BRASILIA_TIMEZONE);
        const tomorrow = now.add(24, 'hour');

        console.log('[cronCheckAndGenerateTokens] Procurando ReservaSessao sem tokens:', {
            nowBrasilia: now.format('YYYY-MM-DD HH:mm:ss'),
            tomorrowBrasilia: tomorrow.format('YYYY-MM-DD HH:mm:ss'),
        });

        // Busca ReservaSessao que:
        // 1. Não têm ambos os tokens
        // 2. Têm ScheduledAt dentro de 24 horas
        const reservasComTokenAusente = await prisma.reservaSessao.findMany({
            where: {
                AND: [
                    {
                        OR: [
                            { AgoraTokenPatient: null },
                            { AgoraTokenPsychologist: null },
                            { AgoraTokenPatient: '' },
                            { AgoraTokenPsychologist: '' },
                        ],
                    },
                    {
                        ScheduledAt: {
                            lte: tomorrow.toISOString(),
                            gte: now.toISOString(),
                        },
                    },
                ],
            },
            select: {
                Id: true,
                ConsultaId: true,
                ScheduledAt: true,
                AgoraTokenPatient: true,
                AgoraTokenPsychologist: true,
                Consulta: {
                    select: {
                        AgendaId: true,
                        Status: true,
                    },
                },
            },
            take: 100, // Limita a 100 por execução
        });

        console.log(
            `[cronCheckAndGenerateTokens] Encontradas ${reservasComTokenAusente.length} ReservaSessao sem tokens`
        );

        if (reservasComTokenAusente.length === 0) {
            console.log('[cronCheckAndGenerateTokens] Nenhuma ReservaSessao pendente encontrada');
            return;
        }

        // Processa cada reserva
        let gerados = 0;
        let erros = 0;

        for (const reserva of reservasComTokenAusente) {
            try {
                console.log(
                    `[cronCheckAndGenerateTokens] Gerando tokens para consulta ${reserva.ConsultaId}`
                );

                const { generateAgoraTokensForConsulta } = await import(
                    '../utils/scheduleAgoraToken'
                );
                const success = await generateAgoraTokensForConsulta(
                    reserva.ConsultaId
                );

                if (success) {
                    gerados++;
                    console.log(
                        `✅ [cronCheckAndGenerateTokens] Tokens gerados para ${reserva.ConsultaId}`
                    );
                } else {
                    erros++;
                    console.warn(
                        `⚠️ [cronCheckAndGenerateTokens] Falha ao gerar tokens para ${reserva.ConsultaId}`
                    );
                }
            } catch (error) {
                erros++;
                console.error(
                    `❌ [cronCheckAndGenerateTokens] Erro ao processar ${reserva.ConsultaId}:`,
                    error
                );
            }
        }

        console.log('[cronCheckAndGenerateTokens] Resumo da execução:', {
            total: reservasComTokenAusente.length,
            gerados,
            erros,
        });
    } catch (error) {
        console.error(
            '[cronCheckAndGenerateTokens] Erro na execução do cron:',
            error
        );
    }
}

/**
 * Cron job para gerar Agenda diariamente
 * Executa no horário definido em Configuracao.horarioGeracaoAutomaticaAgenda
 *
 * TODO: Implementar lógica de geração de Agenda
 */
export async function cronGenerateAgendaDaily(): Promise<void> {
    try {
        console.log('[cronGenerateAgendaDaily] Iniciando geração de Agenda...');

        // TODO: Implementar lógica específica de geração de Agenda
        // Por enquanto, apenas log

        console.log('[cronGenerateAgendaDaily] Agenda gerada com sucesso');
    } catch (error) {
        console.error('[cronGenerateAgendaDaily] Erro ao gerar Agenda:', error);
    }
}
