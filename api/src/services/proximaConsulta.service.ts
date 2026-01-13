import prisma from "../prisma/client";
import { AgendaStatus, $Enums } from "../generated/prisma/client";
import axios from "axios";
import dayjs from "dayjs";
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Serviço para gerenciar notificações de próxima consulta em tempo real
 */
export class ProximaConsultaService {
    private socketServerUrl: string;

    constructor() {
        this.socketServerUrl = process.env.SOCKET_SERVER_URL || "http://localhost:3334";
    }

    /**
     * Busca a próxima consulta agendada para um psicólogo
     * @param psicologoId ID do psicólogo
     * @returns Próxima consulta ou null
     */
    async buscarProximaConsulta(psicologoId: string) {
        try {
            const nowBr = dayjs().tz('America/Sao_Paulo');
            const inicioDoDiaAtual = nowBr.startOf('day').toDate();
            console.log(`[ProximaConsultaService] Horário usado na busca:`, nowBr.toISOString(), '| Timezone: America/Sao_Paulo');

            // Busca consultas do dia atual ou futuras
            const consultas = await prisma.consulta.findMany({
                where: {
                    PsicologoId: psicologoId,
                    Status: {
                        in: [
                            $Enums.ConsultaStatus.Reservado,
                            $Enums.ConsultaStatus.EmAndamento,
                            $Enums.ConsultaStatus.PacienteNaoCompareceu,
                            $Enums.ConsultaStatus.PsicologoNaoCompareceu,
                            $Enums.ConsultaStatus.CanceladaPacienteNoPrazo,
                            $Enums.ConsultaStatus.CanceladaPacienteForaDoPrazo,
                            $Enums.ConsultaStatus.CanceladaPsicologoNoPrazo,
                            $Enums.ConsultaStatus.CanceladaPsicologoForaDoPrazo
                        ]
                    },
                    Date: {
                        gte: inicioDoDiaAtual
                    }
                },
                include: {
                    Paciente: {
                        select: {
                            Id: true,
                            Nome: true,
                            Email: true,
                            Images: {
                                select: {
                                    Url: true
                                }
                            }
                        }
                    },
                    Psicologo: {
                        select: {
                            Id: true,
                            Nome: true,
                            Email: true
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
                            Id: true,
                            AgoraChannel: true,
                            Status: true,
                            ScheduledAt: true
                        }
                    }
                },
                orderBy: [
                    { Date: 'asc' },
                    { Time: 'asc' }
                ]
            });

            // Processa consultas considerando Date + Time
            // Filtra apenas as que ainda não começaram (ou seja, mostra até o horário de início)
            const consultasValidas = consultas
                .map(consulta => {
                    // Corrige: Date está em UTC, mas Time é horário local (Brasília)
                    // Usa Date apenas para pegar a data (ano, mês, dia) em Brasília
                    const dataDate = dayjs(consulta.Date).tz('America/Sao_Paulo');
                    const ano = dataDate.year();
                    const mes = dataDate.month(); // 0-based
                    const dia = dataDate.date();
                    const [hh, mm] = (consulta.Time || '00:00').split(':').map(Number);
                    // Monta a data/hora local correta
                    const dataHoraCompleta = dayjs.tz(
                        new Date(ano, mes, dia, hh, mm, 0),
                        'America/Sao_Paulo'
                    );
                    if (nowBr.isAfter(dataHoraCompleta)) {
                        return null;
                    }
                    return { consulta, dataHora: dataHoraCompleta };
                })
                .filter((item): item is { consulta: typeof consultas[0]; dataHora: dayjs.Dayjs } => item !== null)
                .sort((a, b) => a.dataHora.diff(b.dataHora));

            if (consultasValidas.length > 0) {
                console.log('[ProximaConsultaService] Próxima consulta encontrada para psicólogo:', JSON.stringify(consultasValidas[0].consulta, null, 2));
                return consultasValidas[0].consulta;
            } else {
                console.log('[ProximaConsultaService] Nenhuma próxima consulta encontrada para psicólogo.');
                return null;
            }
        } catch (error) {
            console.error('Erro ao buscar próxima consulta:', error);
            throw error;
        }
    }

    /**
     * Busca a próxima consulta agendada para um paciente
     * @param pacienteId ID do paciente
     * @returns Próxima consulta ou null
     */
    async buscarProximaConsultaPaciente(pacienteId: string) {
        try {
            const nowBr = dayjs().tz('America/Sao_Paulo');
            const inicioDoDiaAtual = nowBr.startOf('day').toDate();
            console.log(`[ProximaConsultaService] Horário usado na busca:`, nowBr.toISOString(), '| Timezone: America/Sao_Paulo');

            // Busca consultas do dia atual ou futuras
            const consultas = await prisma.consulta.findMany({
                where: {
                    PacienteId: pacienteId,
                    Status: {
                        in: [
                            $Enums.ConsultaStatus.Reservado,
                            $Enums.ConsultaStatus.EmAndamento,
                            $Enums.ConsultaStatus.PacienteNaoCompareceu,
                            $Enums.ConsultaStatus.PsicologoNaoCompareceu,
                            $Enums.ConsultaStatus.CanceladaPacienteNoPrazo,
                            $Enums.ConsultaStatus.CanceladaPacienteForaDoPrazo,
                            $Enums.ConsultaStatus.CanceladaPsicologoNoPrazo,
                            $Enums.ConsultaStatus.CanceladaPsicologoForaDoPrazo
                        ]
                    },
                    Date: {
                        gte: inicioDoDiaAtual
                    }
                },
                include: {
                    Paciente: {
                        select: {
                            Id: true,
                            Nome: true,
                            Email: true
                        }
                    },
                    Psicologo: {
                        select: {
                            Id: true,
                            Nome: true,
                            Email: true,
                            Images: {
                                select: {
                                    Url: true
                                }
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
                            Id: true,
                            AgoraChannel: true,
                            Status: true,
                            ScheduledAt: true
                        }
                    }
                },
                orderBy: [
                    { Date: 'asc' },
                    { Time: 'asc' }
                ]
            });

            // Processa consultas considerando Date + Time e timezone de Brasília
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

            if (consultasValidas.length > 0) {
                console.log('[ProximaConsultaService] Próxima consulta encontrada para paciente:', JSON.stringify(consultasValidas[0].consulta, null, 2));
                return consultasValidas[0].consulta;
            } else {
                console.log('[ProximaConsultaService] Nenhuma próxima consulta encontrada para paciente.');
                return null;
            }
        } catch (error) {
            console.error('Erro ao buscar próxima consulta do paciente:', error);
            throw error;
        }
    }

    /**
     * Notifica via WebSocket sobre atualização da próxima consulta
     * @param userId ID do usuário (psicólogo ou paciente)
     * @param consulta Dados da próxima consulta
     * @param motivo Motivo da atualização (nova_consulta, cancelamento, etc)
     */
    async notificarAtualizacaoProximaConsulta(
        userId: string,
        consulta: any,
        motivo: 'nova_consulta' | 'cancelamento' | 'atualizacao'
    ) {
        try {
            await axios.post(`${this.socketServerUrl}/emit`, {
                event: 'proximaConsultaAtualizada',
                toUserId: userId,
                data: {
                    motivo,
                    consulta,
                    timestamp: new Date().toISOString()
                },
                broadcast: false
            });
        } catch (error) {
            console.error(`Erro ao notificar usuário ${userId}:`, error);
            // Não propaga o erro para não afetar o fluxo principal
        }
    }

    /**
     * Notifica psicólogo e paciente sobre mudança na próxima consulta
     * @param psicologoId ID do psicólogo
     * @param pacienteId ID do paciente (opcional)
     * @param motivo Motivo da atualização
     */
    async notificarAmbosUsuarios(
        psicologoId: string,
        pacienteId: string | null | undefined,
        motivo: 'nova_consulta' | 'cancelamento' | 'atualizacao'
    ) {
        try {
            // Busca e notifica próxima consulta do psicólogo
            const consultaPsicologo = await this.buscarProximaConsulta(psicologoId);
            await this.notificarAtualizacaoProximaConsulta(psicologoId, consultaPsicologo, motivo);

            // Busca e notifica próxima consulta do paciente (se existir)
            if (pacienteId) {
                const consultaPaciente = await this.buscarProximaConsultaPaciente(pacienteId);
                await this.notificarAtualizacaoProximaConsulta(pacienteId, consultaPaciente, motivo);
            }
        } catch (error) {
            console.error('Erro ao notificar ambos usuários:', error);
        }
    }

    /**
     * Verifica se uma nova consulta marcada se tornou a próxima do psicólogo
     * @param psicologoId ID do psicólogo
     * @param novaConsultaId ID da consulta recém criada
     */
    async verificarENotificarNovaConsulta(psicologoId: string, novaConsultaId: string, pacienteId?: string) {
        try {
            const proximaConsulta = await this.buscarProximaConsulta(psicologoId);

            // Se a nova consulta é a próxima, notifica
            if (proximaConsulta && proximaConsulta.Id === novaConsultaId) {
                console.log(`📅 Nova consulta ${novaConsultaId} é a próxima do psicólogo ${psicologoId}`);
                await this.notificarAmbosUsuarios(psicologoId, pacienteId, 'nova_consulta');
            }
            // Se existe uma próxima consulta diferente da nova (a nova foi inserida antes), também notifica
            else if (proximaConsulta) {
                const novaConsulta = await prisma.consulta.findUnique({
                    where: { Id: novaConsultaId },
                    select: { Date: true }
                });

                if (novaConsulta && dayjs(novaConsulta.Date).isSame(proximaConsulta.Date, 'day')) {
                    console.log(`📅 Nova consulta ${novaConsultaId} pode ter alterado a ordem das próximas consultas`);
                    await this.notificarAmbosUsuarios(psicologoId, pacienteId, 'nova_consulta');
                }
            }
        } catch (error) {
            console.error('Erro ao verificar e notificar nova consulta:', error);
        }
    }

    /**
     * Notifica após cancelamento de consulta
     * @param psicologoId ID do psicólogo
     * @param pacienteId ID do paciente
     * @param consultaCanceladaId ID da consulta cancelada
     */
    async notificarAposCancelamento(psicologoId: string, pacienteId: string | null, consultaCanceladaId: string) {
        try {
            console.log(`❌ Processando notificação de cancelamento da consulta ${consultaCanceladaId}`);

            // Aguarda um momento para garantir que o banco atualizou
            await new Promise(resolve => setTimeout(resolve, 500));

            // Notifica ambos sobre a nova próxima consulta
            await this.notificarAmbosUsuarios(psicologoId, pacienteId || undefined, 'cancelamento');
        } catch (error) {
            console.error('Erro ao notificar após cancelamento:', error);
        }
    }
}
