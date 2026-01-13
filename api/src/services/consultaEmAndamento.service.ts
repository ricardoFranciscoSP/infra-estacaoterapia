import prisma from "../prisma/client";
import dayjs from "dayjs";
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { ProximaConsultaService } from "./proximaConsulta.service";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Serviço para verificar e notificar consultas em andamento
 * Considera consulta "em andamento" se estiver dentro da janela de 1 hora do horário agendado
 * Otimizado para notificar apenas quando há mudança de status (entrada/saída da janela)
 */
export class ConsultaEmAndamentoService {
    private proximaConsultaService: ProximaConsultaService;
    private ultimasNotificacoes: Map<string, number> = new Map(); // Cache de última notificação por consulta
    private INTERVALO_NOTIFICACAO = 5 * 60 * 1000; // 5 minutos entre notificações da mesma consulta

    constructor() {
        this.proximaConsultaService = new ProximaConsultaService();
    }

    /**
     * Verifica todas as consultas e identifica quais estão em andamento
     * Notifica usuários apenas quando uma consulta ENTRA na janela de 1 hora
     * Implementa throttling para evitar notificações duplicadas
     */
    async verificarENotificarConsultasEmAndamento(): Promise<void> {
        try {
            const nowBr = dayjs().tz('America/Sao_Paulo');
            const hoje = nowBr.startOf('day').toDate();
            const agoraTimestamp = nowBr.valueOf();

            // Busca apenas consultas que estão próximas de começar (dentro dos próximos 65 minutos)
            const consultas = await prisma.consulta.findMany({
                where: {
                    Status: { in: ['Reservado', 'EmAndamento'] },
                    Date: { gte: hoje }
                },
                include: {
                    Paciente: {
                        select: {
                            Id: true,
                            Nome: true
                        }
                    },
                    Psicologo: {
                        select: {
                            Id: true,
                            Nome: true
                        }
                    }
                }
            });

            const usuariosParaNotificar = new Set<string>();
            let consultasEmAndamento = 0;

            for (const consulta of consultas) {
                // Extrai data e horário
                const dataDate = dayjs(consulta.Date).tz('America/Sao_Paulo');
                const dataStr = dataDate.format('YYYY-MM-DD');
                const [hh, mm] = (consulta.Time || '00:00').split(':').map(Number);
                const dataHoraCompleta = dayjs.tz(`${dataStr} ${hh}:${mm}:00`, 'America/Sao_Paulo');
                const inicioConsultaTimestamp = dataHoraCompleta.valueOf();
                const fimConsultaTimestamp = inicioConsultaTimestamp + (60 * 60 * 1000); // +1 hora

                // Verifica se está em andamento (dentro da janela de 1 hora)
                const estaEmAndamento = agoraTimestamp >= inicioConsultaTimestamp && agoraTimestamp <= fimConsultaTimestamp;

                // Se está em andamento, verifica se já foi notificado recentemente
                if (estaEmAndamento) {
                    consultasEmAndamento++;
                    const ultimaNotificacao = this.ultimasNotificacoes.get(consulta.Id) || 0;
                    const tempoDecorrido = agoraTimestamp - ultimaNotificacao;

                    // Notifica apenas se passou mais de INTERVALO_NOTIFICACAO desde a última notificação
                    if (tempoDecorrido > this.INTERVALO_NOTIFICACAO) {
                        if (consulta.PacienteId) {
                            usuariosParaNotificar.add(consulta.PacienteId);
                        }
                        if (consulta.PsicologoId) {
                            usuariosParaNotificar.add(consulta.PsicologoId);
                        }

                        // Registra a notificação
                        this.ultimasNotificacoes.set(consulta.Id, agoraTimestamp);
                    }
                }
            }

            // Notifica todos os usuários que têm consultas em andamento
            for (const userId of usuariosParaNotificar) {
                try {
                    await this.proximaConsultaService.notificarAtualizacaoProximaConsulta(
                        userId,
                        null, // A consulta será buscada no frontend
                        'atualizacao'
                    );
                } catch (error) {
                    console.error(`Erro ao notificar usuário ${userId}:`, error);
                }
            }

            if (consultasEmAndamento > 0 && usuariosParaNotificar.size > 0) {
                console.log(`✅ ${consultasEmAndamento} consultas em andamento. ${usuariosParaNotificar.size} usuários notificados.`);
            }
        } catch (error) {
            console.error('Erro ao verificar consultas em andamento:', error);
        }
    }

    /**
     * Verifica se uma consulta específica está em andamento
     */
    isConsultaEmAndamento(consulta: { Date: Date; Time: string }): boolean {
        const nowBr = dayjs().tz('America/Sao_Paulo');
        const agoraTimestamp = nowBr.valueOf();

        const dataDate = dayjs(consulta.Date).tz('America/Sao_Paulo');
        const dataStr = dataDate.format('YYYY-MM-DD');
        const [hh, mm] = (consulta.Time || '00:00').split(':').map(Number);
        const dataHoraCompleta = dayjs.tz(`${dataStr} ${hh}:${mm}:00`, 'America/Sao_Paulo');
        const inicioConsultaTimestamp = dataHoraCompleta.valueOf();
        const fimConsultaTimestamp = inicioConsultaTimestamp + (60 * 60 * 1000); // +1 hora

        return agoraTimestamp >= inicioConsultaTimestamp && agoraTimestamp <= fimConsultaTimestamp;
    }
}

