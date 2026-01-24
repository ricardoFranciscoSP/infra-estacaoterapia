import { Response } from "express";
import prisma from "../prisma/client";
import { GoogleCalendarService } from "./googleCalendar.service";
import { EmailService } from "./email.service";
import { IEmailService } from "../interfaces/email.interface";
import { ProximaConsultaService } from "./proximaConsulta.service";
import { WebSocketNotificationService } from "./websocketNotification.service";
import { STATUS } from "../constants/status.constants";
import { ConsultaAvulsaStatus, Prisma, AgendaStatus } from "../generated/prisma";
import { NewReservaBody } from "../interfaces/consultasPsicologo.interface";
import dayjs from "dayjs";
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrAfter);

// Tipo para transações do Prisma
type PrismaTransaction = Omit<Prisma.TransactionClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

export class ConsultasPsicologoService {
    private emailService: IEmailService;
    private proximaConsultaService: ProximaConsultaService;
    private websocketNotificationService: WebSocketNotificationService;

    constructor(emailService?: IEmailService) {
        this.emailService = emailService ?? new EmailService();
        this.proximaConsultaService = new ProximaConsultaService();
        // Usa serviço de batching para otimizar notificações
        const { getWebSocketNotificationBatchService } = require('./websocketNotificationBatch.service');
        this.websocketNotificationService = getWebSocketNotificationBatchService();
    }

    async findReservas(userId: string, res: Response): Promise<Response> {
        const user = await prisma.user.findUnique({
            where: { Id: userId },
            select: { Role: true },
        });
        if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

        const reservations = await prisma.consulta.findMany({
            where: { PsicologoId: userId, Status: 'Reservado' },
            include: {
                Psicologo: { select: { Id: true, Nome: true, Email: true, Images: { select: { Url: true } } } },
                Paciente: { select: { Nome: true, Email: true } },
                Agenda: { select: { Data: true, Horario: true, DiaDaSemana: true, Status: true } },
                ReservaSessao: { select: { AgoraTokenPatient: true, AgoraTokenPsychologist: true, Status: true } },
            },
            orderBy: { Date: 'asc' },
        });
        return res.status(200).json(reservations);
    }

    async getReservasCompletasEAgendadasPorUsuario(userId: string, res: Response): Promise<Response> {
        const today = dayjs().format('YYYY-MM-DD');
        const completed = await prisma.consulta.findMany({
            where: { Status: 'Realizada', PsicologoId: userId },
            include: {
                Psicologo: { select: { Id: true, Nome: true, Email: true, Images: { select: { Url: true } } } },
                Paciente: { select: { Nome: true, Email: true } },
                Agenda: { select: { Data: true, Horario: true, DiaDaSemana: true, Status: true } },
                ReservaSessao: { select: { AgoraChannel: true, Status: true } },
            },
            orderBy: { Date: 'asc' },
        });
        const reserved = await prisma.consulta.findMany({
            where: { Status: 'Reservado', Date: { gte: today }, PsicologoId: userId },
            include: {
                Psicologo: { select: { Id: true, Nome: true, Email: true, Images: { select: { Url: true } } } },
                Paciente: { select: { Nome: true, Email: true } },
                Agenda: { select: { Data: true, Horario: true, DiaDaSemana: true, Status: true } },
                ReservaSessao: { select: { AgoraChannel: true, Status: true } },
            },
            orderBy: { Date: 'asc' },
        });
        return res.status(200).json({ completed, reserved });
    }

    async getReservasPorId(userId: string, reservationId: string, res: Response): Promise<Response> {
        const reservation = await prisma.consulta.findUnique({
            where: { Id: reservationId },
            include: {
                Psicologo: { select: { Id: true, Nome: true, Email: true, Images: { select: { Url: true } } } },
                Paciente: { select: { Nome: true, Email: true } },
                Agenda: { select: { Data: true, Horario: true, DiaDaSemana: true, Status: true } },
                ReservaSessao: { select: { AgoraChannel: true, Status: true } },
            },
        });
        if (!reservation) return res.status(404).json({ error: 'Reserva não encontrada.' });
        return res.status(200).json(reservation);
    }

    async cancelarReserva(userId: string, reservationId: string, res: Response): Promise<Response> {
        const user = await prisma.user.findUnique({
            where: { Id: userId },
            select: { Role: true, Nome: true, Email: true },
        });
        if (!user || (user.Role !== 'Patient' && user.Role !== 'Psychologist')) {
            return res.status(403).json({ error: 'Somente pacientes ou psicólogos podem cancelar reservas.' });
        }
        const reservation = await prisma.consulta.findUnique({
            where: { Id: reservationId },
            include: { Psicologo: true, Paciente: true, ReservaSessao: true, Agenda: true },
        });
        if (!reservation) return res.status(404).json({ error: 'Reserva não encontrada.' });
        if (reservation.PsicologoId !== userId) {
            return res.status(403).json({ error: 'Apenas o psicólogo responsável pode cancelar esta reserva.' });
        }
        const diffHours = dayjs(reservation.Date).diff(dayjs(), 'hour');
        if (diffHours < 24) {
            return res.status(400).json({ error: 'Reservas só podem ser canceladas com no mínimo 24 horas de antecedência.' });
        }
        if (reservation.ReservaSessao) {
            await prisma.reservaSessao.update({
                where: { Id: reservation.ReservaSessao.Id },
                data: { Status: 'Cancelado' },
            });
        }
        if (reservation.Agenda) {
            await prisma.agenda.update({
                where: { Id: reservation.Agenda.Id },
                data: { Status: 'Cancelado', PacienteId: null },
            });
        }

        await this.emailService.send({
            to: reservation.Paciente?.Email ?? '',
            subject: 'Cancelamento de Consulta',
            htmlTemplate: 'cancelAppointment',
            templateData: {
                pacienteNome: reservation.Paciente?.Nome ?? 'Paciente não identificado',
                psicologoNome: reservation.Psicologo?.Nome ?? 'Psicólogo não identificado',
                data: reservation.Date,
                horario: reservation.Time,
            },
        });

        // Notifica sobre o cancelamento em tempo real
        await this.proximaConsultaService.notificarAmbosUsuarios(
            reservation.PsicologoId || userId,
            reservation.PacienteId,
            'cancelamento'
        );

        return res.status(200).json({ message: 'Reserva cancelada com sucesso.' });
    }

    async releaseSchedule(userId: string, agendaId: string, res: Response): Promise<Response> {
        const agenda = await prisma.agenda.findUnique({
            where: { Id: agendaId },
            select: { PsicologoId: true, Data: true },
        });
        if (!agenda) return res.status(404).json({ error: 'Agenda não encontrada.' });
        if (agenda.PsicologoId !== userId) {
            return res.status(403).json({ error: 'Apenas o psicólogo responsável pode liberar esta agenda.' });
        }
        if (dayjs(agenda.Data).isBefore(dayjs(), 'day')) {
            return res.status(400).json({ error: 'Não é possível liberar uma agenda retroativa.' });
        }
        await prisma.agenda.update({
            where: { Id: agendaId },
            data: { Status: 'Disponivel' },
        });
        return res.status(200).json({ message: 'Agenda liberada com sucesso.' });
    }

    async newReserva(userId: string, body: NewReservaBody, res: Response): Promise<Response> {
        try {
            const { agendaId, pacienteId } = body;
            if (!agendaId || !pacienteId) {
                return res.status(400).json({ error: 'ID da agenda e ID do paciente são obrigatórios.' });
            }
            const agenda = await prisma.agenda.findUnique({
                where: { Id: agendaId },
                select: { PsicologoId: true, Data: true, Horario: true, Status: true },
            });
            if (!agenda) return res.status(404).json({ error: 'Agenda não encontrada.' });
            if (agenda.PsicologoId !== userId) {
                return res.status(403).json({ error: 'Apenas o psicólogo responsável pode criar uma reserva para esta agenda.' });
            }
            if (agenda.Status !== STATUS.AVAILABLE) {
                return res.status(400).json({ error: 'A agenda não está disponível para reserva.' });
            }
            if (dayjs(agenda.Data).isBefore(dayjs(), 'day')) {
                return res.status(400).json({ error: 'Não é possível criar uma reserva para uma data retroativa.' });
            }

            // Verifica saldo: MESMA ORDEM DO DÉBITO - CreditoAvulso primeiro, depois ConsultaAvulsa, depois CicloPlano
            const agora = new Date();
            let temSaldo = false;

            console.log(`[ConsultasPsicologoService] Verificando saldo para paciente ${pacienteId}`);

            // 1. PRIORIDADE: Verifica CreditoAvulso primeiro (mesma ordem do débito)
            const creditoAvulso = await prisma.creditoAvulso.findFirst({
                where: {
                    UserId: pacienteId,
                    Status: ConsultaAvulsaStatus.Ativa,
                    Quantidade: { gt: 0 },
                    ValidUntil: { gt: agora },
                },
                orderBy: { ValidUntil: 'asc' },
            });
            if (creditoAvulso) {
                temSaldo = true;
                console.log(`[ConsultasPsicologoService] Saldo encontrado: CreditoAvulso ${creditoAvulso.Id}, quantidade: ${creditoAvulso.Quantidade}`);
            }

            // 2. Se não tem CreditoAvulso, verifica ConsultaAvulsa
            if (!temSaldo) {
                const dataLimite = new Date(agora);
                dataLimite.setDate(dataLimite.getDate() - 30);
                const consultaAvulsa = await prisma.consultaAvulsa.findFirst({
                    where: {
                        PacienteId: pacienteId,
                        Status: ConsultaAvulsaStatus.Ativa,
                        Quantidade: { gte: 1 },
                        DataCriacao: { gte: dataLimite },
                    },
                    orderBy: { DataCriacao: 'desc' },
                });
                if (consultaAvulsa) {
                    temSaldo = true;
                    console.log(`[ConsultasPsicologoService] Saldo encontrado: ConsultaAvulsa ${consultaAvulsa.Id}, quantidade: ${consultaAvulsa.Quantidade}`);
                }
            }

            // 3. Se não tem ConsultaAvulsa, verifica CicloPlano
            if (!temSaldo) {
                const cicloAtivo = await prisma.cicloPlano.findFirst({
                    where: {
                        UserId: pacienteId,
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
                        temSaldo = true;
                        console.log(`[ConsultasPsicologoService] Saldo encontrado: CicloPlano ${cicloAtivo.Id}, ConsultasDisponiveis: ${cicloAtivo.ConsultasDisponiveis}, validade: ${dataValidade.toISOString()}`);
                    } else {
                        console.warn(`[ConsultasPsicologoService] CicloPlano ${cicloAtivo.Id} encontrado mas está expirado (validade: ${dataValidade.toISOString()}, agora: ${agora.toISOString()})`);
                    }
                } else {
                    console.warn(`[ConsultasPsicologoService] Nenhum CicloPlano ativo encontrado para paciente ${pacienteId}`);
                }
            }

            if (!temSaldo) {
                return res.status(400).json({
                    error: 'Saldo insuficiente',
                    message: 'O paciente não possui saldo de consultas disponível. Por favor, oriente o paciente a adquirir um plano ou consultas avulsas para continuar.'
                });
            }
            // Validação: Verifica se o paciente já possui uma consulta agendada dentro do período de 60 minutos
            // (mesmo que seja com outro psicólogo) para evitar conflito de horários
            const config = await prisma.configuracao.findFirst({ select: { duracaoConsultaMin: true } });
            const consultaDurationMin = config?.duracaoConsultaMin || 60;

            // Prepara variáveis que serão usadas tanto na validação quanto na criação
            const horarioStr = String(agenda.Horario).padStart(5, '0');
            const agendaDateStr = dayjs(agenda.Data).format('YYYY-MM-DD');
            const novaConsultaInicio = dayjs.tz(`${agendaDateStr} ${horarioStr}`, 'YYYY-MM-DD HH:mm', 'America/Sao_Paulo');
            const novaConsultaFim = novaConsultaInicio.add(consultaDurationMin, 'minute');

            const activeStatuses = ['Reservado', 'EmAndamento', 'Agendada'];
            const consultasNoDia = await prisma.consulta.findMany({
                where: {
                    PacienteId: pacienteId,
                    Status: {
                        in: activeStatuses as any
                    },
                    Date: {
                        gte: novaConsultaInicio.startOf('day').toDate(),
                        lte: novaConsultaInicio.endOf('day').toDate(),
                    },
                },
                select: {
                    Date: true,
                    Time: true,
                    Psicologo: {
                        select: {
                            Nome: true
                        }
                    }
                }
            });

            // Verifica conflitos considerando APENAS o horário de INÍCIO da nova consulta
            // Regra: não permitir iniciar dentro de 60 minutos antes ou depois do início de uma consulta existente
            const conflito = consultasNoDia.find((consulta) => {
                const existingTime = String(consulta.Time || '00:00').padStart(5, '0');
                const existingDateStr = dayjs(consulta.Date).format('YYYY-MM-DD');
                const inicioConsultaExistente = dayjs.tz(`${existingDateStr} ${existingTime}`, 'YYYY-MM-DD HH:mm', 'America/Sao_Paulo');

            const inicioJanelaConflito = inicioConsultaExistente.subtract(60, 'minute');
            const fimJanelaConflito = inicioConsultaExistente.add(60, 'minute');

                const inicioDentro = novaConsultaInicio.isSameOrAfter(inicioJanelaConflito) && novaConsultaInicio.isBefore(fimJanelaConflito);
                return inicioDentro;
            });

            if (conflito) {
                const psicologoNome = conflito.Psicologo?.Nome || 'outro psicólogo';
                const dataFormatada = dayjs(conflito.Date).format('DD/MM/YYYY');
                const horarioConflito = String(conflito.Time || '').padStart(5, '0');
                return res.status(400).json({
                    error: `O paciente já possui uma consulta agendada no dia ${dataFormatada} às ${horarioConflito} com ${psicologoNome}. Não é possível marcar uma consulta dentro do período de 60 minutos antes ou depois de uma consulta já agendada.`
                });
            }

            // Monta string no formato 'YYYY-MM-DD HH:mm:ss' para ScheduledAt
            // Reutiliza horarioStr e agendaDateStr já declarados acima
            const dataStr = agendaDateStr; // Já foi formatado acima
            const horarioFormatado = /^\d{2}:\d{2}$/.test(agenda.Horario) ? agenda.Horario : horarioStr;
            const scheduledAtStr = `${dataStr} ${horarioFormatado}:00`;

            // Executa toda a criação da reserva, atualização da agenda e débito de saldo em uma única transação
            const result = await prisma.$transaction(async (tx: PrismaTransaction) => {
                // 🎯 GARANTE que PacienteId seja preenchido e Status mude para Reservado na tabela Agenda
                // 1. Atualiza o status da agenda para "Reservado" e associa ao paciente
                const updatedAgenda = await tx.agenda.update({
                    where: { Id: agendaId },
                    data: {
                        Status: AgendaStatus.Reservado,
                        PacienteId: pacienteId // Garante que PacienteId seja sempre preenchido
                    },
                });
                
                // Validação adicional: verifica se o update foi bem-sucedido
                if (!updatedAgenda || !updatedAgenda.PacienteId || updatedAgenda.Status !== AgendaStatus.Reservado) {
                    throw new Error('Falha ao atualizar Agenda: PacienteId ou Status não foram atualizados corretamente');
                }

                // 2. Cria a reserva (consulta)
                const reservation = await tx.consulta.create({
                    data: {
                        PsicologoId: userId,
                        PacienteId: pacienteId,
                        Date: updatedAgenda.Data,
                        Time: updatedAgenda.Horario,
                        Status: AgendaStatus.Reservado,
                        AgendaId: agendaId,
                    },
                });

                // 3. Cria a ReservaSessao
                const { deriveUidFromUuid } = require('../utils/uid.util');
                const uidPaciente = deriveUidFromUuid(pacienteId);
                const uidPsicologo = deriveUidFromUuid(userId);
                await tx.reservaSessao.create({
                    data: {
                        Status: AgendaStatus.Reservado,
                        ConsultaId: reservation.Id,
                        ReservationId: reservation.Id,
                        ScheduledAt: scheduledAtStr,
                        AgoraChannel: `sala_${reservation.Id}`,
                        Uid: uidPaciente,
                        UidPsychologist: uidPsicologo,
                        PatientId: pacienteId,
                        PsychologistId: userId,
                        AgendaId: agendaId,
                    },
                });

                // 4. Decrementa saldo: PRIORIZA CreditoAvulso primeiro, depois ConsultaAvulsa, depois CicloPlano
                let creditoAvulsoIdUsado: string | null = null;
                let consultaAvulsaIdUsado: string | null = null;
                let cicloPlanoIdUsado: string | null = null;

                // 4.1. PRIORIDADE: Tenta CreditoAvulso válido primeiro
                const creditoAvulso = await tx.creditoAvulso.findFirst({
                    where: {
                        UserId: pacienteId,
                        Status: ConsultaAvulsaStatus.Ativa,
                        Quantidade: { gt: 0 },
                        ValidUntil: { gt: agora },
                    },
                    orderBy: { ValidUntil: 'asc' },
                });

                if (creditoAvulso) {
                    const novaQuantidade = creditoAvulso.Quantidade - 1;
                    await tx.creditoAvulso.update({
                        where: { Id: creditoAvulso.Id },
                        data: {
                            Quantidade: novaQuantidade,
                            Status: novaQuantidade <= 0 ? ConsultaAvulsaStatus.Concluida : creditoAvulso.Status,
                        },
                    });
                    creditoAvulsoIdUsado = creditoAvulso.Id;
                } else {
                    // 4.2. Se não encontrou CreditoAvulso, tenta ConsultaAvulsa
                    const dataLimite = new Date(agora);
                    dataLimite.setDate(dataLimite.getDate() - 30);
                    const consultaAvulsa = await tx.consultaAvulsa.findFirst({
                        where: {
                            PacienteId: pacienteId,
                            Status: ConsultaAvulsaStatus.Ativa,
                            Quantidade: { gte: 1 },
                            DataCriacao: { gte: dataLimite },
                        },
                        orderBy: { DataCriacao: 'desc' },
                    });

                    if (consultaAvulsa) {
                        const novaQuantidade = consultaAvulsa.Quantidade - 1;
                        await tx.consultaAvulsa.update({
                            where: { Id: consultaAvulsa.Id },
                            data: {
                                Quantidade: novaQuantidade,
                                Status: novaQuantidade < 1 ? ConsultaAvulsaStatus.Concluida : consultaAvulsa.Status,
                            },
                        });
                        consultaAvulsaIdUsado = consultaAvulsa.Id;
                    } else {
                        // 4.3. Se não encontrou ConsultaAvulsa, tenta CicloPlano válido
                        const ciclosValidos = await tx.cicloPlano.findMany({
                            where: {
                                UserId: pacienteId,
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

                        if (cicloParaDebitar) {
                            const novasConsultasDisponiveis = cicloParaDebitar.ConsultasDisponiveis - 1;
                            const novasConsultasUsadas = (cicloParaDebitar.ConsultasUsadas || 0) + 1;

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

                            await tx.consulta.update({
                                where: { Id: reservation.Id },
                                data: { CicloPlanoId: cicloParaDebitar.Id },
                            });

                            cicloPlanoIdUsado = cicloParaDebitar.Id;
                        } else {
                            throw new Error('Erro ao decrementar saldo: nenhum tipo de saldo encontrado.');
                        }
                    }
                }

                // 5. Valida que algum tipo de saldo foi debitado
                if (!cicloPlanoIdUsado && !consultaAvulsaIdUsado && !creditoAvulsoIdUsado) {
                    throw new Error('Erro ao decrementar saldo: nenhum tipo de saldo foi debitado.');
                }

                return { reservation, updatedAgenda };
            });

            const reservation = result.reservation;
            // ✅ Agenda delayed jobs (cancelamento e finalização) quando consulta é criada
            const reservaSessao = await prisma.reservaSessao.findUnique({ 
                where: { ConsultaId: reservation.Id },
                select: { ScheduledAt: true }
            });
            if (reservaSessao?.ScheduledAt) {
                try {
                    // Agenda delayed jobs de cancelamento e finalização
                    const { scheduleConsultationJobs } = await import('../utils/scheduleDelayedJobs');
                    await scheduleConsultationJobs(reservation.Id, reservaSessao.ScheduledAt);
                    console.log(`✅ [ConsultasPsicologoService] Delayed jobs agendados para consulta ${reservation.Id} no horário: ${reservaSessao.ScheduledAt}`);
                    
                    // Agenda geração de tokens (mantém compatibilidade)
                    const { scheduleAgoraTokenGeneration } = await import('../utils/scheduleAgoraToken');
                    const agendado = await scheduleAgoraTokenGeneration(reservation.Id, reservaSessao.ScheduledAt);
                    if (agendado) {
                        console.log(`✅ [ConsultasPsicologoService] Tokens Agora agendados com sucesso para consulta ${reservation.Id} no horário EXATO do ScheduledAt: ${reservaSessao.ScheduledAt}`);
                    } else {
                        console.warn(`⚠️ [ConsultasPsicologoService] Falha ao agendar tokens Agora para consulta ${reservation.Id}. O job de verificação periódica tentará novamente.`);
                    }
                } catch (tokenError) {
                    console.error(`❌ [ConsultasPsicologoService] Erro ao agendar delayed jobs ou tokens para consulta ${reservation.Id}:`, tokenError);
                    // Não falha a criação da reserva se o agendamento falhar
                }
            } else {
                console.warn(`⚠️ [ConsultasPsicologoService] ReservaSessao não encontrada ou sem ScheduledAt para consulta ${reservation.Id}`);
            }
            const paciente = await prisma.user.findUnique({
                where: { Id: pacienteId },
                select: { Nome: true, Email: true },
            });
            const psicologo = await prisma.user.findUnique({
                where: { Id: userId },
                select: { Nome: true, Email: true },
            });
            // Formata data e horário para os emails
            const dataFormatada = dayjs(agenda.Data).format('DD/MM/YYYY');
            const horarioFormatadoEmail = String(agenda.Horario).padStart(5, '0');

            // Envia emails de confirmação para paciente e psicólogo
            if (paciente && psicologo) {
                await this.emailService.send({
                    to: paciente.Email,
                    subject: 'Confirmação de Reserva',
                    htmlTemplate: 'confirmAppointment',
                    templateData: {
                        pacienteNome: paciente.Nome,
                        psicologoNome: psicologo.Nome,
                        data: agenda.Data,
                        horario: agenda.Horario,
                    },
                });
                await this.emailService.send({
                    to: psicologo.Email,
                    subject: 'Nova Reserva Confirmada',
                    htmlTemplate: 'confirmAppointment',
                    templateData: {
                        pacienteNome: paciente.Nome,
                        psicologoNome: psicologo.Nome,
                        data: agenda.Data,
                        horario: agenda.Horario,
                    },
                });
            }
            const calendarService = new GoogleCalendarService();
            if (!paciente) throw new Error('Paciente não encontrado ao criar evento no Google Calendar.');
            const event = await calendarService.createEvent('primary', {
                pacienteNome: paciente.Nome,
                psicologoNome: psicologo?.Nome,
                emailPaciente: paciente.Email,
                emailPsicologo: psicologo?.Email,
                dataConsulta: agenda.Data,
                horario: agenda.Horario,
            });
            await prisma.consulta.update({
                where: { Id: reservation.Id },
                data: { GoogleEventId: event.id },
            });

                // Se houver atualização de Status em outros pontos, garantir uso do enum $Enums.AgendaStatus
            if (!event) {
                return res.status(500).json({ error: 'Erro ao criar evento no Google Calendar.' });
            }

            // Notifica sobre a nova consulta em tempo real
            await this.proximaConsultaService.notificarAmbosUsuarios(
                userId,
                pacienteId,
                'nova_consulta'
            );

            // Emite evento específico para atualização de plano quando consulta é debitada
            if (pacienteId) {
                await this.websocketNotificationService.emitToUser(
                    pacienteId,
                    'plano:atualizado',
                    { motivo: 'consulta_debitada', consultaId: reservation.Id }
                );
            }

            return res.status(200).json({ message: 'Reserva criada com sucesso.', reservation });
        } catch (error) {
            console.error('[ConsultasPsicologoService] Erro em newReserva:', error);

            // Se o erro for relacionado ao débito de saldo, retorna mensagem específica
            if (error instanceof Error && error.message.includes('decrementar saldo')) {
                return res.status(400).json({
                    error: 'Erro ao processar débito',
                    message: error.message || 'Não foi possível debitar o saldo da consulta. A reserva não foi completada.'
                });
            }

            const errorMessage = error instanceof Error ? error.message : 'Erro interno no servidor.';
            return res.status(500).json({
                error: 'Erro interno no servidor.',
                message: errorMessage
            });
        }
    }

    async criarControleConsultaMensal(userId: string, assinaturaPlanoId: string) {
        const mesAtual = new Date().getMonth() + 1;
        const anoAtual = new Date().getFullYear();
        const existeControle = await prisma.controleConsultaMensal.findUnique({
            where: {
                UserId_AssinaturaPlanoId_MesReferencia_AnoReferencia: {
                    UserId: userId,
                    AssinaturaPlanoId: assinaturaPlanoId,
                    MesReferencia: mesAtual,
                    AnoReferencia: anoAtual
                }
            }
        });
        if (existeControle) {
            throw new Error('Já existe um controle de consultas para este mês e assinatura.');
        }
        // Criação do controle de consultas mensal
        await prisma.controleConsultaMensal.create({
            data: {
                UserId: userId,
                AssinaturaPlanoId: assinaturaPlanoId,
                MesReferencia: mesAtual,
                AnoReferencia: anoAtual,
                // Outros campos necessários
            },
        });
    }

    /**
     * Retorna a consulta em andamento do psicólogo (Status = 'Andamento' e horário atual)
     */
    async consultaEmAndamento(psicologoId: string, res: Response): Promise<Response> {
        const nowBr = dayjs().tz('America/Sao_Paulo');
        // Busca todas as consultas agendadas ou em andamento
        // IMPORTANTE: NÃO inclui 'Agendada' - apenas 'Reservado' ou 'Andamento' (consultas confirmadas)
        const consultasRaw = await prisma.consulta.findMany({
            where: {
                PsicologoId: psicologoId,
                Status: { in: ['Reservado', 'EmAndamento'] },
                Date: { lte: nowBr.toDate() }
            },
            orderBy: [
                { Date: 'asc' },
                { Time: 'asc' }
            ],
            include: {
                Paciente: {
                    select: {
                        Id: true,
                        Nome: true,
                        Role: true,
                        Email: true
                    }
                },
                Psicologo: {
                    select: {
                        Id: true,
                        Nome: true,
                        Email: true,
                        Images: { select: { Url: true } }
                    }
                },
                Agenda: true,
                ReservaSessao: {
                    select: {
                        Id: true,
                        AgoraChannel: true,
                        AgoraTokenPsychologist: true,
                        Status: true
                    }
                }
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
                return res.status(200).json({
                    success: true,
                    data: consulta
                });
            }
        }
        return res.status(200).json({
            success: true,
            message: 'Nenhuma consulta em andamento no momento.',
            data: null
        });
    }
}