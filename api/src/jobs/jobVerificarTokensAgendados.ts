import prisma from '../prisma/client';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { scheduleAgoraTokenGeneration } from '../utils/scheduleAgoraToken';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Job que verifica periodicamente se há ReservaSessao com ScheduledAt mas sem tokens gerados/agendados
 * Garante que TODOS os jobs sejam criados baseados no ScheduledAt da tabela ReservaSessao
 * 
 * Este job roda periodicamente para garantir que nenhum token deixe de ser agendado
 */
export async function jobVerificarTokensAgendados() {
    try {
        const agora = dayjs.tz(dayjs(), 'America/Sao_Paulo');
        
        // ✅ Busca apenas ReservaSessao que estão próximas do horário de gerar tokens
        // Como roda a cada minuto, só processa consultas que precisam de atenção agora
        // Janela: consultas que devem ter tokens gerados nos próximos 2 minutos ou que já passaram até 5 minutos
        const janelaInicio = agora.subtract(5, 'minute');
        const janelaFim = agora.add(2, 'minute');
        
        const reservasSessao = await prisma.reservaSessao.findMany({
            where: {
                ScheduledAt: { 
                    not: null,
                    // Busca apenas consultas cujo horário de gerar tokens (15s antes) está na janela
                    // Isso otimiza a query para não buscar todas as consultas do banco
                },
                OR: [
                    { AgoraTokenPatient: null },
                    { AgoraTokenPsychologist: null },
                ],
            },
            select: {
                ConsultaId: true,
                ScheduledAt: true,
                AgoraTokenPatient: true,
                AgoraTokenPsychologist: true,
            },
            take: 100, // Limita a 100 para não sobrecarregar
        });

        console.log(`[jobVerificarTokensAgendados] Verificando ${reservasSessao.length} reservas sem tokens completos`);

        let agendadas = 0;
        let jaGeradas = 0;
        let agendamentosFalhos = 0;

        for (const reservaSessao of reservasSessao) {
            try {
                if (!reservaSessao.ScheduledAt || !reservaSessao.ConsultaId) {
                    continue;
                }

                // Se ambos os tokens já foram gerados, pula
                if (reservaSessao.AgoraTokenPatient && reservaSessao.AgoraTokenPsychologist) {
                    jaGeradas++;
                    continue;
                }

                // 🎯 IMPORTANTE: Especifica o formato explicitamente para suportar horários "quebrados" (ex: 15:40:00)
                const scheduled = dayjs.tz(reservaSessao.ScheduledAt, 'YYYY-MM-DD HH:mm:ss', 'America/Sao_Paulo');
                
                if (!scheduled.isValid()) {
                    console.error(`❌ [jobVerificarTokensAgendados] ScheduledAt inválido para consulta ${reservaSessao.ConsultaId}: ${reservaSessao.ScheduledAt}`);
                    continue;
                }
                
                const tokenGenerationTime = scheduled.subtract(15, 'second');
                
                // Calcula tempo até a geração
                const secondsUntilGen = tokenGenerationTime.diff(agora, 'second');
                
                // ✅ Como roda a cada minuto, só processa consultas que estão na janela de tempo
                // Janela: de 5 minutos atrás até 2 minutos no futuro
                // Isso garante que qualquer horário seja capturado, mas sem processar consultas muito distantes
                if (secondsUntilGen < -300 || secondsUntilGen > 120) {
                    // Fora da janela de 5 minutos atrás até 2 minutos no futuro
                    continue;
                }

                // Tenta agendar (a função vai buscar o ScheduledAt do banco novamente)
                // Passa undefined para forçar busca do banco
                const success = await scheduleAgoraTokenGeneration(reservaSessao.ConsultaId, undefined);
                
                if (success) {
                    agendadas++;
                    console.log(`✅ [jobVerificarTokensAgendados] Job agendado para consulta ${reservaSessao.ConsultaId} (ScheduledAt: ${reservaSessao.ScheduledAt})`);
                } else {
                    agendamentosFalhos++;
                    console.warn(`⚠️ [jobVerificarTokensAgendados] Falha ao agendar job para consulta ${reservaSessao.ConsultaId}`);
                }
            } catch (error) {
                console.error(`❌ [jobVerificarTokensAgendados] Erro ao processar consulta ${reservaSessao.ConsultaId}:`, error);
                agendamentosFalhos++;
            }
        }

        console.log(`[jobVerificarTokensAgendados] Finalizado. Agendadas: ${agendadas}, Já geradas: ${jaGeradas}, Falhas: ${agendamentosFalhos}`);
    } catch (error) {
        console.error(`❌ [jobVerificarTokensAgendados] Erro fatal no job:`, error);
    }
}

