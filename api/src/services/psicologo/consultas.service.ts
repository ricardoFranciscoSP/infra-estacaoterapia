import { IConsultasService } from "../../interfaces/psicoologo/iConsultas.interface";
import { IAgendaRepository } from '../../repositories/IAgendaRepository';
import prisma from "../../prisma/client";
import { $Enums, AgendaStatus, Prisma } from "../../generated/prisma/client";
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export interface ConsultaRealizadaPsicologoResponse {
    Id: string;
    Date: Date;
    Time: string;
    Status: string;
    Paciente: {
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

export class ConsultasService implements IConsultasService {
    constructor(
        private agendaRepository: IAgendaRepository
    ) { }

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
                data: { Status: AgendaStatus.Andamento }
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
            console.error('[ConsultasService] Erro ao notificar atualização:', err);
        }

        return { success: true, message: 'Consulta iniciada com sucesso.' };
    }

    /**
     * Retorna a consulta em andamento do psicólogo (Status = 'Andamento' e horário atual)
     */
    async consultaEmAndamento(psicologoId: string): Promise<Prisma.ConsultaGetPayload<{
        include: {
            Paciente: {
                select: {
                    Id: true;
                    Nome: true;
                    Role: true;
                    Images: { select: { Url: true } };
                };
            };
            Agenda: true;
        };
    }> | null> {
        // Busca todas as consultas em andamento sem cortar por data/hora; o status governa a visibilidade.
        const consultas = await prisma.consulta.findMany({
            where: {
                PsicologoId: psicologoId,
                Status: { in: ['EmAndamento'] },
            },
            orderBy: [
                { CreatedAt: 'desc' },
            ],
            include: {
                Paciente: {
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
        // Mantém a consulta em andamento enquanto o status estiver EmAndamento,
        // independentemente de já ter ultrapassado o horário previsto.
        // A remoção do card fica a cargo da finalização da consulta (status diferente de EmAndamento).
        return consultas[0] || null;
    }

    async consultasRealizadas(psicologoId: string): Promise<number> {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0-indexed
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0, 23, 59, 59, 999);

        const consultasConcluidas = await prisma.consulta.count({
            where: {
                PsicologoId: psicologoId,
                Status: $Enums.ConsultaStatus.Realizada,
                Date: {
                    gte: firstDay,
                    lte: lastDay
                }
            }
        });
        return consultasConcluidas;
    }

    async consultasPendentes(psicologoId: string): Promise<number> {
        // Usa data/hora atual do servidor em Brasília (nunca do cliente)
        const nowBr = dayjs().tz('America/Sao_Paulo');
        const inicioDoDiaAtual = nowBr.startOf('day').toDate();
        const dataAtualStr = nowBr.format('YYYY-MM-DD');
        const horaAtualBr = nowBr.format('HH:mm');

        console.log(`[ConsultasService.consultasPendentes] Horário do servidor usado:`, nowBr.toISOString(), '| Timezone: America/Sao_Paulo', '| Hora atual:', horaAtualBr);

        // Busca todas as consultas do dia atual ou futuras com status Reservado ou Agendada
        const consultasRaw = await prisma.consulta.findMany({
            where: {
                PsicologoId: psicologoId,
                Status: {
                    in: [$Enums.ConsultaStatus.Reservado, $Enums.ConsultaStatus.Agendada, $Enums.ConsultaStatus.EmAndamento]
                },
                Date: {
                    gte: inicioDoDiaAtual
                }
            },
            include: {
                Paciente: {
                    select: {
                        Id: true,
                        Nome: true
                    }
                }
            }
        });

        // Filtra apenas consultas que ainda não começaram (a partir da data/horário atual do servidor)
        const agoraTimestamp = nowBr.valueOf(); // Timestamp em milissegundos
        const consultasPendentes = consultasRaw.filter(consulta => {
            // Extrai a data no timezone de Brasília
            const dataDate = dayjs(consulta.Date).tz('America/Sao_Paulo');
            const dataStr = dataDate.format('YYYY-MM-DD');

            // Monta data/hora completa para comparação precisa
            const [hh, mm] = (consulta.Time || '00:00').split(':').map(Number);
            const dataHoraCompleta = dayjs.tz(`${dataStr} ${hh}:${mm}:00`, 'America/Sao_Paulo');
            const inicioConsultaTimestamp = dataHoraCompleta.valueOf();

            // Consulta é pendente se a data/hora completa ainda não passou
            return inicioConsultaTimestamp > agoraTimestamp;
        });

        return consultasPendentes.length;
    }

    /**
     * Calcula a taxa de ocupação da agenda nos últimos 30 dias.
     * Retorna um objeto com a quantidade de horários por status e o percentual de ocupação.
     */
    async taxaOcupacaoAgenda(psicologoId: string): Promise<{ disponivel: number, reservado: number, andamento: number, concluido: number, percentualOcupacao: number, percentualReservado: number }> {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0-indexed
        const firstDay = new Date(year, month, 1, 0, 0, 0, 0);
        const lastDay = new Date(year, month + 1, 0, 23, 59, 59, 999);

        // Busca a quantidade de horários por status na tabela Agenda, excluindo "Bloqueado"
        const [disponivel, reservado, andamento, concluido, totalHorarios] = await Promise.all([
            this.agendaRepository.count({
                where: {
                    PsicologoId: psicologoId,
                    Status: AgendaStatus.Disponivel,
                    Data: {
                        gte: firstDay,
                        lte: lastDay
                    }
                }
            }),
            this.agendaRepository.count({
                where: {
                    PsicologoId: psicologoId,
                    Status: AgendaStatus.Reservado,
                    Data: {
                        gte: firstDay,
                        lte: lastDay
                    }
                }
            }),
            this.agendaRepository.count({
                where: {
                    PsicologoId: psicologoId,
                    Status: AgendaStatus.Andamento,
                    Data: {
                        gte: firstDay,
                        lte: lastDay
                    }
                }
            }),
            this.agendaRepository.count({
                where: {
                    PsicologoId: psicologoId,
                    Status: AgendaStatus.Concluido,
                    Data: {
                        gte: firstDay,
                        lte: lastDay
                    }
                }
            }),
            // Total de horários no mês, exceto "Bloqueado"
            this.agendaRepository.count({
                where: {
                    PsicologoId: psicologoId,
                    Status: { not: AgendaStatus.Bloqueado },
                    Data: {
                        gte: firstDay,
                        lte: lastDay
                    }
                }
            })
        ]);

        // Percentual de ocupação: horários ocupados (reservado, andamento, concluido) sobre total (exceto bloqueado)
        const ocupados = reservado + andamento + concluido;
        const percentualOcupacao = totalHorarios === 0 ? 0 : Math.round((ocupados / totalHorarios) * 100);

        // Percentual reservado: horários reservados sobre total (exceto bloqueado)
        const percentualReservado = totalHorarios === 0 ? 0 : Math.round((reservado / totalHorarios) * 100);

        return {
            disponivel,
            reservado,
            andamento,
            concluido,
            percentualOcupacao,
            percentualReservado
        };
    }

    async proximasConsultas(psicologoId: string): Promise<Prisma.ConsultaGetPayload<{
        include: {
            Paciente: {
                select: {
                    Id: true;
                    Nome: true;
                    Role: true;
                    Images: { select: { Url: true } };
                };
            };
            Agenda: true;
        };
    }>[]> {
        // Data/hora atual em Brasília
        const nowBr = dayjs().tz('America/Sao_Paulo');
        const inicioDoDiaAtual = nowBr.startOf('day').toDate();
        const dataAtualStr = nowBr.format('YYYY-MM-DD');
        const horaAtualBr = nowBr.format('HH:mm');
        console.log(`[ConsultasService] Horário usado na busca:`, nowBr.toISOString(), '| Timezone: America/Sao_Paulo', '| Hora atual:', horaAtualBr);

        // Busca todas as consultas do dia atual (independente do horário) e futuras
        // Usa gte para garantir que inclui todas as datas >= hoje (incluindo 01/12, 02/12, etc)
        // O campo Date pode ter apenas a data (ex: 2025-12-01 03:00:00), então precisamos
        // buscar por data >= início do dia atual e depois filtrar por data+horário
        const consultas = await prisma.consulta.findMany({
            where: {
                PsicologoId: psicologoId,
                Status: {
                    in: [
                        $Enums.ConsultaStatus.Reservado,
                        $Enums.ConsultaStatus.Agendada,
                        $Enums.ConsultaStatus.EmAndamento
                    ]
                },
                // Busca consultas do dia atual ou futuras (Date >= início do dia)
                // Isso inclui todas as datas futuras (01/12, 02/12, etc)
                Date: { gte: inicioDoDiaAtual }
            },
            orderBy: [
                { Date: "asc" },
                { Time: "asc" }
            ],
            include: {
                Paciente: {
                    select: {
                        Id: true,
                        Nome: true,
                        Role: true,
                        Images: {
                            select: { Url: true }
                        }
                    }
                },
                Psicologo: {
                    select: {
                        Id: true,
                        Nome: true,
                        Role: true,
                        Images: {
                            select: { Url: true }
                        }
                    }
                },
                Agenda: true,
                ConsultaParticipacao: true,
                Cancelamentos: true
            }
        });

        // Filtra e processa as consultas considerando Date + Time
        // Garante que nunca retorne consultas retroativas (que já começaram)
        const agoraTimestamp = nowBr.valueOf(); // Timestamp em milissegundos
        const consultasProcessadas = consultas
            .map(consulta => {
                // Extrai apenas a data (YYYY-MM-DD) do campo Date no timezone de Brasília
                const dataDate = dayjs(consulta.Date).tz('America/Sao_Paulo');
                const dataStr = dataDate.format('YYYY-MM-DD');

                // Combina data + horário para criar data/hora completa
                const [hh, mm] = (consulta.Time || '00:00').split(':').map(Number);
                const dataHoraCompleta = dayjs.tz(`${dataStr} ${hh}:${mm}:00`, 'America/Sao_Paulo');
                const inicioConsultaTimestamp = dataHoraCompleta.valueOf();

                // Verifica se a consulta já começou usando timestamp (comparação precisa)
                if (inicioConsultaTimestamp <= agoraTimestamp) {
                    // Consulta já começou, não é válida
                    return null;
                }

                return {
                    consulta,
                    dataHoraCompleta: dataHoraCompleta.toDate()
                };
            })
            .filter((item): item is { consulta: typeof consultas[0]; dataHoraCompleta: Date } => item !== null);

        // Ordena por data/hora completa (mais próxima primeiro)
        consultasProcessadas.sort((a, b) =>
            a.dataHoraCompleta.getTime() - b.dataHoraCompleta.getTime()
        );

        // Extrai apenas as consultas ordenadas
        return consultasProcessadas.map(item => item.consulta);
    }

    /**
     * Busca a próxima consulta do psicólogo no formato similar ao de pacientes
     * Retorna objeto com nextReservation, consultaAtual e futuras
     */
    async proximaConsultaPsicologo(psicologoId: string): Promise<{
        success: boolean;
        nextReservation?: Prisma.ConsultaGetPayload<{
            include: {
                Paciente: {
                    select: {
                        Id: true;
                        Nome: true;
                        Role: true;
                        Images: { select: { Url: true } };
                    };
                };
                Psicologo: {
                    select: {
                        Id: true;
                        Nome: true;
                        Role: true;
                        Images: { select: { Url: true } };
                    };
                };
                Agenda: {
                    select: {
                        Data: true;
                        Horario: true;
                        DiaDaSemana: true;
                        Status: true;
                    };
                };
                ReservaSessao: {
                    select: {
                        AgoraChannel: true;
                        Status: true;
                    };
                };
            };
        }>;
        consultaAtual?: Prisma.ConsultaGetPayload<{
            include: {
                Paciente: {
                    select: {
                        Id: true;
                        Nome: true;
                        Role: true;
                        Images: { select: { Url: true } };
                    };
                };
                Psicologo: {
                    select: {
                        Id: true;
                        Nome: true;
                        Role: true;
                        Images: { select: { Url: true } };
                    };
                };
                Agenda: {
                    select: {
                        Data: true;
                        Horario: true;
                        DiaDaSemana: true;
                        Status: true;
                    };
                };
                ReservaSessao: {
                    select: {
                        AgoraChannel: true;
                        Status: true;
                    };
                };
            };
        }>;
        futuras?: Prisma.ConsultaGetPayload<{
            include: {
                Paciente: {
                    select: {
                        Id: true;
                        Nome: true;
                        Role: true;
                        Images: { select: { Url: true } };
                    };
                };
                Psicologo: {
                    select: {
                        Id: true;
                        Nome: true;
                        Role: true;
                        Images: { select: { Url: true } };
                    };
                };
                Agenda: {
                    select: {
                        Data: true;
                        Horario: true;
                        DiaDaSemana: true;
                        Status: true;
                    };
                };
                ReservaSessao: {
                    select: {
                        AgoraChannel: true;
                        Status: true;
                    };
                };
            };
        }>[];
        total?: number;
        error?: string;
    }> {
        try {
            // Data/hora atual em Brasília
            const nowBr = dayjs().tz('America/Sao_Paulo');
            const inicioDoDiaAtual = nowBr.startOf('day').toDate();
            const dataAtualStr = nowBr.format('YYYY-MM-DD');
            const horaAtualBr = nowBr.format('HH:mm');
            console.log(`[ConsultasService] Horário usado na busca próxima consulta:`, nowBr.toISOString(), '| Timezone: America/Sao_Paulo', '| Hora atual:', horaAtualBr);

            // Busca todas as consultas do dia atual ou futuras
            const consultas = await prisma.consulta.findMany({
                where: {
                    PsicologoId: psicologoId,
                    Status: { in: ["Reservado", "EmAndamento"] },
                    Date: { gte: inicioDoDiaAtual }
                },
                orderBy: [
                    { Date: "asc" },
                    { Time: "asc" }
                ],
                include: {
                    Paciente: {
                        select: {
                            Id: true,
                            Nome: true,
                            Role: true,
                            Images: {
                                select: { Url: true }
                            }
                        }
                    },
                    Psicologo: {
                        select: {
                            Id: true,
                            Nome: true,
                            Role: true,
                            Images: {
                                select: { Url: true }
                            }
                        }
                    },
                    Agenda: {
                        select: {
                            Data: true,
                            Horario: true,
                            DiaDaSemana: true,
                            Status: true
                        }
                    },
                    ReservaSessao: {
                        select: {
                            AgoraChannel: true,
                            Status: true
                        }
                    }
                }
            });

            // Filtra consultas considerando Date + Time e timezone de Brasília
            // Inclui consultas em andamento que estão dentro da janela de 50 minutos
            const agoraTimestamp = nowBr.valueOf(); // Timestamp em milissegundos
            const consultasValidas = consultas
                .map(consulta => {
                    // Extrai a data no timezone de Brasília
                    const dataDate = dayjs(consulta.Date).tz('America/Sao_Paulo');
                    const dataStr = dataDate.format('YYYY-MM-DD');

                    // Monta data/hora completa para ordenação
                    const [hh, mm] = (consulta.Time || '00:00').split(':').map(Number);
                    const dataHoraCompleta = dayjs.tz(`${dataStr} ${hh}:${mm}:00`, 'America/Sao_Paulo');
                    const inicioConsultaTimestamp = dataHoraCompleta.valueOf();
                    const fimConsultaTimestamp = inicioConsultaTimestamp + (50 * 60 * 1000); // +50 minutos em ms

                    // Se a consulta está em andamento, verifica se está dentro da janela de 50 minutos
                    if (consulta.Status === 'EmAndamento') {
                        // Consulta em andamento: só inclui se ainda estiver dentro da janela de 50 minutos
                        if (agoraTimestamp >= inicioConsultaTimestamp && agoraTimestamp <= fimConsultaTimestamp) {
                            return { consulta, dataHora: dataHoraCompleta, emAndamento: true };
                        } else {
                            // Passou de 50 minutos, não inclui
                            return null;
                        }
                    }

                    // Para consultas 'Reservado', verifica se a data/hora completa já passou
                    // Usa timestamp para comparação precisa (não compara strings de horário)
                    if (inicioConsultaTimestamp <= agoraTimestamp) {
                        // A consulta já começou e não está em andamento (já passou do fim)
                        // Verifica se passou do fim da consulta (50 minutos após o início)
                        if (agoraTimestamp > fimConsultaTimestamp) {
                            // Já passou do fim da consulta, não é válida
                            return null;
                        }
                        // Se ainda está dentro da janela mas não foi marcada como em andamento,
                        // pode ser um caso edge, mas ainda considera válida
                    }

                    // Se a data/hora completa é futura, é válida
                    return { consulta, dataHora: dataHoraCompleta, emAndamento: false };
                })
                .filter((item): item is { consulta: typeof consultas[0]; dataHora: dayjs.Dayjs; emAndamento: boolean } => item !== null)
                .sort((a, b) => {
                    // Se uma está em andamento e a outra não, a em andamento vem primeiro
                    if (a.emAndamento && !b.emAndamento) return -1;
                    if (!a.emAndamento && b.emAndamento) return 1;
                    // Caso contrário, ordena por data/hora crescente (mais próxima primeiro)
                    return a.dataHora.diff(b.dataHora);
                });

            if (consultasValidas.length === 0) {
                return {
                    success: false,
                    error: 'Não existem consultas agendadas futuras.'
                };
            }

            // A primeira consulta é sempre a próxima (já ordenada por data/hora ASC)
            const consultaAtual = consultasValidas[0].consulta;
            const nextReservation = consultaAtual; // nextReservation é a mesma que consultaAtual

            // As demais são consultas futuras
            const futuras = consultasValidas.slice(1).map(item => item.consulta);

            return {
                success: true,
                nextReservation, // Adiciona nextReservation explicitamente
                consultaAtual,
                futuras,
                total: consultasValidas.length
            };
        } catch (error) {
            console.error('Erro ao buscar próxima consulta do psicólogo:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erro interno no servidor.'
            };
        }
    }

    /**
     * Lista todas as consultas realizadas do psicólogo filtradas por status
     * Ordenadas da mais recente para a mais antiga
     */
    async listarConsultasRealizadasPorStatus(
        psicologoId: string,
        status?: string[]
    ): Promise<ConsultaRealizadaPsicologoResponse[]> {
        // Status padrão: Reagendada, Concluido e Canceladas (qualquer motivo)
        // NÃO inclui: Reservado, Andamento
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

        const consultas = await prisma.consulta.findMany({
            where: {
                PsicologoId: psicologoId,
                Status: {
                    in: statusFiltro as Prisma.EnumConsultaStatusFilter<"Consulta">["in"]
                }
            },
            orderBy: [
                { Date: 'desc' },
                { Time: 'desc' }
            ],
            include: {
                Paciente: {
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

        return consultas as ConsultaRealizadaPsicologoResponse[];
    }

    /**
     * Lista consultas realizadas por status e mês
     * @param psicologoId ID do psicólogo
     * @param mes Número do mês (1-12)
     * @param ano Ano (ex: 2025)
     * @param status Array de status para filtrar (opcional)
     */
    async listarConsultasPorStatusEMes(
        psicologoId: string,
        mes: number,
        ano: number,
        status?: string[]
    ): Promise<ConsultaRealizadaPsicologoResponse[]> {
        // Status padrão: Reagendada, Concluido e Canceladas (qualquer motivo)
        // NÃO inclui: Reservado, Andamento
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
                PsicologoId: psicologoId,
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
                Paciente: {
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

        return consultas as ConsultaRealizadaPsicologoResponse[];
    }

    /**
     * Lista consultas por status específico
     */
    async listarConsultasPorStatusEspecifico(
        psicologoId: string,
        status: string
    ): Promise<ConsultaRealizadaPsicologoResponse[]> {
        return this.listarConsultasRealizadasPorStatus(psicologoId, [status]);
    }

    /**
     * Conta o total de consultas realizadas por status
     */
    async contarConsultasPorStatus(
        psicologoId: string,
        status?: string[]
    ): Promise<number> {
        // Status padrão: Reagendada, Concluido e Canceladas (qualquer motivo)
        // NÃO inclui: Reservado, Andamento
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
                PsicologoId: psicologoId,
                Status: {
                    in: statusFiltro as any
                }
            }
        });
    }

    /**
     * Conta consultas por status e mês
     */
    async contarConsultasPorStatusEMes(
        psicologoId: string,
        mes: number,
        ano: number,
        status?: string[]
    ): Promise<number> {
        // Status padrão: Reagendada, Concluido e Canceladas (qualquer motivo)
        // NÃO inclui: Reservado, Andamento
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

        const firstDay = new Date(ano, mes - 1, 1, 0, 0, 0, 0);
        const lastDay = new Date(ano, mes, 0, 23, 59, 59, 999);

        return prisma.consulta.count({
            where: {
                PsicologoId: psicologoId,
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

    /**
     * Lista histórico de consultas com filtros avançados
     * Suporta filtro por status, busca por nome do paciente, intervalo de datas e paginação
     */
    async listarHistoricoConsultas(
        psicologoId: string,
        filtros: {
            status?: 'todos' | 'efetuada' | 'cancelada';
            buscaPaciente?: string;
            dataInicial?: string;
            dataFinal?: string;
            page?: number;
            pageSize?: number;
        }
    ): Promise<{
        data: ConsultaRealizadaPsicologoResponse[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
    }> {
        const page = filtros.page || 1;
        const pageSize = filtros.pageSize || 10;
        const skip = (page - 1) * pageSize;

        // Define status baseado no filtro usando ConsultaStatus
        let statusFiltro: $Enums.ConsultaStatus[] = [];

        if (filtros.status === 'efetuada') {
            statusFiltro = [
                $Enums.ConsultaStatus.Realizada,
                $Enums.ConsultaStatus.ReagendadaPacienteNoPrazo,
                $Enums.ConsultaStatus.ReagendadaPsicologoNoPrazo,
                $Enums.ConsultaStatus.ReagendadaPsicologoForaDoPrazo
            ];
        } else if (filtros.status === 'cancelada') {
            statusFiltro = [
                $Enums.ConsultaStatus.Cancelado,
                $Enums.ConsultaStatus.CanceladaPacienteNoPrazo,
                $Enums.ConsultaStatus.CanceladaPsicologoNoPrazo,
                $Enums.ConsultaStatus.CanceladaPacienteForaDoPrazo,
                $Enums.ConsultaStatus.CanceladaPsicologoForaDoPrazo,
                $Enums.ConsultaStatus.CanceladaForcaMaior,
                $Enums.ConsultaStatus.CanceladaNaoCumprimentoContratualPaciente,
                $Enums.ConsultaStatus.CanceladaNaoCumprimentoContratualPsicologo,
                $Enums.ConsultaStatus.CanceladoAdministrador,
                $Enums.ConsultaStatus.PacienteNaoCompareceu,
                $Enums.ConsultaStatus.PsicologoNaoCompareceu
            ];
        } else {
            // 'todos' ou não especificado - inclui todos os status finalizados
            statusFiltro = [
                $Enums.ConsultaStatus.Realizada,
                $Enums.ConsultaStatus.ReagendadaPacienteNoPrazo,
                $Enums.ConsultaStatus.ReagendadaPsicologoNoPrazo,
                $Enums.ConsultaStatus.ReagendadaPsicologoForaDoPrazo,
                $Enums.ConsultaStatus.Cancelado,
                $Enums.ConsultaStatus.CanceladaPacienteNoPrazo,
                $Enums.ConsultaStatus.CanceladaPsicologoNoPrazo,
                $Enums.ConsultaStatus.CanceladaPacienteForaDoPrazo,
                $Enums.ConsultaStatus.CanceladaPsicologoForaDoPrazo,
                $Enums.ConsultaStatus.CanceladaForcaMaior,
                $Enums.ConsultaStatus.CanceladaNaoCumprimentoContratualPaciente,
                $Enums.ConsultaStatus.CanceladaNaoCumprimentoContratualPsicologo,
                $Enums.ConsultaStatus.CanceladoAdministrador,
                $Enums.ConsultaStatus.PacienteNaoCompareceu,
                $Enums.ConsultaStatus.PsicologoNaoCompareceu
            ];
        }

        // Monta condições de filtro
        const whereConditions: Prisma.ConsultaWhereInput = {
            PsicologoId: psicologoId,
            Status: {
                in: statusFiltro as Prisma.EnumConsultaStatusFilter<"Consulta">["in"]
            }
        };

        // Filtro por intervalo de datas
        if (filtros.dataInicial || filtros.dataFinal) {
            whereConditions.Date = {};
            if (filtros.dataInicial) {
                const dataInicial = new Date(filtros.dataInicial);
                dataInicial.setHours(0, 0, 0, 0);
                whereConditions.Date.gte = dataInicial;
            }
            if (filtros.dataFinal) {
                const dataFinal = new Date(filtros.dataFinal);
                dataFinal.setHours(23, 59, 59, 999);
                whereConditions.Date.lte = dataFinal;
            }
        }

        // Filtro por nome do paciente (busca case-insensitive)
        if (filtros.buscaPaciente && filtros.buscaPaciente.trim()) {
            whereConditions.Paciente = {
                Nome: {
                    contains: filtros.buscaPaciente.trim(),
                    mode: 'insensitive'
                }
            };
        }

        // Busca total para paginação
        const total = await prisma.consulta.count({
            where: whereConditions
        });

        // Busca consultas com paginação
        const consultas = await prisma.consulta.findMany({
            where: whereConditions,
            orderBy: [
                { Date: 'desc' },
                { Time: 'desc' }
            ],
            include: {
                Paciente: {
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
            },
            skip,
            take: pageSize
        });

        return {
            data: consultas as ConsultaRealizadaPsicologoResponse[],
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize)
        };
    }
}