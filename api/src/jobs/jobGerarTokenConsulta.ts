import { DateTime } from 'luxon';
import { generateAgoraTokensForConsulta } from '../utils/scheduleAgoraToken';
import prisma from '../prisma/client';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Cron job fallback que roda a cada minuto para gerar tokens Agora
 * para consultas que estão no horário exato (ScheduledAt) ou 15 segundos antes
 * 
 * Este job serve como backup caso o Redis não tenha processado o job agendado
 * IMPORTANTE: Verifica tanto no horário exato quanto 15 segundos antes
 */
export async function jobGerarTokenConsulta() {
    try {
        // Hora atual em Brasília
        const agoraBrasilia = DateTime.now().setZone('America/Sao_Paulo');
        const agora = dayjs.tz(dayjs(), 'America/Sao_Paulo');
        
        // Horário exato (sem segundos/milissegundos para busca no banco)
        const agoraStr = agoraBrasilia.startOf('minute').toFormat('yyyy-MM-dd HH:mm:ss');
        
        // Horário 15 segundos no futuro (momento em que tokens devem ser gerados)
        const tokenGenerationTime = agora.add(15, 'second');
        const tokenGenerationTimeStr = tokenGenerationTime.format('YYYY-MM-DD HH:mm:ss');
        
        console.log(`[jobGerarTokenConsulta] Iniciando job. Verificando consultas:`, {
            agora: agora.format('YYYY-MM-DD HH:mm:ss'),
            tokenGenerationTime: tokenGenerationTimeStr,
            horarioExato: agoraStr
        });
        
        // 🎯 Busca reservas que estão próximas do horário (dentro de uma janela de 1 minuto)
        // e ainda não têm ambos os tokens gerados
        // IMPORTANTE: Usa comparação de string com gte/lte para suportar horários "quebrados"
        const janelaInicio = agora.subtract(1, 'minute').format('YYYY-MM-DD HH:mm:ss');
        const janelaFim = agora.add(1, 'minute').format('YYYY-MM-DD HH:mm:ss');
        
        const reservasSessao = await prisma.reservaSessao.findMany({
            where: {
                AND: [
                    {
                        ScheduledAt: {
                            not: null,
                            gte: janelaInicio,
                            lte: janelaFim,
                        }
                    },
                    // Apenas busca reservas que ainda não têm ambos os tokens gerados
                    {
                        OR: [
                            { AgoraTokenPatient: null },
                            { AgoraTokenPsychologist: null },
                        ],
                    }
                ]
            },
        });

        console.log(`[jobGerarTokenConsulta] ReservasSessao encontradas: ${reservasSessao.length}`);

        for (const reservaSessao of reservasSessao) {
            try {
                // Verifica se já passou do horário de gerar (15s antes do ScheduledAt)
                // 🎯 IMPORTANTE: Especifica o formato explicitamente para suportar horários "quebrados" (ex: 15:40:00)
                if (reservaSessao.ScheduledAt) {
                    const scheduled = dayjs.tz(reservaSessao.ScheduledAt, 'YYYY-MM-DD HH:mm:ss', 'America/Sao_Paulo');
                    
                    if (!scheduled.isValid()) {
                        console.error(`❌ [jobGerarTokenConsulta] ScheduledAt inválido para consulta ${reservaSessao.ConsultaId}: ${reservaSessao.ScheduledAt}`);
                        continue;
                    }
                    
                    const tokenGenTime = scheduled.subtract(15, 'second');
                    
                    // Só gera se já passou do momento de gerar ou está muito próximo (5 segundos de tolerância)
                    const secondsUntilGen = tokenGenTime.diff(agora, 'second');
                    
                    if (secondsUntilGen > 5) {
                        console.log(`⏳ [jobGerarTokenConsulta] Ainda não é hora de gerar tokens para consulta ${reservaSessao.ConsultaId}. Faltam ${secondsUntilGen} segundos.`);
                        continue;
                    }
                }
                
                // Gera tokens diretamente (fallback quando Redis falha)
                // A função generateAgoraTokensForConsulta já verifica se os tokens existem antes de gerar
                await generateAgoraTokensForConsulta(reservaSessao.ConsultaId);
                console.log(`✅ [jobGerarTokenConsulta] Tokens gerados para consulta ${reservaSessao.ConsultaId}`);
            } catch (error) {
                console.error(`❌ [jobGerarTokenConsulta] Erro ao gerar tokens para consulta ${reservaSessao.ConsultaId}:`, error);
                // Continua com a próxima reserva mesmo se esta falhar
            }
        }

        console.log(`[jobGerarTokenConsulta] Job finalizado. Processadas ${reservasSessao.length} reservas.`);
    } catch (error) {
        console.error(`❌ [jobGerarTokenConsulta] Erro fatal no job:`, error);
    }
}

