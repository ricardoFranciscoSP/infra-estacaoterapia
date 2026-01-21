import prisma from "../../prisma/client";
import { AgendaStatus } from "../../generated/prisma";
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export interface ConsultaRealizadaResponse {
    Id: string;
    Date: Date;
    Time: string;
    Status: string;
    Psicologo: {
        Id: string;
        Nome: string;
        Role: string;
        Images: { Url: string }[];
    } | null;
    Agenda: {
        Id: string;
        Data: Date;
        Horario: string;
        Status: string;
    } | null;
}

export class ConsultasPacienteService {
    /**
     * Finaliza uma consulta (atualiza status para 'Realizada')
     * Usa ConsultaStatusService para garantir regras de negócio e atualizar Agenda e ReservaSessao
 * @param forceFinalize Se true, força a finalização mesmo se ambos não estiveram na sala (usado quando completa 60 minutos)
     */
    async finalizarConsulta(consultaId: string, forceFinalize: boolean = false) {
        const { ConsultaStatusService } = await import('../consultaStatus.service');
        const statusService = new ConsultaStatusService();
        return await statusService.finalizarConsulta(consultaId, forceFinalize);
    }

    /**
     * Inicia uma consulta (atualiza status para 'EmAndamento')
     * Usa ConsultaStatusService para garantir regras de negócio
     */
    async iniciarConsulta(consultaId: string): Promise<{ success: boolean; message: string }> {
        const consulta = await prisma.consulta.findUnique({
            where: { Id: consultaId },
            include: {
                ReservaSessao: true,
                Paciente: { select: { Id: true } },
                Psicologo: { select: { Id: true } }
            }
        });

        if (!consulta) {
            throw new Error('Consulta não encontrada');
        }

        // Usa ConsultaStatusService para atualizar status corretamente
        const { ConsultaStatusService } = await import('../consultaStatus.service');
        const statusService = new ConsultaStatusService();
        await statusService.iniciarConsulta(consultaId);

        // Atualiza ReservaSessao se existir
        if (consulta.ReservaSessao) {
            await prisma.reservaSessao.update({
                where: { Id: consulta.ReservaSessao.Id },
                data: { Status: 'Andamento' }
            });
        }

        // Notifica atualização via WebSocket
        try {
            const { ProximaConsultaService } = await import('../proximaConsulta.service');
            const proximaConsultaService = new ProximaConsultaService();
            await proximaConsultaService.notificarAmbosUsuarios(
                consulta.PsicologoId || '',
                consulta.PacienteId,
                'atualizacao'
            );
        } catch (err) {
            console.error('[ConsultasPacienteService] Erro ao notificar atualização:', err);
        }

        return { success: true, message: 'Consulta iniciada com sucesso.' };
    }

    /**
     * Retorna a consulta em andamento do paciente (Status = 'Andamento' e horário atual)
     */
    async consultaEmAndamento(pacienteId: string): Promise<any | null> {
        const nowBr = dayjs().tz('America/Sao_Paulo');
        // Busca todas as consultas agendadas ou em andamento
        // IMPORTANTE: NÃO inclui 'Agendada' - apenas 'Reservado' ou 'Andamento' (consultas confirmadas)
        const consultasRaw = await prisma.consulta.findMany({
            where: {
                PacienteId: pacienteId,
                Status: { in: ['Reservado', 'EmAndamento'] },
                Date: { lte: nowBr.toDate() }
            },
            orderBy: [
                { Date: 'asc' },
                { Time: 'asc' }
            ],
            include: {
                Psicologo: {
                    select: {
                        Id: true,
                        Nome: true,
                        Role: true,
                        Images: { select: { Url: true } }
                    }
                },
                Agenda: true
            }
        });
        
        // FILTRO ADICIONAL: Remove consultas com status 'Agendada' que não devem aparecer
        const consultas = consultasRaw.filter(consulta => {
            const status = consulta.Status?.toString().toLowerCase() || '';
            return status !== 'agendada' && status !== 'agendado';
        });
        
        // Verifica se alguma está realmente em andamento pelo horário
        for (const consulta of consultas) {
            const dataDate = dayjs(consulta.Date).tz('America/Sao_Paulo');
            const dataStr = dataDate.format('YYYY-MM-DD');
            const horaConsulta = consulta.Time || '00:00';
            const [hh, mm] = horaConsulta.split(':').map(Number);
            const inicio = dayjs.tz(`${dataStr} ${hh}:${mm}:00`, 'America/Sao_Paulo');
            const fim = inicio.add(60, 'minute');
            if (nowBr.isAfter(inicio) && nowBr.isBefore(fim)) {
                return consulta;
            }
        }
        return null;
    }

    /**
     * Lista todas as consultas realizadas do paciente filtradas por status
     * Ordenadas da mais recente para a mais antiga
     */
    async listarConsultasRealizadas(
        pacienteId: string,
        status?: string[]
    ): Promise<ConsultaRealizadaResponse[]> {
        // Status padrão: Reagendada, Realizada e Canceladas (qualquer motivo)
        // NÃO inclui: Reservado, EmAndamento, Agendada
        const statusFiltro: string[] = status || [
            'ReagendadaPacienteNoPrazo',
            'ReagendadaPsicologoNoPrazo',
            'ReagendadaPsicologoForaDoPrazo',
            'Realizada',
            'Cancelado',
            'CanceladaPacienteNoPrazo',
            'CanceladaPacienteForaDoPrazo',
            'CanceladaPsicologoNoPrazo',
            'CanceladaPsicologoForaDoPrazo',
            'CanceladaForcaMaior',
            'CanceladaNaoCumprimentoContratualPaciente',
            'CanceladaNaoCumprimentoContratualPsicologo',
            'CanceladoAdministrador',
            'PacienteNaoCompareceu',
            'PsicologoNaoCompareceu',
            'PsicologoDescredenciado'
        ];

        const consultas = await prisma.consulta.findMany({
            where: {
                PacienteId: pacienteId,
                Status: {
                    in: statusFiltro as any as any
                }
            },
            orderBy: [
                { Date: 'desc' },
                { Time: 'desc' }
            ],
            include: {
                Psicologo: {
                    select: {
                        Id: true,
                        Nome: true,
                        Role: true,
                        Images: {
                            select: {
                                Url: true
                            }
                        }
                    }
                },
                Agenda: {
                    select: {
                        Id: true,
                        Data: true,
                        Horario: true,
                        Status: true
                    }
                }
            }
        });

        return consultas as ConsultaRealizadaResponse[];
    }

    /**
     * Lista consultas por status específico
     */
    async listarConsultasPorStatus(
        pacienteId: string,
        status: AgendaStatus
    ): Promise<ConsultaRealizadaResponse[]> {
        return this.listarConsultasRealizadas(pacienteId, [status]);
    }

    /**
     * Conta o total de consultas realizadas por status
     */
    async contarConsultasPorStatus(
        pacienteId: string,
        status?: string[]
    ): Promise<number> {
        // Status padrão: Reagendada, Realizada e Canceladas (qualquer motivo)
        // NÃO inclui: Reservado, EmAndamento
        const statusFiltro: string[] = status || [
            'ReagendadaPacienteNoPrazo',
            'ReagendadaPsicologoNoPrazo',
            'Realizada',
            'Cancelado',
            'CanceladaPacienteNoPrazo',
            'CanceladaPacienteForaDoPrazo',
            'CanceladaPsicologoNoPrazo',
            'CanceladaPsicologoForaDoPrazo',
            'PacienteNaoCompareceu',
            'PsicologoNaoCompareceu'
        ];

        return prisma.consulta.count({
            where: {
                PacienteId: pacienteId,
                Status: {
                    in: statusFiltro as any as any
                }
            }
        });
    }

    /**
     * Lista consultas realizadas por status e mês
     * @param pacienteId ID do paciente
     * @param mes Número do mês (1-12)
     * @param ano Ano (ex: 2025)
     * @param status Array de status para filtrar (opcional)
     */
    async listarConsultasPorStatusEMes(
        pacienteId: string,
        mes: number,
        ano: number,
        status?: string[]
    ): Promise<ConsultaRealizadaResponse[]> {
        // Status padrão: Reagendada, Realizada e Canceladas (qualquer motivo)
        // NÃO inclui: Reservado, EmAndamento
        const statusFiltro: string[] = status || [
            'ReagendadaPacienteNoPrazo',
            'ReagendadaPsicologoNoPrazo',
            'Realizada',
            'Cancelado',
            'CanceladaPacienteNoPrazo',
            'CanceladaPacienteForaDoPrazo',
            'CanceladaPsicologoNoPrazo',
            'CanceladaPsicologoForaDoPrazo',
            'PacienteNaoCompareceu',
            'PsicologoNaoCompareceu'
        ];

        // Primeiro dia do mês às 00:00:00
        const firstDay = new Date(ano, mes - 1, 1, 0, 0, 0, 0);
        // Último dia do mês às 23:59:59
        const lastDay = new Date(ano, mes, 0, 23, 59, 59, 999);

        const consultas = await prisma.consulta.findMany({
            where: {
                PacienteId: pacienteId,
                Status: {
                    in: statusFiltro as any
                },
                Date: {
                    gte: firstDay,
                    lte: lastDay
                }
            },
            orderBy: [
                { Date: 'desc' },
                { Time: 'desc' }
            ],
            include: {
                Psicologo: {
                    select: {
                        Id: true,
                        Nome: true,
                        Role: true,
                        Images: {
                            select: {
                                Url: true
                            }
                        }
                    }
                },
                Agenda: {
                    select: {
                        Id: true,
                        Data: true,
                        Horario: true,
                        Status: true
                    }
                }
            }
        });

        return consultas as ConsultaRealizadaResponse[];
    }

    /**
     * Conta consultas por status e mês
     */
    async contarConsultasPorStatusEMes(
        pacienteId: string,
        mes: number,
        ano: number,
        status?: AgendaStatus[]
    ): Promise<number> {
        // Status padrão: Reagendada, Concluido e Canceladas (qualquer motivo)
        // NÃO inclui: Reservado, Andamento
        const statusFiltro = status || [
            AgendaStatus.Reagendada,
            AgendaStatus.Concluido,
            AgendaStatus.Cancelado,
            AgendaStatus.Cancelled_by_patient,
            AgendaStatus.Cancelled_by_psychologist,
            AgendaStatus.Cancelled_no_show
        ];

        const firstDay = new Date(ano, mes - 1, 1, 0, 0, 0, 0);
        const lastDay = new Date(ano, mes, 0, 23, 59, 59, 999);

        return prisma.consulta.count({
            where: {
                PacienteId: pacienteId,
                Status: {
                    in: statusFiltro as any
                },
                Date: {
                    gte: firstDay,
                    lte: lastDay
                }
            }
        });
    }
}
