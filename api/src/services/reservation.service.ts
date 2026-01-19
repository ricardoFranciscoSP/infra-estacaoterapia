import prisma from '../prisma/client';
import { AgendaStatus, ConsultaAvulsaStatus, ConsultaStatus, Prisma } from '../generated/prisma';
import { IReservationService } from '../interfaces/reservation.interface';
import { STATUS } from '../constants/status.constants';
import { IEmailService } from '../interfaces/email.interface';
import { supabaseAdmin } from '../services/storage.services';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrAfter);
import { AutorTipoCancelamento } from '../types/permissions.types';
import { WebSocketNotificationService } from './websocketNotification.service';
import { NotificationService } from './notification.service';
import { getWebSocketNotificationBatchService, WebSocketNotificationBatchService } from './websocketNotificationBatch.service';

// Tipos para transações do Prisma
type PrismaTransaction = Omit<Prisma.TransactionClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;
type PrismaClientOrTransaction = typeof prisma | PrismaTransaction;

// Tipos para retornos
type AgendaWithSelect = {
    Id: string;
    Data: Date;
    Status: string;
    PsicologoId: string | null;
    Horario: string;
};

type ConsultaWithRelations = Prisma.ConsultaGetPayload<{
    include: {
        Psicologo: {
            select: {
                Id: true;
                Nome: true;
                Email: true;
                Images: { select: { Url: true } };
            };
        };
        Paciente: {
            select: {
                Nome: true;
                Email: true;
            };
        };
        Agenda: {
            select: {
                Id: true;
                Data: true;
                Horario: true;
                DiaDaSemana: true;
                Status: true;
                CreatedAt: true;
                UpdatedAt: true;
                PsicologoId: true;
                PacienteId: true;
            };
        };
        ReservaSessao: {
            select: {
                Id: true;
                AgoraChannel: true;
                Status: true;
                PatientJoinedAt: true;
                PsychologistJoinedAt: true;
                ReservationId: true;
                Uid: true;
                UidPsychologist: true;
                ConsultaId: true;
                AgoraTokenPatient: true;
                AgoraTokenPsychologist: true;
                AgendaId: true;
                ScheduledAt: true;
                PatientId: true;
                PsychologistId: true;
                createdAt: true;
                updatedAt: true;
            } | null;
        };
    };
}>;

type ConsultaListWithRelations = Prisma.ConsultaGetPayload<{
    include: {
        Psicologo: {
            select: {
                Id: true;
                Nome: true;
                Email: true;
                Images: { select: { Url: true } };
            };
        };
        Paciente: {
            select: {
                Nome: true;
                Email: true;
                AssinaturaPlanos: true;
            };
        };
        Agenda: {
            select: {
                Id: true;
                Data: true;
                Horario: true;
                DiaDaSemana: true;
                Status: true;
                CreatedAt: true;
                UpdatedAt: true;
                PsicologoId: true;
                PacienteId: true;
            } | null;
        };
        ReservaSessao: {
            select: {
                Id: true;
                AgoraChannel: true;
                Status: true;
                PatientJoinedAt: true;
                PsychologistJoinedAt: true;
                ReservationId: true;
                Uid: true;
                UidPsychologist: true;
                ConsultaId: true;
                AgoraTokenPatient: true;
                AgoraTokenPsychologist: true;
                AgendaId: true;
                ScheduledAt: true;
                PatientId: true;
                PsychologistId: true;
                createdAt: true;
                updatedAt: true;
            } | null;
        };
    };
}>;

type AgendaType = Prisma.AgendaGetPayload<{}>;

type ConsultaAvulsaValidacaoType = {
    Id: string;
    PacienteId: string;
    PsicologoId?: string | null;
    Status: string;
    DataCriacao: Date | string | null;
    Quantidade: number;
    Validade?: Date | string | null;
};

export class ReservationService implements IReservationService {
    public websocketNotificationService: WebSocketNotificationService | WebSocketNotificationBatchService;
    constructor(
        private emailService: IEmailService,
        websocketNotificationService?: WebSocketNotificationService,
        private notificationService = new NotificationService(new WebSocketNotificationService())
    ) {
        // Usa serviço de batching para otimizar notificações
        if (websocketNotificationService) {
            this.websocketNotificationService = websocketNotificationService;
        } else {
            this.websocketNotificationService = getWebSocketNotificationBatchService();
        }
    }

    /**
     * Atualiza status para 'Reagendada' em Consulta, Agenda, ReservaSessao
     * E incrementa no CicloPlano ou ConsultaAvulsa conforme a origem da consulta
     * BUSCA PRIMÁRIA: pela ReservaSessao usando ConsultaId
     */
    async reagendarStatus(reservationId: string): Promise<void> {
        // BUSCA PRIMÁRIA: ReservaSessao pelo ConsultaId
        const reservaSessao = await prisma.reservaSessao.findUnique({
            where: { ConsultaId: reservationId },
            include: {
                Consulta: {
                    include: {
                        Agenda: true,
                        ReservaSessao: true,
                        CicloPlano: true, // Inclui o ciclo se a consulta foi do plano
                    }
                }
            }
        });

        if (!reservaSessao || !reservaSessao.Consulta) {
            throw new Error('ReservaSessao ou Consulta não encontrada para reagendamento.');
        }

        const consulta = reservaSessao.Consulta;

        await prisma.$transaction(async (tx: PrismaTransaction) => {
            // Atualiza status da consulta para 'Reagendada'
            await tx.consulta.update({
                where: { Id: consulta.Id },
                data: { Status: 'ReagendadaPacienteNoPrazo' }
            });

            // Atualiza status da ReservaSessao
            await tx.reservaSessao.update({
                where: { Id: reservaSessao.Id },
                data: { Status: AgendaStatus.Reagendada }
            });

            // Atualiza status da Agenda se existir
            if (consulta.Agenda) {
                await tx.agenda.update({
                    where: { Id: consulta.Agenda.Id },
                    data: { Status: AgendaStatus.Reagendada }
                });
            } else if (reservaSessao.AgendaId) {
                // Se não tem Agenda no relacionamento, tenta atualizar pelo AgendaId da ReservaSessao
                await tx.agenda.update({
                    where: { Id: reservaSessao.AgendaId },
                    data: { Status: AgendaStatus.Reagendada }
                });
            }

            // Reagendamento: NÃO devolve saldo, apenas marca como reagendada
            // O saldo já debitado será reutilizado na nova reserva (manterSaldo = true)
        });
    }

    /**
     * Valida se a nova data está dentro da validade do saldo disponível (ControleConsultaMensal ou ConsultaAvulsa)
     * Se houver cancelamento por força maior aprovado, permite reagendamento mesmo expirando e prorroga por 30 dias
     */
    async validarValidadeReagendamento(userId: string, agendaId: string, consultaIdAntiga?: string): Promise<{ valido: boolean; prorrogarExpiracao?: boolean }> {
        const agenda = await prisma.agenda.findUnique({ where: { Id: agendaId } });
        if (!agenda) {
            console.log('[VALIDAR REAGENDAMENTO] Agenda não encontrada:', agendaId);
            return { valido: false };
        }
        const user = await prisma.user.findUnique({
            where: { Id: userId },
            include: {
                ControleConsultaMensal: true,
                ConsultaAvulsaPaciente: true
            }
        });
        if (!user) {
            console.log('[VALIDAR REAGENDAMENTO] Usuário não encontrado:', userId);
            return { valido: false };
        }
        const dataConsulta = agenda.Data;
        console.log('[VALIDAR REAGENDAMENTO] Data da nova consulta:', dataConsulta);

        // Verifica se há cancelamento por força maior aprovado
        let isForcaMaiorAprovada = false;
        if (consultaIdAntiga) {
            const cancelamentoForcaMaior = await prisma.cancelamentoSessao.findFirst({
                where: {
                    SessaoId: consultaIdAntiga,
                    Status: 'Deferido',
                    Motivo: {
                        contains: 'força maior',
                        mode: 'insensitive'
                    }
                }
            });
            isForcaMaiorAprovada = !!cancelamentoForcaMaior;
        }

        // Validação ControleConsultaMensal
        const mensalValida = user.ControleConsultaMensal.some(c => {
            const validade = c.Validade ? new Date(c.Validade) : null;
            const dataNovaConsulta = new Date(dataConsulta);
            const isPlanoAtivo = c.Status === 'Ativo';
            const saldoDisponivel = c.ConsultasDisponiveis > 0;
            // Se for força maior aprovada, permite mesmo que esteja expirando
            const dentroValidade = isForcaMaiorAprovada ? true : (validade && dataNovaConsulta <= validade);
            const isValida = isPlanoAtivo && saldoDisponivel && dentroValidade;
            console.log('[VALIDAR REAGENDAMENTO] ControleConsultaMensal:', {
                Status: c.Status,
                Validade: c.Validade,
                validade,
                ConsultasDisponiveis: c.ConsultasDisponiveis,
                dataNovaConsulta,
                dentroValidade,
                isValida,
                isForcaMaiorAprovada
            });
            return isValida;
        });

        // Validação ConsultaAvulsa
        const avulsaValida = user.ConsultaAvulsaPaciente.some((ca: ConsultaAvulsaValidacaoType) => {
            const isAtiva = ca.Status === ConsultaAvulsaStatus.Ativa;
            const temQuantidade = ca.Quantidade > 0;
            // Se for força maior aprovada, permite mesmo que esteja expirando
            const dentroValidade = isForcaMaiorAprovada ? true : (ca.Validade && (typeof ca.Validade === 'string' || ca.Validade instanceof Date));
            return isAtiva && temQuantidade && dentroValidade;
        });

        console.log('[VALIDAR REAGENDAMENTO] mensalValida:', mensalValida, 'avulsaValida:', avulsaValida, 'isForcaMaiorAprovada:', isForcaMaiorAprovada);
        return {
            valido: mensalValida || avulsaValida,
            prorrogarExpiracao: isForcaMaiorAprovada
        };
    }

    async reservarHorario(scheduleId: string, userId: string): Promise<{ reservation: ConsultaWithRelations | null; updatedAgenda: AgendaType | null; message?: string }> {
        // Log para capturar o valor do horário recebido do frontend
        console.log(`[RESERVA] Requisição de reserva recebida. scheduleId: ${scheduleId}, userId: ${userId}`);
        const agendaDebug = await prisma.agenda.findUnique({ where: { Id: scheduleId } });
        if (agendaDebug) {
            console.log(`[RESERVA] Dados da agenda recebida: Data=${agendaDebug.Data}, Horario=${agendaDebug.Horario}, Status=${agendaDebug.Status}`);
        } else {
            console.warn(`[RESERVA] Agenda não encontrada para o scheduleId: ${scheduleId}`);
        }

        const scheduleCheck = await this.checkScheduleAvailability(scheduleId, userId);
        if (!scheduleCheck.available) {
            console.log(`[RESERVA] Horário indisponível para reserva. Motivo: ${scheduleCheck.message}`);
            return { reservation: null, updatedAgenda: null, message: scheduleCheck.message };
        }

        console.log('[RESERVA] Schedule disponível, prosseguindo para criar reserva.');

        return this.createReservation(scheduleId, userId);
    }

    /**
     * Reserva horário com opção de manter saldo (para reagendamento)
     */
    async reservarHorarioComSaldo(
        scheduleId: string,
        userId: string,
        manterSaldo: boolean = false,
        reservaAntigaId?: string
    ): Promise<{ reservation: ConsultaWithRelations; updatedAgenda: AgendaType }> {
        console.log(`[RESERVA] Requisição de reserva com manterSaldo=${manterSaldo}. scheduleId: ${scheduleId}, userId: ${userId}`);

        const scheduleCheck = await this.checkScheduleAvailability(scheduleId, userId);
        if (!scheduleCheck.available) {
            throw new Error(scheduleCheck.message || 'Horário indisponível para reserva.');
        }

        console.log('[RESERVA] Schedule disponível, prosseguindo para criar reserva.');

        return this.createReservation(scheduleId, { userId, manterSaldo, reservaAntigaId });
    }


    async consultarAgenda(psicologoId: string): Promise<AgendaType[]> {
        return prisma.agenda.findMany({
            where: {
                PsicologoId: psicologoId,
                Status: AgendaStatus.Disponivel,
            },
            orderBy: [
                { Data: 'asc' },
                { Horario: 'asc' },
            ],
        });
    }

    async checkScheduleAvailability(scheduleId: string, userId: string): Promise<{ available: boolean; message?: string; agenda?: AgendaWithSelect }> {
        const agenda = await prisma.agenda.findUnique({
            where: { Id: scheduleId },
            select: { Id: true, Data: true, Status: true, PsicologoId: true, Horario: true },
        });

        if (!agenda) {
            console.warn(`[RESERVA] Agenda não encontrada. scheduleId: ${scheduleId}`);
            return { available: false, message: 'Horário não encontrado.' };
        }

        console.log(`[RESERVA] Verificando disponibilidade. Status: ${agenda.Status}, Esperado: ${AgendaStatus.Disponivel}`);

        // Verifica o status da agenda
        if (agenda.Status !== AgendaStatus.Disponivel) {
            console.warn(`[RESERVA] Status não é Disponivel. Status atual: ${agenda.Status}`);
            return { available: false, message: 'Horário não disponível para reserva.' };
        }

        // Garante que a data da agenda está no fuso de Brasília
        const agendaDateBr = dayjs(agenda.Data).tz('America/Sao_Paulo');
        const nowBr = dayjs().tz('America/Sao_Paulo');
        if (agendaDateBr.isBefore(nowBr, 'day')) {
            console.log(`[RESERVA] Data da agenda (Brasília): ${agendaDateBr.format()} | Data atual (Brasília): ${nowBr.format()}`);
            return { available: false, message: 'Não é possível reservar datas retroativas.' };
        }

        // Validação: impede sobreposição de consultas para o mesmo paciente no período da sessão
        const config = await prisma.configuracao.findFirst({ select: { duracaoConsultaMin: true } });
        const consultaDurationMin = config?.duracaoConsultaMin || 50;

        const horarioStr = String(agenda.Horario).padStart(5, '0');
        const agendaDateStr = dayjs(agenda.Data).format('YYYY-MM-DD');
        const novaConsultaInicio = dayjs.tz(`${agendaDateStr} ${horarioStr}`, 'YYYY-MM-DD HH:mm', 'America/Sao_Paulo');
        const novaConsultaFim = novaConsultaInicio.add(consultaDurationMin, 'minute');

        const activeStatuses: ConsultaStatus[] = [
            ConsultaStatus.Reservado,
            ConsultaStatus.Agendada,
            ConsultaStatus.EmAndamento,
        ];

        const consultasNoDia = await prisma.consulta.findMany({
            where: {
                PacienteId: userId,
                Status: { in: activeStatuses },
                Date: {
                    gte: novaConsultaInicio.startOf('day').toDate(),
                    lte: novaConsultaInicio.endOf('day').toDate(),
                },
            },
            select: {
                Date: true,
                Time: true,
                Psicologo: { select: { Nome: true } },
            },
        });

        // Verifica conflitos considerando apenas o horário de INÍCIO da nova consulta
        // Regra: não permitir iniciar dentro de uma janela de 50 minutos antes ou depois do início de uma consulta existente
        const conflito = consultasNoDia.find((consulta) => {
            const existingTime = String(consulta.Time || '00:00').padStart(5, '0');
            const existingDateStr = dayjs(consulta.Date).format('YYYY-MM-DD');
            const inicioConsultaExistente = dayjs.tz(`${existingDateStr} ${existingTime}`, 'YYYY-MM-DD HH:mm', 'America/Sao_Paulo');

            // Janela de conflito: 50 minutos antes do início até 50 minutos depois do início da consulta existente
            const inicioJanelaConflito = inicioConsultaExistente.subtract(50, 'minute');
            const fimJanelaConflito = inicioConsultaExistente.add(50, 'minute');

            // Conflito se o INÍCIO da nova consulta cair dentro desta janela
            const inicioDentro = novaConsultaInicio.isSameOrAfter(inicioJanelaConflito) && novaConsultaInicio.isBefore(fimJanelaConflito);
            return inicioDentro;
        });

        if (conflito) {
            const psicologoNome = conflito.Psicologo?.Nome || 'outro psicólogo';
            const dataFormatada = dayjs(conflito.Date).format('DD/MM/YYYY');
            const horarioConflito = String(conflito.Time || '').padStart(5, '0');
            return {
                available: false,
                message: `Você já possui uma consulta agendada no dia ${dataFormatada} às ${horarioConflito} com ${psicologoNome}. Não é possível marcar uma consulta dentro do período de 50 minutos antes ou depois de uma consulta já agendada.`
            };
        }

        return { available: true, agenda };
    }

    async createReservation(scheduleId: string, userId: string | { userId: string; manterSaldo?: boolean; reservaAntigaId?: string }): Promise<{ reservation: ConsultaWithRelations; updatedAgenda: AgendaType }> {
        let manterSaldo = false;
        let reservaAntigaId: string | undefined = undefined;
        let realUserId: string;
        if (typeof userId === 'object' && userId !== null && 'userId' in userId) {
            realUserId = userId.userId;
        } else {
            realUserId = userId as string;
        }
        if (typeof userId === 'object' && userId !== null) {
            manterSaldo = userId.manterSaldo ?? false;
            reservaAntigaId = userId.reservaAntigaId;
        }
        if (!manterSaldo) {
            const podeReservar = await this.pacientePodeReservar(realUserId);
            if (!podeReservar) {
                throw new Error('Paciente não possui saldo de consultas disponível.');
            }
        }
        const result = await prisma.$transaction(async (tx: PrismaTransaction) => {
            // 🎯 GARANTE que PacienteId seja preenchido e Status mude para Reservado na tabela Agenda
            const updatedAgenda = await tx.agenda.update({
                where: { Id: scheduleId },
                data: {
                    Status: AgendaStatus.Reservado,
                    PacienteId: realUserId, // Garante que PacienteId seja sempre preenchido
                },
            });
            
            // Validação adicional: verifica se o update foi bem-sucedido
            if (!updatedAgenda || !updatedAgenda.PacienteId || updatedAgenda.Status !== AgendaStatus.Reservado) {
                throw new Error('Falha ao atualizar Agenda: PacienteId ou Status não foram atualizados corretamente');
            }

            // Se manterSaldo = true e há reservaAntigaId, busca o CicloPlanoId da reserva antiga para transferir
            let cicloPlanoIdParaTransferir: string | null = null;
            if (manterSaldo && reservaAntigaId) {
                const reservaAntiga = await tx.consulta.findUnique({
                    where: { Id: reservaAntigaId },
                    select: { CicloPlanoId: true },
                });
                if (reservaAntiga?.CicloPlanoId) {
                    cicloPlanoIdParaTransferir = reservaAntiga.CicloPlanoId;
                }
            }

            // Cria a reserva primeiro (CicloPlanoId será atualizado na lógica de saldo abaixo ou transferido da reserva antiga)
            const reservation = await tx.consulta.create({
                data: {
                    Date: updatedAgenda.Data,
                    Time: updatedAgenda.Horario,
                    Status: AgendaStatus.Reservado,
                    PacienteId: realUserId,
                    PsicologoId: updatedAgenda.PsicologoId,
                    AgendaId: updatedAgenda.Id,
                    CicloPlanoId: cicloPlanoIdParaTransferir, // Transfere da reserva antiga se manterSaldo = true
                },
                include: {
                    Psicologo: true,
                },
            });

            // Corrige Data para remover hora e junta com Time
            let scheduledAtStr = null;
            let uidValue = null;
            let uidPsychValue = null;
            try {
                // Monta a string no formato 'YYYY-MM-DD HH:mm:ss'
                const dataStr = dayjs(updatedAgenda.Data).format('YYYY-MM-DD');
                const horarioStr = String(updatedAgenda.Horario).padStart(5, '0');
                scheduledAtStr = `${dataStr} ${horarioStr}:00`;
                // Usa função utilitária para derivar Uid
                const { deriveUidFromUuid } = require('../utils/uid.util');
                uidValue = deriveUidFromUuid(realUserId);
                if (updatedAgenda.PsicologoId) {
                    uidPsychValue = deriveUidFromUuid(updatedAgenda.PsicologoId);
                }
            } catch (err) {
                console.error(`[ReservationService] Erro ao montar ScheduledAt ou Uid: Data=${updatedAgenda.Data}, Horario=${updatedAgenda.Horario}, userId=${userId}`, err);
            }
            console.debug(`[ReservationService] Criando ReservaSessao: ConsultaId=${reservation.Id}, ScheduledAt=${scheduledAtStr}, Uid=${uidValue}`);
            const reservaSessaoCriada = await tx.reservaSessao.create({
                data: {
                    ConsultaId: reservation.Id,
                    ReservationId: reservation.Id,
                    Status: AgendaStatus.Reservado,
                    PatientId: realUserId,
                    PsychologistId: updatedAgenda.PsicologoId,
                    ScheduledAt: scheduledAtStr,
                    AgoraChannel: `sala_${reservation.Id}`,
                    Uid: uidValue,
                    UidPsychologist: uidPsychValue ?? undefined,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    // Os campos abaixo ficam para preenchimento posterior
                    AgoraTokenPatient: undefined,
                    AgoraTokenPsychologist: undefined,
                    PatientJoinedAt: undefined,
                    PsychologistJoinedAt: undefined,
                    AgendaId: updatedAgenda.Id,
                },
            });

            // ✅ Agenda a geração de tokens EXATAMENTE no horário do ScheduledAt
            // Isso garante que os tokens sejam criados no início exato da reserva
            // O agendamento será feito após a transação ser commitada
            console.log(`[ReservationService] ReservaSessao criada. Tokens serão agendados para o horário exato: ${scheduledAtStr}`);

            // OTIMIZAÇÃO: Preenche o valor da consulta após criar (pode ser feito em background se necessário)
            // Mantém na transação para garantir consistência, mas pode ser otimizado futuramente
            await this.atribuirValorConsulta(realUserId, reservation.Id, tx);

            // Fluxo de saldo: PRIORIZA CreditoAvulso/ConsultaAvulsa primeiro, depois CicloPlano
            if (!manterSaldo) {
                console.log('[RESERVA][DÉBITO] Iniciando processo de débito de consulta para userId:', realUserId);
                const agora = new Date();
                let cicloPlanoIdUsado: string | null = null;
                let consultaAvulsaIdUsado: string | null = null;
                let creditoAvulsoIdUsado: string | null = null;

                // 1. PRIORIDADE: Tenta CreditoAvulso válido primeiro (com ValidUntil)
                const creditoAvulso = await tx.creditoAvulso.findFirst({
                    where: {
                        UserId: realUserId,
                        Status: ConsultaAvulsaStatus.Ativa,
                        Quantidade: { gt: 0 },
                        ValidUntil: { gt: agora }, // ValidUntil > data atual
                    },
                    orderBy: { ValidUntil: 'asc' }, // Prioriza o que vence primeiro
                });

                if (creditoAvulso) {
                    console.log('[RESERVA][DÉBITO] Encontrado CreditoAvulso:', creditoAvulso.Id, 'Quantidade atual:', creditoAvulso.Quantidade);
                    const novaQuantidade = creditoAvulso.Quantidade - 1;

                    await tx.creditoAvulso.update({
                        where: { Id: creditoAvulso.Id },
                        data: {
                            Quantidade: novaQuantidade,
                            // Se Quantidade ficar <= 0, muda Status para "Concluida"
                            Status: novaQuantidade <= 0 ? ConsultaAvulsaStatus.Concluida : creditoAvulso.Status,
                        },
                    });

                    console.log('[RESERVA][DÉBITO] CreditoAvulso atualizado. Nova quantidade:', novaQuantidade);
                    creditoAvulsoIdUsado = creditoAvulso.Id;
                } else {
                    console.log('[RESERVA][DÉBITO] Nenhum CreditoAvulso encontrado');
                }

                // 2. Se não encontrou CreditoAvulso, tenta ConsultaAvulsa (com DataCriacao)
                if (!creditoAvulsoIdUsado) {
                    const dataLimite = new Date(agora);
                    dataLimite.setDate(dataLimite.getDate() - 30);

                    const consultaAvulsa = await tx.consultaAvulsa.findFirst({
                        where: {
                            PacienteId: realUserId,
                            Status: ConsultaAvulsaStatus.Ativa,
                            Quantidade: { gte: 1 },
                            DataCriacao: { gte: dataLimite }, // Criada há no máximo 30 dias
                        },
                        orderBy: { DataCriacao: 'desc' },
                    });

                    if (consultaAvulsa) {
                        console.log('[RESERVA][DÉBITO] Encontrado ConsultaAvulsa:', consultaAvulsa.Id, 'Quantidade atual:', consultaAvulsa.Quantidade);
                        const novaQuantidade = consultaAvulsa.Quantidade - 1;

                        await tx.consultaAvulsa.update({
                            where: { Id: consultaAvulsa.Id },
                            data: {
                                Quantidade: novaQuantidade,
                                // Se Quantidade ficar < 1, muda Status para "Concluida"
                                Status: novaQuantidade < 1 ? ConsultaAvulsaStatus.Concluida : consultaAvulsa.Status,
                            },
                        });

                        console.log('[RESERVA][DÉBITO] ConsultaAvulsa atualizada. Nova quantidade:', novaQuantidade);
                        consultaAvulsaIdUsado = consultaAvulsa.Id;
                    } else {
                        console.log('[RESERVA][DÉBITO] Nenhuma ConsultaAvulsa encontrada');
                    }
                }

                // 3. Se não encontrou consulta avulsa, tenta CicloPlano válido
                if (!creditoAvulsoIdUsado && !consultaAvulsaIdUsado) {
                    // Busca todos ciclos ativos e válidos
                    const ciclosValidos = await tx.cicloPlano.findMany({
                        where: {
                            UserId: realUserId,
                            Status: 'Ativo',
                            ConsultasDisponiveis: { gt: 0 },
                        },
                        orderBy: { CreatedAt: 'asc' },
                    });
                    const cicloParaDebitar = ciclosValidos.find(ciclo => {
                        const dataCriacao = new Date(ciclo.CreatedAt);
                        const dataValidade = new Date(dataCriacao);
                        dataValidade.setDate(dataValidade.getDate() + 30);
                        return dataValidade >= agora;
                    });
                    console.log('[RESERVA][CICLOPLANO] Ciclo para debitar:', cicloParaDebitar);
                    if (cicloParaDebitar) {
                        const novasConsultasDisponiveis = cicloParaDebitar.ConsultasDisponiveis > 0 ? cicloParaDebitar.ConsultasDisponiveis - 1 : 0;
                        const novasConsultasUsadas = (cicloParaDebitar.ConsultasUsadas || 0) + 1;
                        console.log('[RESERVA][CICLOPLANO] Atualizando ciclo:', {
                            cicloId: cicloParaDebitar.Id,
                            novasConsultasDisponiveis,
                            novasConsultasUsadas
                        });

                        await tx.cicloPlano.update({
                            where: { Id: cicloParaDebitar.Id },
                            data: {
                                ConsultasDisponiveis: novasConsultasDisponiveis,
                                ConsultasUsadas: novasConsultasUsadas,
                                Status: novasConsultasDisponiveis === 0 ? 'Completo' : cicloParaDebitar.Status,
                            },
                        });

                        await tx.controleConsultaMensal.updateMany({
                            where: { CicloPlanoId: cicloParaDebitar.Id },
                            data: {
                                ConsultasDisponiveis: novasConsultasDisponiveis,
                                Used: novasConsultasUsadas,
                                Available: novasConsultasDisponiveis,
                            },
                        });

                        cicloPlanoIdUsado = cicloParaDebitar.Id;
                        await tx.consulta.update({
                            where: { Id: reservation.Id },
                            data: { CicloPlanoId: cicloParaDebitar.Id },
                        });
                    } else {
                        console.log('[RESERVA][CICLOPLANO] Nenhum ciclo válido encontrado para débito.');
                    }
                }

                // Se não encontrou nenhum saldo disponível, lança erro
                if (!cicloPlanoIdUsado && !consultaAvulsaIdUsado && !creditoAvulsoIdUsado) {
                    console.error('[RESERVA][DÉBITO] ERRO: Nenhum saldo disponível encontrado para débito');
                    throw new Error('Paciente não possui saldo de consultas disponível (crédito avulso, consulta avulsa ou ciclo).');
                } else {
                    console.log('[RESERVA][DÉBITO] Débito realizado com sucesso:', {
                        cicloPlanoIdUsado,
                        consultaAvulsaIdUsado,
                        creditoAvulsoIdUsado
                    });
                }
            } else {
                console.log('[RESERVA][DÉBITO] manterSaldo=true, pulando débito de consulta');
            }
            return { reservation, updatedAgenda };
        });

        // ✅ Agenda a geração de tokens EXATAMENTE no horário do ScheduledAt
        // Faz isso APÓS a transação ser commitada para garantir que o ScheduledAt está salvo
        // Busca a ReservaSessao criada para obter o ScheduledAt
        const reservaSessaoCriada = await prisma.reservaSessao.findUnique({
            where: { ConsultaId: result.reservation.Id },
            select: { ScheduledAt: true }
        });

        if (reservaSessaoCriada?.ScheduledAt) {
            try {
                // ✅ Agenda delayed jobs de cancelamento e finalização
                const { scheduleConsultationJobs } = await import('../utils/scheduleDelayedJobs');
                await scheduleConsultationJobs(result.reservation.Id, reservaSessaoCriada.ScheduledAt);
                console.log(`✅ [ReservationService] Delayed jobs agendados para consulta ${result.reservation.Id} no horário: ${reservaSessaoCriada.ScheduledAt}`);
                
                // Agenda geração de tokens (mantém compatibilidade)
                const { scheduleAgoraTokenGeneration } = await import('../utils/scheduleAgoraToken');
                const agendado = await scheduleAgoraTokenGeneration(result.reservation.Id, reservaSessaoCriada.ScheduledAt);
                if (agendado) {
                    console.log(`✅ [ReservationService] Tokens Agora agendados com sucesso para consulta ${result.reservation.Id} no horário EXATO do ScheduledAt: ${reservaSessaoCriada.ScheduledAt}`);
                } else {
                    console.warn(`⚠️ [ReservationService] Falha ao agendar tokens Agora para consulta ${result.reservation.Id}. O job de verificação periódica tentará novamente.`);
                }

                // ✅ Agenda verificação de presença no início e 10 minutos após
                const { agendarVerificacaoPresenca } = await import('../jobs/verificarPresencaConsulta');
                const presencaAgendada = await agendarVerificacaoPresenca(result.reservation.Id, reservaSessaoCriada.ScheduledAt);
                if (presencaAgendada) {
                    console.log(`✅ [ReservationService] Verificação de presença agendada para consulta ${result.reservation.Id}`);
                } else {
                    console.warn(`⚠️ [ReservationService] Falha ao agendar verificação de presença para consulta ${result.reservation.Id}`);
                }
            } catch (tokenError) {
                console.error(`❌ [ReservationService] Erro ao agendar tokens Agora ou verificação de presença para consulta ${result.reservation.Id}:`, tokenError);
                // Não falha a criação da reserva se o agendamento falhar
                // O job de verificação periódica (jobVerificarTokensAgendados) tentará novamente
            }
        } else {
            console.warn(`⚠️ [ReservationService] ReservaSessao não encontrada ou sem ScheduledAt para consulta ${result.reservation.Id}`);
        }

        // Buscar a reserva completa com todas as relações necessárias
        const fullReservation = await prisma.consulta.findUnique({
            where: { Id: result.reservation.Id },
            include: {
                Psicologo: {
                    select: {
                        Id: true,
                        Nome: true,
                        Email: true,
                        Images: { select: { Url: true } },
                    },
                },
                Paciente: {
                    select: {
                        Nome: true,
                        Email: true,
                    },
                },
                Agenda: {
                    select: {
                        Id: true,
                        Data: true,
                        Horario: true,
                        DiaDaSemana: true,
                        Status: true,
                        CreatedAt: true,
                        UpdatedAt: true,
                        PsicologoId: true,
                        PacienteId: true,
                    },
                },
                ReservaSessao: {
                    select: {
                        Id: true,
                        AgoraChannel: true,
                        Status: true,
                        PatientJoinedAt: true,
                        PsychologistJoinedAt: true,
                        ReservationId: true,
                        Uid: true,
                        UidPsychologist: true,
                        ConsultaId: true,
                        AgoraTokenPatient: true,
                        AgoraTokenPsychologist: true,
                        AgendaId: true,
                        ScheduledAt: true,
                        PatientId: true,
                        PsychologistId: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                },
            },
        });

        if (!fullReservation) {
            throw new Error('Erro ao buscar reserva completa');
        }

        // Notificação via WebSocket e banco de dados para Paciente e Psicólogo
        const dataFormatada = dayjs(fullReservation.Date).format('DD/MM/YYYY');
        const horaFormatada = fullReservation.Time;

        // Envio de emails de confirmação para paciente e psicólogo
        try {
            if (fullReservation.Paciente?.Email && fullReservation.Paciente?.Nome) {
                await this.emailService.send({
                    to: fullReservation.Paciente.Email,
                    subject: 'Confirmação de Consulta',
                    htmlTemplate: 'confirmAppointment',
                    templateData: {
                        pacienteNome: fullReservation.Paciente.Nome,
                        psicologoNome: fullReservation.Psicologo?.Nome || 'Psicólogo não identificado',
                        data: dataFormatada,
                        horario: horaFormatada,
                    },
                });
            }

            if (fullReservation.Psicologo?.Email && fullReservation.Psicologo?.Nome) {
                const primeiroNome = fullReservation.Psicologo.Nome.split(' ')[0];
                const dashboardUrl = process.env.FRONTEND_URL
                    ? `${process.env.FRONTEND_URL}/painel-psicologo`
                    : 'https://pre.estacaoterapia.com.br/painel-psicologo';

                await this.emailService.send({
                    to: fullReservation.Psicologo.Email,
                    subject: 'Parabéns! Um cliente agendou consulta com você na ESTAÇÃO TERAPIA 💜 - Fique atento e confira já os detalhes do seu atendimento!',
                    htmlTemplate: 'confirmAppointmentPsicologo',
                    templateData: {
                        nome: fullReservation.Psicologo.Nome,
                        primeiro_nome: primeiroNome,
                        nome_paciente: fullReservation.Paciente?.Nome || 'Paciente não identificado',
                        email_paciente: fullReservation.Paciente?.Email || '',
                        data_sessao: dataFormatada,
                        horario_sessao: horaFormatada,
                        dashboardUrl,
                    },
                });
            }
        } catch (emailError) {
            console.error('[ReservationService] Erro ao enviar emails de confirmação:', emailError);
            // Não falha a criação da reserva se o email falhar
        }

        if (fullReservation.PacienteId) {
            // Emite evento WebSocket para atualização em tempo real
            await this.websocketNotificationService.emitToUser(
                fullReservation.PacienteId,
                'consulta_reservada',
                `Sua consulta foi reservada para ${dataFormatada} às ${horaFormatada}.`
            );

            // Cria notificação persistente no banco de dados
            const notificationPaciente = await prisma.notification.create({
                data: {
                    Title: 'Consulta Reservada',
                    Message: `Sua consulta foi reservada para ${dataFormatada} às ${horaFormatada}.`,
                    Type: 'consulta_reservada',
                    IsForAllUsers: false,
                },
            });

            const statusPaciente = await prisma.notificationStatus.create({
                data: {
                    UserId: fullReservation.PacienteId,
                    NotificationId: notificationPaciente.Id,
                    Status: 'NaoLida',
                },
            });

            // Emite notificação no formato esperado pelo frontend
            await this.websocketNotificationService.emitToUser(
                fullReservation.PacienteId,
                'notification',
                {
                    Id: notificationPaciente.Id,
                    Title: notificationPaciente.Title,
                    Message: notificationPaciente.Message,
                    CreatedAt: statusPaciente.CreatedAt,
                    IsForAllUsers: false,
                }
            );

            // Emite evento específico para atualização de plano quando consulta é debitada
            await this.websocketNotificationService.emitToUser(
                fullReservation.PacienteId,
                'plano:atualizado',
                { motivo: 'consulta_debitada', consultaId: fullReservation.Id }
            );

            // Emite evento de ciclo atualizado para atualizar consultas restantes em tempo real
            await this.websocketNotificationService.emitToUser(
                fullReservation.PacienteId,
                'ciclo:atualizado',
                { motivo: 'consulta_debitada', consultaId: fullReservation.Id }
            );

            // Emite evento de consulta atualizada para atualizar cards
            await this.websocketNotificationService.emitToUser(
                fullReservation.PacienteId,
                'consulta:atualizada',
                { consultaId: fullReservation.Id, action: 'reservada' }
            );
        }

        if (fullReservation.PsicologoId) {
            // Emite evento WebSocket para atualização em tempo real
            await this.websocketNotificationService.emitToUser(
                fullReservation.PsicologoId,
                'consulta_reservada',
                `Uma nova consulta foi reservada para ${dataFormatada} às ${horaFormatada}.`
            );

            // Busca nome do paciente para a notificação do psicólogo
            const nomePaciente = fullReservation.Paciente?.Nome || 'um paciente';

            // Cria notificação persistente no banco de dados
            const notificationPsicologo = await prisma.notification.create({
                data: {
                    Title: 'Nova Consulta Reservada',
                    Message: `${nomePaciente} reservou uma consulta para ${dataFormatada} às ${horaFormatada}.`,
                    Type: 'consulta_reservada',
                    IsForAllUsers: false,
                },
            });

            const statusPsicologo = await prisma.notificationStatus.create({
                data: {
                    UserId: fullReservation.PsicologoId,
                    NotificationId: notificationPsicologo.Id,
                    Status: 'NaoLida',
                },
            });

            // Emite notificação no formato esperado pelo frontend
            await this.websocketNotificationService.emitToUser(
                fullReservation.PsicologoId,
                'notification',
                {
                    Id: notificationPsicologo.Id,
                    Title: notificationPsicologo.Title,
                    Message: notificationPsicologo.Message,
                    CreatedAt: statusPsicologo.CreatedAt,
                    IsForAllUsers: false,
                }
            );
        }

        // Agendar notificação para o paciente 1 hora antes da consulta
        // Monta o Date absoluto no fuso de Brasília para agendar jobs com precisão
        const dateStr = dayjs(fullReservation.Date).format('YYYY-MM-DD');
        const consultaDateTimeBr = dayjs.tz(`${dateStr} ${fullReservation.Time}:00`, 'YYYY-MM-DD HH:mm:ss', 'America/Sao_Paulo');
        const notificationTime = consultaDateTimeBr.subtract(1, 'hour').toDate();

        if (fullReservation.PacienteId) {
            await this.notificationService.scheduleNotification({
                userId: fullReservation.PacienteId,
                title: 'Lembrete de consulta',
                message: `Sua consulta está agendada para ${dayjs(fullReservation.Date).format('DD/MM/YYYY')} às ${fullReservation.Time}.`,
                scheduledAt: notificationTime,
                type: 'consulta_lembrete',
                referenceId: fullReservation.Id
            });
        }

        // ✅ Agenda jobs de delayed jobs (cancelamento e finalização) quando consulta é criada
        // 🎯 REGRA: Usa ScheduledAt da ReservaSessao quando disponível (formato: 2026-01-05 15:00:00)
        // Fallback para Date + Time da Consulta apenas se ScheduledAt não existir
        const { scheduleConsultationJobs } = await import('../utils/scheduleDelayedJobs');
        const reservaSessaoForJobs = fullReservation.ReservaSessao;
        let scheduledAtForJobs: Date | string;
        
        if (reservaSessaoForJobs?.ScheduledAt) {
            // ScheduledAt é string no formato 'YYYY-MM-DD HH:mm:ss'
            scheduledAtForJobs = reservaSessaoForJobs.ScheduledAt;
            console.log(`✅ [ReservationService] Usando ScheduledAt da ReservaSessao para agendar delayed jobs: ${reservaSessaoForJobs.ScheduledAt}`);
        } else {
            scheduledAtForJobs = consultaDateTimeBr.toDate();
            console.log(`ℹ️ [ReservationService] ScheduledAt não encontrado, usando Date + Time da Consulta para agendar delayed jobs`);
        }
        
        await scheduleConsultationJobs(fullReservation.Id, scheduledAtForJobs);
        
        // ✅ Mantém agendamento de jobs de consulta existente (tokens, notificações, etc)
        // Isso é necessário para manter compatibilidade com o sistema atual
        const { scheduleConsultationJobs: scheduleOldConsultationJobs } = require('../jobs/consultationJobs');
        const scheduledAtForOldJobs = typeof scheduledAtForJobs === 'string'
            ? dayjs.tz(scheduledAtForJobs, 'YYYY-MM-DD HH:mm:ss', 'America/Sao_Paulo').toDate()
            : scheduledAtForJobs;
        await scheduleOldConsultationJobs(fullReservation.Id, scheduledAtForOldJobs);

        // Agenda geração de tokens Agora no horário exato do ScheduledAt
        const reservaSessao = fullReservation.ReservaSessao;
        if (reservaSessao?.ScheduledAt) {
            const { scheduleAgoraTokenGeneration } = await import('../utils/scheduleAgoraToken');
            await scheduleAgoraTokenGeneration(fullReservation.Id, reservaSessao.ScheduledAt);
        }

        // Envia emails de confirmação para paciente e psicólogo
        try {
            const dataFormatada = dayjs(fullReservation.Date).format('DD/MM/YYYY');
            const horarioFormatado = String(fullReservation.Time).padStart(5, '0');

            if (fullReservation.Paciente?.Email && fullReservation.Paciente?.Nome) {
                await this.emailService.sendAppointmentConfirmationEmailPaciente(
                    fullReservation.Paciente.Email,
                    fullReservation.Paciente.Nome,
                    fullReservation.Psicologo?.Nome || 'Psicólogo',
                    dataFormatada,
                    horarioFormatado
                );
            }

            if (fullReservation.Psicologo?.Email && fullReservation.Psicologo?.Nome) {
                await this.emailService.sendAppointmentConfirmationEmailPsicologo(
                    fullReservation.Psicologo.Email,
                    fullReservation.Psicologo.Nome,
                    fullReservation.Paciente?.Nome || 'Paciente',
                    fullReservation.Paciente?.Email || '',
                    dataFormatada,
                    horarioFormatado
                );
            }
        } catch (emailError) {
            console.error('[ReservationService] Erro ao enviar emails de confirmação:', emailError);
            // Não interrompe o fluxo se o email falhar
        }

        return { reservation: fullReservation, updatedAgenda: result.updatedAgenda };
    }

    async updateAvailableConsultations(userId: string): Promise<boolean> {
        return await prisma.$transaction(async (tx: PrismaTransaction) => {
            // Busca qualquer plano do usuário (incluindo cancelados) que tenha ciclos válidos
            // A validação agora é feita pelos ciclos, não pelo status do plano
            const mainPlan = await tx.assinaturaPlano.findFirst({
                where: { UserId: userId },
                include: {
                    ControleConsultaMensal: true,
                    Ciclos: {
                        where: {
                            Status: 'Ativo',
                            ConsultasDisponiveis: { gt: 0 }
                        },
                        orderBy: { CreatedAt: 'desc' }
                    }
                },
            });

            // Verifica se há ciclo válido (mesmo que o plano esteja cancelado)
            if (!mainPlan) {
                console.log('Nenhum plano encontrado para o usuário');
                return false;
            }

            // Verifica se há ciclo ativo e válido (CreatedAt + 30 dias)
            const agora = new Date();
            const cicloValido = mainPlan.Ciclos?.find(ciclo => {
                const dataCriacao = new Date(ciclo.CreatedAt);
                const dataValidade = new Date(dataCriacao);
                dataValidade.setDate(dataValidade.getDate() + 30);
                return dataValidade >= agora;
            });

            if (!cicloValido) {
                console.log('Nenhum ciclo válido encontrado (mesmo que o plano esteja cancelado, ciclos válidos permitem consultas)');
                return false;
            }

            // Validação ControleConsultaMensal: status Ativo e Validade >= agora (Brasília)
            const nowBr = dayjs().tz('America/Sao_Paulo').toDate();
            const validControle = mainPlan.ControleConsultaMensal.find(
                (c: { Status: string; Validade: Date | null }) => c.Status === 'Ativa' && c.Validade && new Date(c.Validade) >= nowBr
            );

            if (!validControle) {
                console.log('ControleConsultaMensal não está válido');
                return false;
            }

            const currentMonth = new Date().getMonth() + 1;

            if (
                validControle.MesReferencia === currentMonth &&
                validControle.ConsultasDisponiveis !== null &&
                validControle.ConsultasDisponiveis > 0
            ) {
                await tx.controleConsultaMensal.update({
                    where: { Id: validControle.Id },
                    data: { ConsultasDisponiveis: validControle.ConsultasDisponiveis - 1 },
                });
                return true;
            }
            return false;
        });
    }

    async cancelReservation(reservationId: string, userId: string, motivo?: string, file?: Express.Multer.File, userRole?: string): Promise<{ protocolo: string; documentoUrl?: string }> {
        // BUSCA PRIMÁRIA: ReservaSessao pelo ConsultaId
        const reservaSessao = await prisma.reservaSessao.findUnique({
            where: { ConsultaId: reservationId },
            include: {
                Consulta: {
                    include: {
                        Psicologo: true,
                        Paciente: true,
                        ReservaSessao: true,
                        Agenda: true
                    }
                }
            }
        });

        if (!reservaSessao || !reservaSessao.Consulta) {
            throw new Error('ReservaSessao ou Consulta não encontrada.');
        }

        const reservation = reservaSessao.Consulta;

        const diffHours = dayjs(reservation.Date).diff(dayjs(), 'hour');
        if (diffHours < 24) {
            throw new Error('Cancelamentos só são permitidos com no mínimo 24 horas de antecedência.');
        }

        const protocolo = uuidv4();
        let linkDock: string | null = null;

        if (file) {
            const allowedTypes = [
                "application/pdf",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "image/jpeg",
                "image/png"
            ];

            if (!allowedTypes.includes(file.mimetype)) {
                throw new Error("Tipo de arquivo não permitido. Envie PDF, DOCX, JPG ou PNG.");
            }

            const bucketName = "devupload";
            const filePath = `cancelamentos/${protocolo}_${Date.now()}_${file.originalname}`;
            // Sempre usar supabaseAdmin para uploads em buckets privados
            if (!supabaseAdmin) {
                throw new Error(
                    "SUPABASE_SERVICE_ROLE_KEY não definido. " +
                    "Uploads para buckets privados requerem service role key para evitar erros de verificação de assinatura."
                );
            }
            const uploadResult = await supabaseAdmin.storage
                .from(bucketName)
                .upload(filePath, file.buffer, {
                    contentType: file.mimetype,
                    upsert: true
                });

            if (uploadResult.error) {
                // Tratamento específico para erro de verificação de assinatura
                if (uploadResult.error.message?.toLowerCase().includes('signature verification failed') ||
                    uploadResult.error.message?.toLowerCase().includes('signature') ||
                    (uploadResult.error as any).statusCode === '403' || (uploadResult.error as any).status === 403) {
                    throw new Error(
                        "Erro de verificação de assinatura. Verifique se SUPABASE_SERVICE_ROLE_KEY está configurada corretamente."
                    );
                }
                throw new Error(`Erro ao enviar documento: ${uploadResult.error.message}`);
            }

            const { data } = supabaseAdmin.storage.from(bucketName).getPublicUrl(filePath);
            if (!data || !data.publicUrl) {
                throw new Error("Falha ao gerar URL pública do documento.");
            }
            linkDock = data.publicUrl;
        }

        await prisma.$transaction(async (tx: PrismaTransaction) => {
            await tx.consulta.update({
                where: { Id: reservationId },
                data: { Status: 'CanceladaPacienteNoPrazo' }
            });

            if (reservation.ReservaSessao) {
                // Determina o status baseado no userRole
                let statusReservaSessao: AgendaStatus = AgendaStatus.Cancelado;
                if (userRole === 'Paciente') {
                    statusReservaSessao = AgendaStatus.Cancelled_by_patient;
                } else if (userRole === 'Psychologist' || userRole === 'Psicologo') {
                    statusReservaSessao = AgendaStatus.Cancelled_by_psychologist;
                }

                await tx.reservaSessao.update({
                    where: { Id: reservation.ReservaSessao.Id },
                    data: { Status: statusReservaSessao }
                });
            }

            if (reservation.Agenda) {
                // Quando paciente cancela, libera a agenda para novo agendamento
                await tx.agenda.update({
                    where: { Id: reservation.Agenda.Id },
                    data: { Status: AgendaStatus.Disponivel, PacienteId: null }
                });
            }

            await tx.cancelamentoSessao.create({
                data: {
                    Protocolo: protocolo,
                    Motivo: motivo || 'Cancelamento realizado pelo usuário',
                    Data: dayjs().format('YYYY-MM-DD'),
                    Horario: dayjs().format('HH:mm'),
                    LinkDock: linkDock,
                    SessaoId: reservation.Id,
                    PacienteId: reservation.PacienteId!,
                    PsicologoId: reservation.PsicologoId!,
                    AutorId: userRole === 'Paciente' ? reservation.PacienteId! : reservation.PsicologoId!,
                    Status: 'EmAnalise',
                    Tipo: (userRole === 'Paciente' ? 'Paciente' : 'Psicologo') as AutorTipoCancelamento
                }
            });
        });

        // OTIMIZAÇÃO: Envia e-mails e notificações em background (não bloqueia resposta)
        // Isso permite que a agenda seja liberada imediatamente
        setImmediate(async () => {
            try {
                const reservationEmailData = {
                    paciente: {
                        nome: reservation.Paciente?.Nome || 'Paciente',
                        email: reservation.Paciente?.Email || ''
                    },
                    psicologo: {
                        nome: reservation.Psicologo?.Nome || 'Psicólogo',
                        email: reservation.Psicologo?.Email || ''
                    },
                    date: reservation.Agenda?.Data || reservation.Date,
                    time: reservation.Agenda?.Horario || reservation.Time
                };

                await this.emailService.sendCancelamentoCriadoEmail(
                    reservationEmailData as any,
                    motivo || 'Cancelamento realizado pelo usuário',
                    protocolo
                );
            } catch (emailError) {
                console.error('[ReservationService] Erro ao enviar e-mails de cancelamento (paciente/psicólogo):', emailError);
            }

            // Notificações via socket para paciente e psicólogo
            try {
                const pacienteId = reservation.PacienteId;
                const psicologoId = reservation.PsicologoId;

                const dataStr = reservation.Date ? dayjs(reservation.Date).format('DD/MM/YYYY') : '';
                const horaStr = reservation.Time || '';

                // Paciente: cancelamento em análise (status EmAnalise)
                if (pacienteId) {
                    await this.notificationService.sendNotification({
                        userId: pacienteId,
                        title: 'Cancelamento Solicitado',
                        message: `Sua solicitação de cancelamento foi recebida e está em análise. Protocolo: ${protocolo}`,
                        type: 'warning'
                    });
                }

                // Psicólogo: aviso de solicitação de cancelamento
                if (psicologoId) {
                    const nomePaciente = reservation.Paciente?.Nome || 'Paciente';
                    await this.notificationService.sendNotification({
                        userId: psicologoId,
                        title: 'Cancelamento Solicitado',
                        message: `O paciente ${nomePaciente} solicitou o cancelamento da sessão agendada para ${dataStr} às ${horaStr}. Protocolo: ${protocolo}`,
                        type: 'warning'
                    });
                }
            } catch (notificationError) {
                console.error('[ReservationService] Erro ao enviar notificações de cancelamento via socket:', notificationError);
            }
        });

        return { protocolo, documentoUrl: linkDock || undefined };
    }

    async fetchReservationById(id: string): Promise<ConsultaWithRelations | null> {
        try {
            if (!id || id.trim() === '') {
                console.warn('[ReservationService] ID da reserva é obrigatório');
                return null;
            }

            const reservation = await prisma.consulta.findUnique({
                where: { Id: id },
                include: {
                    Psicologo: {
                        select: {
                            Id: true,
                            Nome: true,
                            Email: true,
                            Images: { select: { Url: true } },
                        },
                    },
                    Paciente: {
                        select: {
                            Nome: true,
                            Email: true,
                        },
                    },
                    Agenda: {
                        select: {
                            Id: true,
                            Data: true,
                            Horario: true,
                            DiaDaSemana: true,
                            Status: true,
                            CreatedAt: true,
                            UpdatedAt: true,
                            PsicologoId: true,
                            PacienteId: true,
                        },
                    },
                    ReservaSessao: {
                        select: {
                            Id: true,
                            AgoraChannel: true,
                            Status: true,
                            PatientJoinedAt: true,
                            PsychologistJoinedAt: true,
                            ReservationId: true,
                            Uid: true,
                            UidPsychologist: true,
                            ConsultaId: true,
                            AgoraTokenPatient: true,
                            AgoraTokenPsychologist: true,
                            AgendaId: true,
                            ScheduledAt: true,
                            PatientId: true,
                            PsychologistId: true,
                            createdAt: true,
                            updatedAt: true,
                        },
                    },
                },
            });

            if (!reservation) {
                console.warn(`[ReservationService] Reserva com ID ${id} não encontrada`);
                return null;
            }

            return reservation;
        } catch (error) {
            console.error(`[ReservationService] Erro ao buscar reserva por ID ${id}:`, error);
            // Retorna null em vez de lançar erro para evitar quebrar a aplicação
            return null;
        }
    }

    /**
     * Atualiza status de uma reserva usando ConsultaStatusService
     * Mapeia status legados para novos status normalizados
     * BUSCA PRIMÁRIA: pela ReservaSessao usando ConsultaId
     */
    async updateReservationStatus(id: string, status: string): Promise<void> {
        // BUSCA PRIMÁRIA: ReservaSessao pelo ConsultaId
        const reservaSessao = await prisma.reservaSessao.findUnique({
            where: { ConsultaId: id },
            include: {
                Consulta: {
                    include: {
                        ReservaSessao: true,
                        Agenda: true,
                    }
                }
            }
        });

        if (!reservaSessao || !reservaSessao.Consulta) {
            throw new Error('ReservaSessao ou Consulta não encontrada.');
        }

        const reservation = reservaSessao.Consulta;

        // Mapeia status legados para novos status normalizados
        let statusNormalizado: ConsultaStatus;
        if (status === STATUS.CANCELLED || status === 'Cancelado') {
            // Para cancelamentos, precisa determinar o tipo correto baseado no contexto
            // Por padrão, usa CanceladaPacienteNoPrazo (será ajustado pelo ConsultaStatusService se necessário)
            statusNormalizado = ConsultaStatus.CanceladaPacienteNoPrazo;
        } else if (status === STATUS.COMPLETED || status === 'Concluido' || status === 'Concluído') {
            statusNormalizado = ConsultaStatus.Realizada;
        } else if (status === STATUS.RESERVADO || status === 'Reservado') {
            statusNormalizado = ConsultaStatus.Reservado; // Mantém Reservado (status legado ainda usado)
        } else {
            // Tenta fazer parse do status como ConsultaStatus enum
            statusNormalizado = status as ConsultaStatus;
        }

        // Usa ConsultaStatusService para atualizar status corretamente
        const { ConsultaStatusService } = await import('./consultaStatus.service');
        const statusService = new ConsultaStatusService();

        const { ConsultaOrigemStatus } = await import('../constants/consultaStatus.constants');
        await statusService.atualizarStatus({
            consultaId: id,
            novoStatus: statusNormalizado,
            origem: ConsultaOrigemStatus.Sistemico,
        });

        // Atualiza ReservaSessao e Agenda se necessário
        if (reservation.ReservaSessao || reservation.Agenda) {
            await prisma.$transaction(async (tx: PrismaTransaction) => {
                if (reservation.ReservaSessao) {
                    // ReservaSessao.Status é AgendaStatus, então mapeia ConsultaStatus para AgendaStatus
                    const statusReserva = statusNormalizado.toString().includes('Cancelada') || statusNormalizado.toString().includes('Cancelado')
                        ? AgendaStatus.Cancelado
                        : AgendaStatus.Reservado;
                    await tx.reservaSessao.update({
                        where: { Id: reservation.ReservaSessao.Id },
                        data: { Status: statusReserva },
                    });
                }

                if (reservation.Agenda) {
                    const agendaStatus = statusNormalizado.toString().includes('Cancelada') || statusNormalizado.toString().includes('Cancelado')
                        ? AgendaStatus.Cancelado
                        : AgendaStatus.Reservado;
                    await tx.agenda.update({
                        where: { Id: reservation.Agenda.Id },
                        data: {
                            Status: agendaStatus,
                            PacienteId: statusNormalizado.toString().includes('Cancelada') || statusNormalizado.toString().includes('Cancelado') ? null : reservation.PacienteId,
                        },
                    });
                }
            });
        }
    }

    async listReservations(userId: string): Promise<ConsultaListWithRelations[]> {
        return prisma.consulta.findMany({
            where: {
                OR: [
                    { PacienteId: userId },
                    { PsicologoId: userId },
                ],
            },
            include: {
                Psicologo: {
                    select: {
                        Id: true,
                        Nome: true,
                        Email: true,
                        Images: { select: { Url: true } }
                    }
                },
                Paciente: {
                    select: {
                        Nome: true,
                        Email: true,
                        AssinaturaPlanos: true
                    }
                },
                Agenda: {
                    select: {
                        Id: true,
                        Data: true,
                        Horario: true,
                        DiaDaSemana: true,
                        Status: true,
                        CreatedAt: true,
                        UpdatedAt: true,
                        PsicologoId: true,
                        PacienteId: true
                    }
                },
                ReservaSessao: {
                    select: {
                        Id: true,
                        AgoraChannel: true,
                        Status: true,
                        PatientJoinedAt: true,
                        PsychologistJoinedAt: true,
                        ReservationId: true,
                        Uid: true,
                        UidPsychologist: true,
                        ConsultaId: true,
                        AgoraTokenPatient: true,
                        AgoraTokenPsychologist: true,
                        AgendaId: true,
                        ScheduledAt: true,
                        PatientId: true,
                        PsychologistId: true,
                        createdAt: true,
                        updatedAt: true,
                    }
                },
            },
            orderBy: { Date: 'asc' },
        });
    }

    async listCompletedAndFutureReservations(userId: string): Promise<{ completed: ConsultaListWithRelations[]; reserved: ConsultaListWithRelations[] }> {
        const today = dayjs().startOf('day').toDate(); // Corrigido para Date

        const completed = await prisma.consulta.findMany({
            where: {
                Status: { in: ['Realizada'] },
                OR: [
                    { PacienteId: userId },
                    { PsicologoId: userId },
                ],
            },
            include: {
                Psicologo: { select: { Id: true, Nome: true, Email: true, Images: { select: { Url: true } } } },
                Paciente: { select: { Nome: true, Email: true, AssinaturaPlanos: true } },
                Agenda: {
                    select: {
                        Id: true,
                        Data: true,
                        Horario: true,
                        DiaDaSemana: true,
                        Status: true,
                        CreatedAt: true,
                        UpdatedAt: true,
                        PsicologoId: true,
                        PacienteId: true
                    }
                },
                ReservaSessao: {
                    select: {
                        Id: true,
                        AgoraChannel: true,
                        Status: true,
                        PatientJoinedAt: true,
                        PsychologistJoinedAt: true,
                        ReservationId: true,
                        Uid: true,
                        UidPsychologist: true,
                        ConsultaId: true,
                        AgoraTokenPatient: true,
                        AgoraTokenPsychologist: true,
                        AgendaId: true,
                        ScheduledAt: true,
                        PatientId: true,
                        PsychologistId: true,
                        createdAt: true,
                        updatedAt: true
                    }
                },
            },
            orderBy: { Date: 'asc' },
        });

        const reserved = await prisma.consulta.findMany({
            where: {
                Status: 'Reservado',
                Date: { gt: today },
                OR: [
                    { PacienteId: userId },
                    { PsicologoId: userId },
                ],
            },
            include: {
                Psicologo: { select: { Id: true, Nome: true, Email: true, Images: { select: { Url: true } } } },
                Paciente: { select: { Nome: true, Email: true, AssinaturaPlanos: true } },
                Agenda: {
                    select: {
                        Id: true,
                        Data: true,
                        Horario: true,
                        DiaDaSemana: true,
                        Status: true,
                        CreatedAt: true,
                        UpdatedAt: true,
                        PsicologoId: true,
                        PacienteId: true
                    }
                },
                ReservaSessao: {
                    select: {
                        Id: true,
                        AgoraChannel: true,
                        Status: true,
                        PatientJoinedAt: true,
                        PsychologistJoinedAt: true,
                        ReservationId: true,
                        Uid: true,
                        UidPsychologist: true,
                        ConsultaId: true,
                        AgoraTokenPatient: true,
                        AgoraTokenPsychologist: true,
                        AgendaId: true,
                        ScheduledAt: true,
                        PatientId: true,
                        PsychologistId: true,
                        createdAt: true,
                        updatedAt: true
                    }
                },
            },
            orderBy: { Date: 'asc' },
        });

        return { completed, reserved };
    }

    async updateCompletedReservations(): Promise<void> {
        const now = dayjs();
        const reservationsToUpdate = await prisma.consulta.findMany({
            where: {
                Status: 'Reservado',
                OR: [
                    {
                        Date: { lt: now.format('YYYY-MM-DD') }
                    },
                    {
                        Date: now.format('YYYY-MM-DD'),
                        Time: { lt: now.format('HH:mm') }
                    }
                ]
            }
        });

        // Usa ConsultaStatusService para finalizar consultas corretamente
        const { ConsultaStatusService } = await import('./consultaStatus.service');
        const statusService = new ConsultaStatusService();

        for (const reservation of reservationsToUpdate) {
            await statusService.finalizarConsulta(reservation.Id);
        }
    }

    async cancelReservationAutomatic(reservationId: string, pacienteId: string, psicologoId: string): Promise<void> {
        // BUSCA PRIMÁRIA: ReservaSessao pelo ConsultaId
        const reservaSessao = await prisma.reservaSessao.findUnique({
            where: { ConsultaId: reservationId },
            include: {
                Consulta: {
                    include: {
                        ReservaSessao: true,
                        Agenda: true,
                        Psicologo: { select: { Nome: true, Email: true } },
                        Paciente: { select: { Nome: true, Email: true } },
                    }
                }
            }
        });

        if (!reservaSessao || !reservaSessao.Consulta) {
            throw new Error('ReservaSessao ou Consulta não encontrada.');
        }

        const reservation = reservaSessao.Consulta;

        // Usa ConsultaStatusService para cancelar corretamente
        const { ConsultaStatusService } = await import('./consultaStatus.service');
        const statusService = new ConsultaStatusService();

        // Determina se está dentro do prazo (24h antes)
        const dataConsulta = dayjs(reservation.Date);
        const agora = dayjs();
        const horasAntecedencia = dataConsulta.diff(agora, 'hour');
        const dentroDoPrazo = horasAntecedencia >= 24;

        // Cancela usando o serviço (assume cancelamento automático por sistema)
        // Por padrão, marca como não comparecimento do paciente
        await statusService.marcarNaoComparecimento(reservationId, 'paciente');

        // Atualiza ReservaSessao e Agenda
        await prisma.$transaction(async (tx: PrismaTransaction) => {
            if (reservation.ReservaSessao) {
                await tx.reservaSessao.update({
                    where: { Id: reservation.ReservaSessao.Id },
                    data: { Status: "Cancelado" }
                });
            }

            if (reservation.Agenda) {
                await tx.agenda.update({
                    where: { Id: reservation.Agenda.Id },
                    data: {
                        Status: AgendaStatus.Cancelado,
                        PacienteId: null
                    }
                });
            }
        });

        // Envia e-mails automáticos para paciente e psicólogo
        await this.emailService.sendAutoCancellationEmail(reservation);

        // Notificações via socket para ambos em cancelamento automático
        try {
            const dataStr = reservation.Date ? dayjs(reservation.Date).format('DD/MM/YYYY') : '';
            const horaStr = reservation.Time || '';

            if (pacienteId) {
                await this.notificationService.sendNotification({
                    userId: pacienteId,
                    title: 'Sessão Cancelada Automaticamente',
                    message: `Sua sessão em ${dataStr} às ${horaStr} foi cancelada automaticamente por inatividade/ausência.`,
                    type: 'warning'
                });
            }

            if (psicologoId) {
                const nomePaciente = reservation.Paciente?.Nome || 'Paciente';
                await this.notificationService.sendNotification({
                    userId: psicologoId,
                    title: 'Sessão Cancelada Automaticamente',
                    message: `A sessão do paciente ${nomePaciente} em ${dataStr} às ${horaStr} foi cancelada automaticamente por inatividade/ausência.`,
                    type: 'warning'
                });
            }
        } catch (notificationError) {
            console.error('[ReservationService] Erro ao enviar notificações de cancelamento automático via socket:', notificationError);
        }
    }

    /**
     * Verifica saldo de consultas do usuário e cadastra valor na consulta
     * Agora aceita o objeto de transação opcional (tx)
     */
    async atribuirValorConsulta(userId: string, consultaId: string, tx?: PrismaTransaction): Promise<void> {
        const prismaClient: PrismaClientOrTransaction = tx ?? prisma;

        // Busca usuário com plano ativo e consultas avulsas
        const user = await prismaClient.user.findUnique({
            where: { Id: userId },
            include: {
                AssinaturaPlanos: {
                    where: { Status: 'Ativo' },
                    include: { PlanoAssinatura: true }
                },
                ControleConsultaMensal: true,
                ConsultaAvulsaPaciente: {
                    where: { Status: ConsultaAvulsaStatus.Ativa }
                }
            }
        });

        if (!user) throw new Error('Usuário não encontrado');

        // Verifica saldo de consultas mensais
        const controleMensal = user.ControleConsultaMensal.find((c: typeof user.ControleConsultaMensal[0]) => c.Status === 'Ativo');
        let valorConsulta = 0;

        if (controleMensal && controleMensal.ConsultasDisponiveis > 0) {
            // Tem saldo mensal, pega valor do plano e divide por 4
            const plano = user.AssinaturaPlanos[0]?.PlanoAssinatura;
            if (plano && plano.Preco) {
                valorConsulta = plano.Preco / 4;
            }
        } else {
            // Sem saldo mensal, verifica saldo avulso
            const consultaAvulsa = user.ConsultaAvulsaPaciente.find((ca: typeof user.ConsultaAvulsaPaciente[0]) => ca.Quantidade > 0 && ca.Status === ConsultaAvulsaStatus.Ativa);
            if (consultaAvulsa) {
                // Busca o plano relacionado à consulta avulsa
                let valorAvulso = 0;
                if (consultaAvulsa.PsicologoId) {
                    // Busca plano do psicólogo para consulta avulsa
                    const planoAvulso = await prismaClient.planoAssinatura.findFirst({
                        where: {
                            Tipo: { in: ["Avulsa", "Unica"] },
                            Status: "Ativo"
                        }
                    });
                    if (planoAvulso && planoAvulso.Preco) {
                        valorAvulso = planoAvulso.Preco;
                    }
                }
                valorConsulta = valorAvulso;
            }
        }

        // Atualiza valor na consulta usando o mesmo client/tx
        await prismaClient.consulta.update({
            where: { Id: consultaId },
            data: { Valor: Number(valorConsulta.toFixed(2)) }
        });
    }

    /**
     * Valida se o paciente pode reservar (CicloPlano, CreditoAvulso ou ConsultaAvulsa)
     */
    async pacientePodeReservar(userId: string) {
        const agora = new Date();

        //----------------------------------------- 
        // 1️⃣ CicloPlano — Verifica se tem ConsultasDisponiveis e está válido (CreatedAt + 30 dias)
        //-----------------------------------------
        const cicloAtivo = await prisma.cicloPlano.findFirst({
            where: {
                UserId: userId,
                Status: 'Ativo',
                ConsultasDisponiveis: { gt: 0 },
            },
            orderBy: { CreatedAt: 'desc' },
        });

        if (cicloAtivo) {
            const dataCriacao = new Date(cicloAtivo.CreatedAt);
            const dataValidade = new Date(dataCriacao);
            dataValidade.setDate(dataValidade.getDate() + 30);

            if (dataValidade >= agora) {
                return {
                    pode: true,
                    tipo: "CicloPlano",
                    registro: cicloAtivo,
                    tabela: "CicloPlano"
                };
            }
        }

        //-----------------------------------------
        // 2️⃣ CreditoAvulso — Verifica se tem Quantidade > 0, Status = Ativa e ValidUntil > agora
        //-----------------------------------------
        const creditoAvulso = await prisma.creditoAvulso.findFirst({
            where: {
                UserId: userId,
                Status: ConsultaAvulsaStatus.Ativa,
                Quantidade: { gt: 0 },
                ValidUntil: { gt: agora }, // ValidUntil > data atual
            },
            orderBy: { ValidUntil: 'asc' }, // Prioriza o que vence primeiro
        });

        if (creditoAvulso) {
            return {
                pode: true,
                tipo: "CreditoAvulso",
                registro: creditoAvulso,
                tabela: "CreditoAvulso"
            };
        }

        //-----------------------------------------
        // 3️⃣ ConsultaAvulsa — Verifica: DataCriacao <= 30 dias, Quantidade >= 1, Status = Ativa
        //-----------------------------------------
        const dataLimite = new Date(agora);
        dataLimite.setDate(dataLimite.getDate() - 30);

        const consultaAvulsa = await prisma.consultaAvulsa.findFirst({
            where: {
                PacienteId: userId,
                Status: ConsultaAvulsaStatus.Ativa,
                Quantidade: { gte: 1 },
                DataCriacao: { gte: dataLimite }, // Criada há no máximo 30 dias
            },
            orderBy: { DataCriacao: 'desc' },
        });

        if (consultaAvulsa) {
            return {
                pode: true,
                tipo: "ConsultaAvulsa",
                registro: consultaAvulsa,
                tabela: "ConsultaAvulsa"
            };
        }

        //-----------------------------------------
        // ❌ Nada encontrado
        //-----------------------------------------
        return { pode: false };
    }

}