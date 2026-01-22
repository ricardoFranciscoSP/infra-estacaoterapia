import { generateAgoraTokensForConsulta } from '../utils/scheduleAgoraToken';
import prisma from '../prisma/client';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Job otimizado que verifica consultas próximas do horário de gerar tokens
 * OTIMIZADO: Filtra no banco por janela de tempo para reduzir processamento
 * 
 * Este job é uma camada extra de segurança para garantir que os tokens sejam gerados
 * mesmo se o Redis ou o cron de 1 minuto falharem
 */
export async function jobGerarTokenConsultaFrequente() {
    try {
        const agora = dayjs.tz(dayjs(), 'America/Sao_Paulo');
        
        // ✅ OTIMIZAÇÃO: Calcula janela de tempo como string (ScheduledAt é String no schema)
        // Busca apenas reservas que estão dentro de 2 minutos antes ou 1 minuto depois do momento ideal
        const janelaInicio = agora.subtract(2, 'minute').format('YYYY-MM-DD HH:mm:ss');
        const janelaFim = agora.add(1, 'minute').format('YYYY-MM-DD HH:mm:ss');
        
        // Busca reservas que:
        // 1. Têm ScheduledAt definido E dentro da janela de tempo (comparação de string)
        // 2. Não têm ambos os tokens gerados
        // 3. Estão próximas do horário de gerar (filtrado no banco)
        const reservasSessao = await prisma.reservaSessao.findMany({
            where: {
                ScheduledAt: { 
                    not: null,
                    gte: janelaInicio,
                    lte: janelaFim,
                },
                OR: [
                    { AgoraTokenPatient: null },
                    { AgoraTokenPsychologist: null },
                ],
            },
            select: {
                Id: true,
                ConsultaId: true,
                ScheduledAt: true,
                AgoraTokenPatient: true,
                AgoraTokenPsychologist: true,
            },
            take: 50, // ✅ OTIMIZADO: Reduzido de 100 para 50 para reduzir carga
        });

        if (reservasSessao.length === 0) {
            return; // Não há nada para processar
        }

        let processadas = 0;
        let geradas = 0;

        for (const reservaSessao of reservasSessao) {
            try {
                if (!reservaSessao.ScheduledAt) {
                    continue;
                }

                // 🎯 IMPORTANTE: Especifica o formato explicitamente para suportar horários "quebrados" (ex: 15:40:00)
                const scheduled = dayjs.tz(reservaSessao.ScheduledAt, 'YYYY-MM-DD HH:mm:ss', 'America/Sao_Paulo');
                
                if (!scheduled.isValid()) {
                    console.error(`❌ [jobGerarTokenConsultaFrequente] ScheduledAt inválido para consulta ${reservaSessao.ConsultaId}: ${reservaSessao.ScheduledAt}`);
                    continue;
                }
                
                // Momento ideal para gerar tokens: 15 segundos antes do ScheduledAt
                const tokenGenerationTime = scheduled.subtract(15, 'second');
                
                // Verifica se está dentro da janela de tempo (15 segundos antes até 30 segundos depois)
                const secondsUntilGen = tokenGenerationTime.diff(agora, 'second');
                
                // Só processa se:
                // - Já passou do momento de gerar (secondsUntilGen <= 0)
                // - OU está muito próximo (dentro de 5 segundos antes)
                // - OU está até 30 segundos depois (tolerância para recuperação)
                if (secondsUntilGen > 5 || secondsUntilGen < -30) {
                    continue; // Ainda não é hora ou já passou muito tempo
                }

                processadas++;
                
                // ✅ OTIMIZAÇÃO: Usa dados já carregados, evita query extra se possível
                if (reservaSessao.AgoraTokenPatient && reservaSessao.AgoraTokenPsychologist) {
                    // Tokens já foram gerados por outro processo
                    continue;
                }

                // Gera tokens diretamente
                const success = await generateAgoraTokensForConsulta(
                    reservaSessao.ConsultaId,
                    undefined,
                    'cron'
                );
                
                if (success) {
                    geradas++;
                    console.log(`✅ [jobGerarTokenConsultaFrequente] Tokens gerados para consulta ${reservaSessao.ConsultaId} (${secondsUntilGen > 0 ? `${Math.abs(secondsUntilGen)}s antes` : `${Math.abs(secondsUntilGen)}s depois`} do horário ideal)`);
                }
            } catch (error) {
                console.error(`❌ [jobGerarTokenConsultaFrequente] Erro ao gerar tokens para consulta ${reservaSessao.ConsultaId}:`, error);
                // Continua com a próxima reserva mesmo se esta falhar
            }
        }

        if (processadas > 0 || geradas > 0) {
            console.log(`[jobGerarTokenConsultaFrequente] Processadas: ${processadas}, Tokens gerados: ${geradas}`);
        }
    } catch (error) {
        console.error(`❌ [jobGerarTokenConsultaFrequente] Erro fatal no job:`, error);
    }
}

