import { Request, Response } from "express";
import { IReservationService } from '../interfaces/reservation.interface';
import { IUserService } from '../interfaces/user.interface';
import { IScheduleService } from '../interfaces/schedule.interface';
import { ROLES } from '../constants/roles.constants';
import { MulterRequest } from '../types/multerRequest';
import prisma from '../prisma/client';
import { AgendaStatus, $Enums, ConsultaStatus, Prisma } from '../generated/prisma';
import { ConsultaOrigemStatus } from '../constants/consultaStatus.constants';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { GoogleCalendarService } from '../services/googleCalendar.service';
import { EmailService } from '../services/email.service';
import { AgoraService } from '../services/agora.service';
import { deriveUidFromUuid } from '../utils/uid.util';
import { normalizeParamString, normalizeQueryString, normalizeParamStringRequired } from '../utils/validation.util';
dayjs.extend(utc);
dayjs.extend(timezone);

export class ReservationsController {
    private agoraService: AgoraService;

    constructor(
        private reservationService: IReservationService,
        private userService: IUserService,
        private scheduleService: IScheduleService,
    ) {
        this.agoraService = new AgoraService();
    }

    /**
     * Consulta agenda disponível de um psicólogo.
     * @param req Request do Express contendo psicologoId.
     * @param res Response do Express.
     * @returns Response com horários disponíveis ou erro.
     */
    async consultarAgenda(req: Request, res: Response): Promise<Response> {
        try {
            const psicologoId = normalizeParamStringRequired(req.params.psicologoId);
            if (!psicologoId) {
                return res.status(400).json({ error: 'ID do psicólogo é obrigatório.' });
            }
            const schedules = await this.scheduleService.getAvailableSchedules(psicologoId);
            return res.status(200).json(schedules);
        } catch (error) {
            console.error('Erro ao consultar agenda:', error);
            return res.status(500).json({ error: 'Erro interno no servidor.' });
        }
    }

    /**
     * Realiza reserva de horário para o usuário autenticado.
     * @param req Request do Express contendo id do agendamento.
     * @param res Response do Express.
     * @returns Response com reserva criada ou erro.
     */
    async reservarHorario(req: Request, res: Response): Promise<Response> {
        const { getClientIp } = await import('../utils/getClientIp.util');
        const { logConsultaCreate } = await import('../utils/auditLogger.util');
        const ipAddress = getClientIp(req);

        try {
            const scheduleId = normalizeParamStringRequired(req.params.id);
            if (!scheduleId) {
                return res.status(400).json({ error: 'ID de agendamento inválido' });
            }
            const userId = this.userService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Não autorizado' });
            }
            // Toda a lógica de reserva é delegada ao service
            const resultado = await this.reservationService.reservarHorario(scheduleId, userId);

            // Se houver mensagem de erro (conflito, indisponibilidade, etc), retorna 400
            if (resultado && typeof resultado === 'object' && 'message' in resultado && resultado.message && !resultado.reservation) {
                return res.status(400).json({
                    error: 'Horário indisponível',
                    message: resultado.message
                });
            }

            // Registra criação de consulta na auditoria
            if (resultado && typeof resultado === 'object' && 'reservation' in resultado) {
                const reservation = (resultado as { reservation: { Id?: string; PacienteId?: string; PsicologoId?: string; Date?: Date; Time?: string } | null }).reservation;
                // Só registra se a reservation foi criada com sucesso (não é null)
                if (reservation && reservation.Id) {
                    const dataHora = reservation.Date && reservation.Time
                        ? `${new Date(reservation.Date).toLocaleDateString('pt-BR')} ${reservation.Time}`
                        : 'Data não disponível';

                    await logConsultaCreate(
                        userId,
                        reservation.Id,
                        reservation.PacienteId || userId,
                        reservation.PsicologoId || '',
                        dataHora,
                        ipAddress
                    );
                }
            }

            return res.status(200).json(resultado);
        } catch (error) {
            console.error('Erro em reservarHorario:', error);
            // Verifica se o erro é relacionado a saldo insuficiente
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('saldo') || errorMessage.includes('saldo de consultas')) {
                return res.status(400).json({
                    error: 'Saldo insuficiente',
                    message: 'Você não possui saldo de consultas disponível. Por favor, adquira um plano ou consultas avulsas para continuar.'
                });
            }
            return res.status(500).json({ error: 'Erro interno no servidor' });
        }
    }

    /**
     * Cancela uma reserva de consulta.
     * @param req Request do Express contendo id da reserva.
     * @param res Response do Express.
     * @returns Response com resultado do cancelamento ou erro.
     */
    async cancelarReserva(req: Request, res: Response): Promise<Response> {
        const { getClientIp } = await import('../utils/getClientIp.util');
        const { logConsultaCancel } = await import('../utils/auditLogger.util');
        const ipAddress = getClientIp(req);

        try {
            const id = normalizeParamStringRequired(req.params.id);
            if (!id) {
                return res.status(400).json({ error: 'ID é obrigatório' });
            }
            const userId = this.userService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const user = await this.userService.verifyUserRole(userId, [ROLES.Patient, ROLES.Psychologist]);
            if (!user) {
                return res.status(403).json({ error: 'Somente pacientes ou psicólogos podem cancelar reservas.' });
            }

            const cancelamentoExistente = await prisma.cancelamentoSessao.findFirst({
                where: { SessaoId: id }
            });

            if (cancelamentoExistente) {
                return res.status(400).json({ error: 'Consulta já cancelada.' });
            }

            const motivo = normalizeQueryString(req.body?.motivo);
            const { protocolo, documentoUrl } = await this.reservationService.cancelReservation(
                id,
                userId,
                motivo,
                (req as MulterRequest).file
            );

            // Determina o tipo de cancelamento baseado no role do usuário
            const tipoCancelamento = user.Role === 'Patient' ? 'Paciente' : 'Psicologo';

            // Registra cancelamento na auditoria
            await logConsultaCancel(
                userId,
                id,
                motivo || 'Motivo não informado',
                protocolo || `CANCEL-${id}`,
                tipoCancelamento,
                ipAddress
            );

            return res.status(200).json({
                message: 'Reserva cancelada com sucesso.',
                protocolo,
                ...(documentoUrl && { documentoUrl })
            });
        } catch (error) {
            console.error('Erro ao cancelar reserva:', error);
            return res.status(500).json({ error: error instanceof Error ? error.message : 'Erro interno no servidor.' });
        }
    }

    /**
     * Reagenda uma reserva de consulta.
     * @param req Request do Express contendo idAntiga e idNova.
     * @param res Response do Express.
     * @returns Response com resultado do reagendamento ou erro.
     */
    async reagendarReserva(req: Request, res: Response): Promise<Response> {
        try {
            // Suporta payloads vindos do front: { idAntiga: { idAntiga, idNova }, idNova }
            let idAntiga = req.body.idAntiga;
            let idNova = req.body.idNova;
            // Se idAntiga for objeto, extrai os valores
            if (idAntiga && typeof idAntiga === 'object') {
                idNova = idAntiga.idNova;
                idAntiga = idAntiga.idAntiga;
            }
            console.log('Reagendamento solicitado:', { idAntiga, idNova });

            const userId = this.userService.getLoggedUserId(req);
            if (!userId || typeof userId !== 'string') {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const user = await this.userService.verifyUserIsPatient(userId);
            if (!user) {
                return res.status(403).json({ error: 'Somente pacientes podem reagendar reservas.' });
            }
            const reservation = await this.reservationService.fetchReservationById(idAntiga);
            if (!reservation) {
                return res.status(404).json({ error: 'Reserva antiga não encontrada.' });
            }

            // Verifica se há cancelamento por força maior aprovado para esta consulta
            const cancelamentoForcaMaior = await prisma.cancelamentoSessao.findFirst({
                where: {
                    SessaoId: idAntiga,
                    Status: 'Deferido',
                    Motivo: {
                        contains: 'força maior',
                        mode: 'insensitive'
                    }
                }
            });

            const isForcaMaiorAprovada = !!cancelamentoForcaMaior;

            // Verificação do prazo legal de 24h (exceto se for força maior aprovada)
            if (!isForcaMaiorAprovada) {
                const diffHours = dayjs(reservation.Date).diff(dayjs(), 'hour');
                console.log('diffHours:', diffHours, 'reservation.Date:', reservation.Date, 'now:', dayjs().toISOString());
                if (diffHours < 24) {
                    console.log('Motivo 400: Menos de 24h para reagendamento');
                    return res.status(400).json({ error: 'Reservas só podem ser reagendadas com no mínimo 24 horas de antecedência.' });
                }
            } else {
                console.log('✅ Reagendamento permitido: cancelamento por força maior aprovado');
            }
            // Atualiza status para 'Reagendada' em Consulta, Agenda, ReservaSessao
            await this.reservationService.reagendarStatus(idAntiga);

            // Busca dados da nova agenda ANTES de criar a reserva para emitir evento
            const novaAgenda = await prisma.agenda.findUnique({
                where: { Id: idNova },
                include: {
                    Psicologo: {
                        select: {
                            Id: true,
                            Nome: true,
                        }
                    }
                }
            });

            if (!novaAgenda) {
                return res.status(404).json({ error: 'Agenda não encontrada.' });
            }

            // Valida se a agenda está disponível
            if (novaAgenda.Status !== 'Disponivel') {
                return res.status(400).json({ error: 'A agenda selecionada não está disponível.' });
            }

            // Realiza novo agendamento SEM debitar saldo (manterSaldo = true)
            // Reutiliza o saldo já debitado da reserva antiga, apenas transfere o CicloPlanoId
            const resultado = await this.reservationService.reservarHorarioComSaldo(
                idNova,
                userId,
                true, // manterSaldo = true (não debita, reutiliza saldo já debitado)
                idAntiga // reservaAntigaId (para transferir CicloPlanoId)
            );

            // Se for força maior aprovada, prorroga expiração por 30 dias
            if (isForcaMaiorAprovada && resultado.reservation) {
                try {
                    // Busca a consulta antiga para pegar o CicloPlanoId ou ControleConsultaMensal
                    const consultaAntiga = await prisma.consulta.findUnique({
                        where: { Id: idAntiga },
                        include: {
                            CicloPlano: true
                        }
                    });

                    if (consultaAntiga?.CicloPlanoId) {
                        // Prorroga CicloPlano: adiciona 30 dias à data de criação
                        const cicloPlano = await prisma.cicloPlano.findUnique({
                            where: { Id: consultaAntiga.CicloPlanoId }
                        });

                        if (cicloPlano) {
                            const novaDataValidade = new Date(cicloPlano.CreatedAt);
                            novaDataValidade.setDate(novaDataValidade.getDate() + 30);

                            // Atualiza o CicloPlano com nova data de validade (via ControleConsultaMensal se existir)
                            const controleMensal = await prisma.controleConsultaMensal.findFirst({
                                where: { CicloPlanoId: cicloPlano.Id }
                            });

                            if (controleMensal) {
                                await prisma.controleConsultaMensal.update({
                                    where: { Id: controleMensal.Id },
                                    data: { Validade: novaDataValidade }
                                });
                                console.log(`✅ [REAGENDAMENTO] Expiração prorrogada por 30 dias para CicloPlano ${cicloPlano.Id} (força maior aprovada)`);
                            }
                        }
                    } else {
                        // Se não tem CicloPlano, busca ControleConsultaMensal diretamente
                        const controleMensal = await prisma.controleConsultaMensal.findFirst({
                            where: {
                                UserId: userId,
                                Status: 'Ativo'
                            },
                            orderBy: { CreatedAt: 'desc' }
                        });

                        if (controleMensal && controleMensal.Validade) {
                            const novaDataValidade = new Date(controleMensal.Validade);
                            novaDataValidade.setDate(novaDataValidade.getDate() + 30);

                            await prisma.controleConsultaMensal.update({
                                where: { Id: controleMensal.Id },
                                data: { Validade: novaDataValidade }
                            });
                            console.log(`✅ [REAGENDAMENTO] Expiração prorrogada por 30 dias para ControleConsultaMensal ${controleMensal.Id} (força maior aprovada)`);
                        }
                    }

                    // Prorroga também ConsultaAvulsa se existir (validade é calculada como DataCriacao + 30 dias)
                    // Como ConsultaAvulsa não tem campo Validade, não é possível prorrogar diretamente
                    // A validade é sempre DataCriacao + 30 dias, então não há necessidade de prorrogação
                    // O sistema já permite usar consultas avulsas mesmo que estejam "expirando" quando for força maior
                } catch (error) {
                    console.error('Erro ao prorrogar expiração após reagendamento (força maior):', error);
                    // Não bloqueia o reagendamento se falhar a prorrogação
                }
            }

            // Busca dados completos do paciente e psicólogo para emails e Google Calendar
            const paciente = await prisma.user.findUnique({
                where: { Id: userId },
                select: { Nome: true, Email: true }
            });

            const psicologo = await prisma.user.findUnique({
                where: { Id: novaAgenda.PsicologoId || '' },
                select: { Nome: true, Email: true }
            });

            // Cria evento no Google Calendar (seguindo o mesmo fluxo do agendamento normal)
            if (paciente && novaAgenda.Data && novaAgenda.Horario) {
                try {
                    const calendarService = new GoogleCalendarService();
                    const event = await calendarService.createEvent('primary', {
                        pacienteNome: paciente.Nome,
                        psicologoNome: psicologo?.Nome,
                        emailPaciente: paciente.Email,
                        emailPsicologo: psicologo?.Email,
                        dataConsulta: novaAgenda.Data,
                        horario: novaAgenda.Horario,
                    });

                    // Atualiza o GoogleEventId na consulta
                    if (event && event.id && resultado.reservation?.Id) {
                        await prisma.consulta.update({
                            where: { Id: resultado.reservation.Id },
                            data: { GoogleEventId: event.id },
                        });
                    }
                } catch (calendarError) {
                    console.error('Erro ao criar evento no Google Calendar durante reagendamento:', calendarError);
                    // Não bloqueia o reagendamento se falhar o Google Calendar
                }
            }

            // Envia emails de confirmação (seguindo o mesmo fluxo do agendamento normal)
            if (paciente && psicologo && novaAgenda.Data && novaAgenda.Horario) {
                try {
                    const emailService = new EmailService();

                    // Email para o paciente
                    await emailService.send({
                        to: paciente.Email,
                        subject: 'Confirmação de Reagendamento',
                        htmlTemplate: 'confirmAppointment',
                        templateData: {
                            pacienteNome: paciente.Nome,
                            psicologoNome: psicologo.Nome,
                            data: novaAgenda.Data,
                            horario: novaAgenda.Horario,
                        },
                    });

                    // Email para o psicólogo
                    await emailService.send({
                        to: psicologo.Email,
                        subject: 'Consulta Reagendada',
                        htmlTemplate: 'confirmAppointment',
                        templateData: {
                            pacienteNome: paciente.Nome,
                            psicologoNome: psicologo.Nome,
                            data: novaAgenda.Data,
                            horario: novaAgenda.Horario,
                        },
                    });
                } catch (emailError) {
                    console.error('Erro ao enviar emails durante reagendamento:', emailError);
                    // Não bloqueia o reagendamento se falhar o envio de emails
                }
            }

            // Emite notificação após criar a nova reserva
            if (resultado.reservation && novaAgenda.Data && novaAgenda.Horario) {
                const dataFormatada = `${require('dayjs')(novaAgenda.Data).format('DD/MM/YYYY')} às ${novaAgenda.Horario}`;
                await this.reservationService.websocketNotificationService.emitToUser(
                    userId,
                    'consulta_reagendada',
                    `Sua consulta foi reagendada para ${dataFormatada}.`
                );
            }

            return res.status(200).json({
                message: 'Consulta reagendada com sucesso.',
                reservation: resultado.reservation,
                updatedAgenda: resultado.updatedAgenda
            });
        } catch (error) {
            console.error('Erro ao reagendar reserva:', error);
            return res.status(500).json({ error: 'Erro interno no servidor.' });
        }
    }

    /**
     * Lista todas as reservas do usuário autenticado.
     * @param req Request do Express.
     * @param res Response do Express.
     * @returns Response com lista de reservas ou erro.
     */
    async listarReservas(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.userService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const reservations = await this.reservationService.listReservations(userId);
            return res.status(200).json(reservations);
        } catch (error) {
            console.error('Erro ao listar reservas:', error);
            return res.status(500).json({ error: 'Erro interno no servidor.' });
        }
    }

    /**
     * Lista reservas completas e futuras do usuário autenticado.
     * @param req Request do Express.
     * @param res Response do Express.
     * @returns Response com reservas ou erro.
     */
    async listarReservasCompletasEFuturas(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.userService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const reservations = await this.reservationService.listCompletedAndFutureReservations(userId);
            return res.status(200).json(reservations);
        } catch (error) {
            console.error('Erro ao listar reservas completas e futuras:', error);
            return res.status(500).json({ error: 'Erro interno no servidor.' });
        }
    }

    /**
     * Atualiza reservas completadas.
     * @param req Request do Express.
     * @param res Response do Express.
     * @returns Response com resultado da atualização ou erro.
     */
    async updateCompletedReservations(req: Request, res: Response): Promise<Response> {
        try {
            await this.reservationService.updateCompletedReservations();
            return res.status(200).json({ message: 'Reservas atualizadas com sucesso.' });
        } catch (error) {
            console.error('Erro ao atualizar reservas completadas:', error);
            return res.status(500).json({ error: 'Erro interno no servidor.' });
        }
    }

    /**
     * Cancela reserva automaticamente (usado por tarefas agendadas).
     * @param req Request do Express contendo reservationId, pacienteId, psicologoId.
     * @param res Response do Express.
     * @returns Response com resultado do cancelamento ou erro.
     */
    async cancelarReservaAutomatico(req: Request, res: Response): Promise<Response> {
        try {
            const { reservationId, pacienteId, psicologoId } = req.body;

            if (!reservationId || !pacienteId || !psicologoId) {
                return res.status(400).json({ error: 'ID da reserva, pacienteId e psicologoId são obrigatórios.' });
            }

            await this.reservationService.cancelReservationAutomatic(reservationId, pacienteId, psicologoId);
            return res.status(200).json({
                message: 'Reserva cancelada automaticamente com sucesso',
                reservationId
            });
        } catch (error) {
            console.error('Erro ao cancelar reserva automaticamente:', error);
            return res.status(500).json({ error: 'Erro interno no servidor.' });
        }
    }

    /**
     * Busca reserva por ID.
     * @param req Request do Express contendo id da reserva.
     * @param res Response do Express.
     * @returns Response com reserva ou erro.
     */
    async fetchReservasId(req: Request, res: Response): Promise<Response> {
        try {
            const id = normalizeParamStringRequired(req.params.id);
            if (!id) {
                return res.status(400).json({ error: 'ID da reserva é obrigatório.' });
            }

            const reservation = await this.reservationService.fetchReservationById(id);

            if (!reservation) {
                return res.status(404).json({ error: 'Consulta não encontrada' });
            }

            return res.status(200).json(reservation);
        } catch (error: unknown) {
            console.error('Erro ao buscar reserva por ID:', error);
            const errorMessage = error instanceof Error ? error.message : 'Erro interno no servidor.';

            // Se for erro de "não encontrado", retorna 404
            if (errorMessage.includes('não encontrada') || errorMessage.includes('não encontrado')) {
                return res.status(404).json({ error: errorMessage });
            }

            return res.status(500).json({ error: errorMessage });
        }
    }



    /**
     * Atualiza status de uma reserva.
     * @param req Request do Express contendo id e status.
     * @param res Response do Express.
     * @returns Response com resultado da atualização ou erro.
     */
    async updateStatus(req: Request, res: Response): Promise<Response> {
        try {
            const { id, status } = req.body;

            if (!id || !status) {
                return res.status(400).json({ error: 'ID e status são obrigatórios.' });
            }

            await this.reservationService.updateReservationStatus(id, status);
            return res.status(200).json({ message: 'Status atualizado com sucesso.' });
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            return res.status(500).json({ error: 'Erro interno no servidor.' });
        }
    }

    /**
     * Busca próxima consulta do usuário autenticado.
     * @param req Request do Express.
     * @param res Response do Express.
     * @returns Response com próxima consulta ou erro.
     */
    async proximaConsulta(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.userService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            // Validação: paciente precisa ter pelo menos uma assinatura ativa OU uma consulta avulsa ativa
            const assinaturasAtivas = await prisma.assinaturaPlano.findMany({
                where: {
                    UserId: userId,
                    Status: 'Ativo'
                }
            });
            const consultasAvulsasAtivas = await prisma.consultaAvulsa.findMany({
                where: {
                    PacienteId: userId,
                    Status: 'Ativa'
                }
            });
            if (assinaturasAtivas.length === 0 && consultasAvulsasAtivas.length === 0) {
                return res.status(200).json({ success: false, error: 'Nenhuma próxima consulta encontrada. É necessário possuir uma assinatura ativa ou uma consulta avulsa ativa.' });
            }

            // Usa timezone de Brasília para todas as comparações
            const nowBr = dayjs().tz('America/Sao_Paulo');
            const inicioDoDiaAtual = nowBr.startOf('day').toDate();
            const horaAtualBr = nowBr.format('HH:mm');
            console.log(`[ReservationsController] Horário usado na busca:`, nowBr.toISOString(), '| Timezone: America/Sao_Paulo', '| Hora atual:', horaAtualBr);

            // Busca consultas do dia atual ou futuras
            const consultas = await prisma.consulta.findMany({
                where: {
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
                    OR: [
                        {
                            PacienteId: userId,
                            Date: { gte: inicioDoDiaAtual }
                        },
                        {
                            PsicologoId: userId,
                            Date: { gte: inicioDoDiaAtual }
                        }
                    ]
                },
                orderBy: [
                    { Date: "asc" },
                    { Time: "asc" }
                ],
                include: {
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
                    Paciente: {
                        select: {
                            Nome: true,
                            Email: true,
                            AssinaturaPlanos: true // inclusão do relacionamento AssinaturaPlano
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
            // Inclui consultas em andamento que estão dentro da janela de 60 minutos
            const agoraTimestamp = nowBr.valueOf(); // Timestamp em milissegundos
            const consultasValidas = consultas
                .map(consulta => {
                    // Extrai a data no timezone de Brasília
                    const dataDate = dayjs(consulta.Date).tz('America/Sao_Paulo');
                    const dataStr = dataDate.format('YYYY-MM-DD');

                    // Monta data/hora completa para ordenação e comparação
                    const [hh, mm] = (consulta.Time || '00:00').split(':').map(Number);
                    const dataHoraCompleta = dayjs.tz(`${dataStr} ${hh}:${mm}:00`, 'America/Sao_Paulo');
                    const inicioConsultaTimestamp = dataHoraCompleta.valueOf();
                    const fimConsultaTimestamp = inicioConsultaTimestamp + (60 * 60 * 1000); // +60 minutos em ms

                    // Se a consulta está em andamento, verifica se está dentro da janela de 60 minutos
                    if (consulta.Status === 'EmAndamento') {
                        // Consulta em andamento: só inclui se ainda estiver dentro da janela de 60 minutos
                        if (agoraTimestamp >= inicioConsultaTimestamp && agoraTimestamp <= fimConsultaTimestamp) {
                            return { consulta, dataHora: dataHoraCompleta, emAndamento: true };
                        } else {
                            // Passou de 60 minutos, não inclui
                            return null;
                        }
                    }

                    // Para consultas 'Reservado', verifica se a data/hora completa já passou
                    // Usa timestamp para comparação precisa (não compara strings de horário)
                    if (inicioConsultaTimestamp <= agoraTimestamp) {
                        // A consulta já começou e não está em andamento (já passou do fim)
                    // Verifica se passou do fim da consulta (60 minutos após o início)
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

            const nextReservation = consultasValidas.length > 0 ? consultasValidas[0].consulta : null;

            // Validação extra: só retorna se o paciente tiver:
            // 1. Um PlanoCompra com status 'ativo', OU
            // 2. Um PlanoCompra cancelado mas com ciclos válidos (CreatedAt + 30 dias), OU
            // 3. Uma consulta avulsa ativa
            const temPlanoValido = nextReservation?.Paciente?.AssinaturaPlanos && Array.isArray(nextReservation.Paciente.AssinaturaPlanos) && (
                nextReservation.Paciente.AssinaturaPlanos.some((plano: { Status: string; Ciclos?: Array<{ Status: string; CreatedAt: Date; ConsultasDisponiveis: number }> }) => {
                    // Plano ativo
                    if (plano.Status === 'Ativo') {
                        return true;
                    }
                    // Plano cancelado mas com ciclo válido
                    if (plano.Status === 'Cancelado' && plano.Ciclos && Array.isArray(plano.Ciclos)) {
                        const agora = new Date();
                        return plano.Ciclos.some(ciclo => {
                            if (ciclo.Status !== 'Ativo' || ciclo.ConsultasDisponiveis <= 0 || !ciclo.CreatedAt) {
                                return false;
                            }
                            const dataCriacao = new Date(ciclo.CreatedAt);
                            const dataValidade = new Date(dataCriacao);
                            dataValidade.setDate(dataValidade.getDate() + 30);
                            return dataValidade >= agora;
                        });
                    }
                    return false;
                })
            );

            if (
                !nextReservation ||
                !nextReservation.Paciente ||
                (!temPlanoValido && consultasAvulsasAtivas.length === 0)
            ) {
                return res.status(200).json({ success: false, error: 'Nenhuma próxima consulta encontrada.' });
            }

            console.log('Próxima consulta encontrada:', nextReservation);
            // Adiciona o id da próxima consulta na resposta
            return res.status(200).json({ success: true, nextReservation, idProximaConsulta: nextReservation.Id });
        } catch (error) {
            console.log('Erro ao buscar próxima consulta:', error);
            console.error('Erro ao buscar próxima consulta:', error);
            return res.status(500).json({ error: 'Erro interno no servidor.' });
        }
    }

    /**
     * Lista consultas realizadas do usuário autenticado.
     * @param req Request do Express.
     * @param res Response do Express.
     * @returns Response com consultas realizadas ou erro.
     */
    async consultasRealizadas(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.userService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            // Buscar usuário logado
            const loggedUser = await prisma.user.findUnique({
                where: { Id: userId },
                select: { Id: true, Role: true }
            });

            if (!loggedUser) {
                return res.status(200).json({ success: false, error: 'Usuário não encontrado.' });
            }

            // Admin ou MANAGEMENT podem ver todas as consultas
            let whereClause: Prisma.ConsultaWhereInput;
            if (['Admin', 'MANAGEMENT'].includes(loggedUser.Role)) {
                whereClause = { Status: $Enums.ConsultaStatus.Realizada };
            } else {
                // Paciente ou psicólogo só podem ver suas próprias consultas
                whereClause = {
                    Status: $Enums.ConsultaStatus.Realizada,
                    OR: [
                        { PacienteId: userId },
                        { PsicologoId: userId }
                    ]
                };
            }

            const consultas = await prisma.consulta.findMany({
                where: whereClause,
                include: {
                    Psicologo: {
                        select: {
                            Id: true,
                            Nome: true,
                            Email: true,
                            Images: { select: { Url: true } }
                        }
                    },
                    Paciente: loggedUser.Role === 'Psychologist'
                        ? { select: { Nome: true } } // Não expõe email nem outros dados pessoais
                        : { select: { Nome: true, Email: true } },
                    Agenda: { select: { Data: true, Horario: true, DiaDaSemana: true, Status: true } },
                    ReservaSessao: { select: { AgoraChannel: true, Status: true } },
                },
                orderBy: { Date: 'desc' }
            });

            return res.status(200).json({ success: true, consultas });
        } catch (error) {
            console.error('Erro ao listar consultas realizadas:', error);
            return res.status(200).json({ success: false, error: 'Erro interno no servidor.' });
        }
    }

    /**
     * Lista consultas agendadas futuras do usuário autenticado.
     * @param req Request do Express.
     * @param res Response do Express.
     * @returns Response com consultas futuras ou erro.
     */
    async listarConsultasAgendadas(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.userService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            // Usa timezone de São Paulo para garantir comparação correta
            const nowBr = dayjs().tz('America/Sao_Paulo');
            const todayISO = nowBr.startOf('day').toDate();
            const dataAtualStr = nowBr.format('YYYY-MM-DD');
            const horaAtualBr = nowBr.format('HH:mm');
            const agoraTimestamp = nowBr.valueOf(); // Timestamp em milissegundos

            // Buscar todas as consultas com status 'Reservado' ou 'Andamento' e data >= hoje
            // IMPORTANTE: NÃO inclui 'Agendada' - apenas consultas confirmadas (Reservado) ou em andamento
            const todasConsultas = await prisma.consulta.findMany({
                where: {
                    Status: { in: [$Enums.ConsultaStatus.Reservado, $Enums.ConsultaStatus.EmAndamento] },
                    Date: { gte: todayISO }, // Inclui hoje e todas as datas futuras
                    OR: [
                        { PacienteId: userId },
                        { PsicologoId: userId }
                    ]
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
                    Paciente: { select: { Nome: true, Email: true } },
                    Agenda: { select: { Data: true, Horario: true, DiaDaSemana: true, Status: true } },
                    ReservaSessao: {
                        select: {
                            AgoraChannel: true,
                            Status: true,
                            PatientJoinedAt: true,
                            PsychologistJoinedAt: true
                        }
                    }
                    // CancelamentoSessao removido pois não existe no modelo
                }
            });

            // Processa e filtra consultas, construindo data/hora completa para comparação correta
            // Considera consulta "em andamento" se estiver dentro da janela de 1 hora do horário agendado
            // (independente do status - pode ser 'Reservado' ou 'Andamento')
            // FILTRO ADICIONAL: Remove consultas com status 'Agendada' que não devem aparecer
            const consultasProcessadas = todasConsultas
                .filter(consulta => {
                    // Exclui consultas com status 'Agendada'
                    const status = consulta.Status?.toString().toLowerCase() || '';
                    return status !== 'agendada' && status !== 'agendado';
                })
                .map(consulta => {
                    // Extrai apenas a data (YYYY-MM-DD) do campo Date no timezone de Brasília
                    const dataDate = dayjs(consulta.Date).tz('America/Sao_Paulo');
                    const dataStr = dataDate.format('YYYY-MM-DD');

                    // Combina data + horário para criar data/hora completa
                    const [hh, mm] = (consulta.Time || '00:00').split(':').map(Number);
                    const dataHoraCompleta = dayjs.tz(`${dataStr} ${hh}:${mm}:00`, 'America/Sao_Paulo');
                    const inicioConsultaTimestamp = dataHoraCompleta.valueOf();
                    const fimConsultaTimestamp = inicioConsultaTimestamp + (60 * 60 * 1000); // +60 minutos em ms

                    // Verifica se a consulta está dentro da janela de 60 minutos (em andamento)
                    // Considera em andamento se: agora >= início E agora <= fim (dentro dos 60 minutos de duração)
                    const estaEmAndamento = agoraTimestamp >= inicioConsultaTimestamp && agoraTimestamp <= fimConsultaTimestamp;

                    // Se está em andamento, retorna como tal
                    if (estaEmAndamento) {
                        return {
                            consulta,
                            dataHoraCompleta: dataHoraCompleta.toDate(),
                            emAndamento: true
                        };
                    }

                    // Para consultas futuras (não em andamento), verifica se a data/hora completa já passou
                    // Usa timestamp para comparação precisa (não compara strings de horário)
                    if (inicioConsultaTimestamp <= agoraTimestamp) {
                        // A consulta já começou e não está em andamento (já passou do fim)
                    // Verifica se passou do fim da consulta (60 minutos após o início)
                        if (agoraTimestamp > fimConsultaTimestamp) {
                            // Já passou do fim da consulta, não é válida
                            return null;
                        }
                        // Se ainda está dentro da janela mas não foi marcada como em andamento,
                        // pode ser um caso edge, mas ainda considera válida
                    }

                    // Se a data/hora completa é futura, é válida
                    return {
                        consulta,
                        dataHoraCompleta: dataHoraCompleta.toDate(),
                        emAndamento: false
                    };
                })
                .filter((item): item is { consulta: typeof todasConsultas[0]; dataHoraCompleta: Date; emAndamento: boolean } => item !== null);

            // Ordena por data/hora completa (mais próxima primeiro)
            // Consultas em andamento têm prioridade (aparecem primeiro)
            consultasProcessadas.sort((a, b) => {
                // Se uma está em andamento e a outra não, a em andamento vem primeiro
                if (a.emAndamento && !b.emAndamento) return -1;
                if (!a.emAndamento && b.emAndamento) return 1;
                // Caso contrário, ordena por data/hora
                return a.dataHoraCompleta.getTime() - b.dataHoraCompleta.getTime();
            });

            // Extrai apenas as consultas ordenadas
            const consultas = consultasProcessadas.map(item => item.consulta);

            // Separa consulta em andamento das outras
            const consultaEmAndamento = consultasProcessadas.find(item => item.emAndamento);
            const consultasFuturas = consultasProcessadas.filter(item => !item.emAndamento);

            // Debug: log das consultas encontradas
            console.log(`[ReservationsController] Total de consultas processadas: ${consultas.length}`);
            if (consultaEmAndamento) {
                console.log(`[ReservationsController] Consulta em andamento - Status: ${consultaEmAndamento.consulta.Status}, Date: ${consultaEmAndamento.consulta.Date}, Time: ${consultaEmAndamento.consulta.Time}`);
            }
            if (consultasFuturas.length > 0) {
                console.log(`[ReservationsController] Primeira consulta futura - Status: ${consultasFuturas[0].consulta.Status}, Date: ${consultasFuturas[0].consulta.Date}, Time: ${consultasFuturas[0].consulta.Time}`);
            }

            // Define consultaAtualEmAndamento (se houver consulta em andamento)
            const consultaAtualEmAndamento = consultaEmAndamento ? consultaEmAndamento.consulta : null;

            // Define nextReservation: sempre é a primeira consulta futura (não em andamento)
            // Se houver consulta em andamento, nextReservation é a primeira futura; senão, é a primeira de todas
            const nextReservation = consultasFuturas.length > 0 ? consultasFuturas[0].consulta : null;

            // Para consultaAtual, mantém compatibilidade: se houver em andamento, usa ela; senão, usa a próxima futura
            // Se não houver nenhuma consulta, retorna null (não retorna erro)
            const consultaAtual = consultaAtualEmAndamento || (consultasFuturas.length > 0 ? consultasFuturas[0].consulta : null);

            // As demais são consultas futuras (excluindo a que já foi usada como nextReservation se não houver em andamento)
            const futuras = consultaAtualEmAndamento
                ? consultasFuturas.map(item => item.consulta)
                : consultasFuturas.slice(1).map(item => item.consulta);

            return res.status(200).json({
                success: true,
                nextReservation, // Próxima consulta (em andamento ou primeira futura)
                consultaAtualEmAndamento, // Consulta em andamento (se houver)
                consultaAtual, // Mantém compatibilidade
                futuras,
                total: consultas.length
            });
        } catch (error) {
            console.error('Erro ao listar consultas agendadas:', error);
            return res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Erro interno no servidor.'
            });
        }
    }

    /**
     * Mostra a consulta do dia atual ou a próxima data disponível.
     * @param req Request do Express.
     * @param res Response do Express.
     * @returns Consulta do dia ou próxima disponível, ou mensagem de ausência.
     */
    async consultaDoDiaOuProxima(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.userService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            console.log(`Buscando consulta do dia ou próxima para o usuário ${userId}`);
            const now = dayjs();
            const todayISO = now.startOf('day').toDate();
            const nowTime = now.format('HH:mm');

            console.log(`Buscando consulta do dia ou próxima para o usuário ${userId} na data ${todayISO} e hora ${nowTime}`);
            // Consulta do dia atual
            const consultaHoje = await prisma.consulta.findFirst({
                where: {
                    Status: 'Reservado',
                    OR: [
                        { PacienteId: userId },
                        { PsicologoId: userId }
                    ],
                    Date: todayISO
                },
                orderBy: [
                    { Time: 'asc' }
                ],
                include: {
                    Psicologo: {
                        select: {
                            Id: true,
                            Nome: true,
                            Email: true,
                            Images: { select: { Url: true } }
                        }
                    },
                    Paciente: { select: { Nome: true, Email: true } },
                    Agenda: { select: { Data: true, Horario: true, DiaDaSemana: true, Status: true } },
                    ReservaSessao: { select: { AgoraChannel: true, Status: true } },
                }
            });

            if (consultaHoje) {
                return res.status(200).json({ success: true, consulta: consultaHoje });
            }

            // Próxima consulta futura
            const proximaConsulta = await prisma.consulta.findFirst({
                where: {
                    Status: 'Reservado',
                    OR: [
                        { PacienteId: userId },
                        { PsicologoId: userId }
                    ],
                    Date: { gt: todayISO }
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
                            Email: true,
                            Images: { select: { Url: true } }
                        }
                    },
                    Paciente: { select: { Nome: true, Email: true } },
                    Agenda: { select: { Data: true, Horario: true, DiaDaSemana: true, Status: true } },
                    ReservaSessao: { select: { AgoraChannel: true, Status: true } },
                }
            });

            if (proximaConsulta) {
                return res.status(200).json({ success: true, proximaConsulta });
            }

            return res.status(200).json({ success: false, error: 'Não existem consultas agendadas para hoje ou futuras.' });
        } catch (error) {
            console.error('Erro ao buscar consulta do dia ou próxima:', error);
            return res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Erro interno no servidor.' });
        }
    }

    /**
     * Busca token pelo channel para acesso à sala de vídeo.
     * @param req Request do Express contendo channel como parâmetro.
     * @param res Response do Express.
     * @returns Response com token, uid e role ou erro.
     */
    async getTokenByChannel(req: Request, res: Response): Promise<Response> {
        try {
            const channel = normalizeParamString(req.params.channel);

            if (!channel) {
                return res.status(400).json({ error: 'Channel é obrigatório' });
            }

            const userId = this.userService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            console.log(`[ReservationsController] Buscando token para channel: ${channel}, userId: ${userId}`);

            type ReservaSessaoComConsulta = Prisma.ReservaSessaoGetPayload<{ include: { Consulta: true } }>;
            const reservaSessao = await prisma.reservaSessao.findFirst({
                where: { AgoraChannel: channel },
                include: {
                    Consulta: true
                }
            }) as ReservaSessaoComConsulta | null;

            if (!reservaSessao) {
                return res.status(404).json({
                    error: 'Reserva não encontrada para este channel',
                    message: 'A consulta não foi encontrada. Por favor, verifique se a consulta ainda está agendada.'
                });
            }

            // Verifica se a consulta está concluída ou cancelada
            if (reservaSessao.Consulta?.Status === $Enums.ConsultaStatus.Realizada) {
                return res.status(410).json({
                    error: 'Consulta já foi concluída',
                    message: 'Esta consulta já foi finalizada. Os tokens de acesso foram removidos por segurança.',
                    code: 'CONSULTA_CONCLUIDA'
                });
            }

            if (reservaSessao.Consulta?.Status === 'Cancelado') {
                return res.status(410).json({
                    error: 'Consulta foi cancelada',
                    message: 'Esta consulta foi cancelada. Não é possível acessar a sala de vídeo.',
                    code: 'CONSULTA_CANCELADA'
                });
            }

            // Verifica se os tokens foram limpos (consulta concluída mas status não atualizado ainda)
            // IMPORTANTE: Se PatientId ou PsychologistId estiverem vazios, preenche a partir da Consulta
            let isPatient = reservaSessao.PatientId === userId;
            let isPsychologist = reservaSessao.PsychologistId === userId;

            // Se não encontrou correspondência, verifica na Consulta e atualiza se necessário
            if (!isPatient && !isPsychologist && reservaSessao.Consulta) {
                const consultaPatientId = reservaSessao.Consulta.PacienteId;
                const consultaPsychologistId = reservaSessao.Consulta.PsicologoId;

                if (consultaPatientId === userId) {
                    isPatient = true;
                    console.log(`[ReservationsController] ⚠️ PatientId estava vazio, preenchendo a partir da Consulta: ${userId}`);
                } else if (consultaPsychologistId === userId) {
                    isPsychologist = true;
                    console.log(`[ReservationsController] ⚠️ PsychologistId estava vazio, preenchendo a partir da Consulta: ${userId}`);
                }
            }

            if (!isPatient && !isPsychologist) {
                return res.status(403).json({
                    error: 'Acesso negado',
                    message: 'Você não tem permissão para acessar esta sala. Apenas o paciente e o psicólogo podem acessar.'
                });
            }

            // Obtém o ID da consulta
            const consultationId = reservaSessao.ConsultaId;

            // Verifica se a sala está aberta usando ConsultaRoomService
            const { ConsultaRoomService } = await import('../services/consultaRoom.service');
            const roomService = new ConsultaRoomService();
            const isRoomOpen = await roomService.isRoomOpen(consultationId);

            if (!isRoomOpen) {
                return res.status(403).json({
                    error: 'Acesso negado',
                    message: 'Esta sala foi fechada. Você não tem permissão para acessar.',
                    code: 'ROOM_CLOSED'
                });
            }

            // Verifica se a consulta está concluída (tokens limpos indicam consulta finalizada)
            const consultaStatus = reservaSessao.Consulta?.Status as string | undefined;
            const expectedToken = isPatient ? reservaSessao.AgoraTokenPatient : reservaSessao.AgoraTokenPsychologist;

            if (!expectedToken && consultaStatus === 'Realizada') {
                return res.status(403).json({
                    error: 'Acesso negado',
                    message: 'Os tokens de acesso desta consulta foram removidos porque a consulta já foi finalizada. Você não tem permissão para acessar.',
                    code: 'TOKENS_EXPIRADOS'
                });
            }

            // Gera UIDs para ambos os participantes baseado nos seus IDs (se ainda não existirem)
            // IMPORTANTE: Gera UIDs ANTES de validar janela de tempo, pois precisamos do currentUserUid
            let patientUid = reservaSessao.Uid;
            let psychologistUid = reservaSessao.UidPsychologist;

            // Gera UIDs se ainda não existirem
            if (!patientUid && reservaSessao.PatientId) {
                try {
                    patientUid = deriveUidFromUuid(reservaSessao.PatientId);
                } catch (error) {
                    console.error(`[ReservationsController] Erro ao gerar UID do paciente: ${error}`);
                }
            }
            if (!psychologistUid && reservaSessao.PsychologistId) {
                try {
                    psychologistUid = deriveUidFromUuid(reservaSessao.PsychologistId);
                } catch (error) {
                    console.error(`[ReservationsController] Erro ao gerar UID do psicólogo: ${error}`);
                }
            }

            // Define o role e UID baseado no usuário autenticado
            const currentRole: 'patient' | 'psychologist' = isPatient ? 'patient' : 'psychologist';
            const currentUserUid = isPatient ? patientUid : psychologistUid;

            // Valida que o UID do usuário atual existe
            if (!currentUserUid) {
                const userType = isPatient ? 'paciente' : 'psicólogo';
                return res.status(500).json({ error: `Erro ao gerar UID do ${userType}` });
            }

            // Garante que ambos os tokens existam (sem regenerar os já existentes)
            let token: string;
            try {
                const { ensureAgoraTokensForConsulta } = await import('../services/agoraToken.service');
                const { getClientIp } = await import('../utils/getClientIp.util');
                const tokenResult = await ensureAgoraTokensForConsulta(prisma, consultationId, {
                    actorId: userId,
                    actorIp: getClientIp(req),
                    source: 'room',
                });
                token = currentRole === 'patient'
                    ? tokenResult.patientToken
                    : tokenResult.psychologistToken;
            } catch (error) {
                console.error(`[ReservationsController] ❌ Erro ao garantir tokens para ${currentRole}:`, error);
                return res.status(500).json({
                    error: 'Erro ao garantir tokens de acesso',
                    message: error instanceof Error ? error.message : 'Erro desconhecido ao garantir tokens',
                    code: 'TOKEN_GENERATION_ERROR'
                });
            }

            // Prepara os dados para atualização
            const updateData: {
                Uid?: number | null;
                UidPsychologist?: number | null;
                AgoraTokenPatient?: string | null;
                AgoraTokenPsychologist?: string | null;
                PatientJoinedAt?: Date;
                PsychologistJoinedAt?: Date;
                PatientId?: string;
                PsychologistId?: string;
            } = {};

            // IMPORTANTE: Atualiza PatientId e PsychologistId se estiverem vazios
            // Isso garante que os IDs sejam preenchidos no exato momento que cada um entra na room
            if (isPatient && (!reservaSessao.PatientId || reservaSessao.PatientId !== userId)) {
                updateData.PatientId = userId;
                console.log(`[ReservationsController] ✅ Atualizando PatientId: ${userId}`);
            }
            if (isPsychologist && (!reservaSessao.PsychologistId || reservaSessao.PsychologistId !== userId)) {
                updateData.PsychologistId = userId;
                console.log(`[ReservationsController] ✅ Atualizando PsychologistId: ${userId}`);
            }

            // Atualiza os UIDs se ainda não existirem
            if (!reservaSessao.Uid && patientUid) {
                updateData.Uid = patientUid;
            }
            if (!reservaSessao.UidPsychologist && psychologistUid) {
                updateData.UidPsychologist = psychologistUid;
            }

            // Atualiza o token e timestamp
            // IMPORTANTE: Sempre atualiza o token no banco para garantir que está persistido
            // Usa horário de Brasília para timestamps
            const { nowBrasiliaDate } = await import('../utils/timezone.util');

            if (isPatient) {
                updateData.AgoraTokenPatient = token;
                updateData.PatientJoinedAt = nowBrasiliaDate();
                console.log(`[ReservationsController] 📹 Paciente entrou na sala: ConsultaId=${consultationId}, PatientId=${userId}, Uid=${currentUserUid}`);
            } else if (isPsychologist) {
                updateData.AgoraTokenPsychologist = token;
                updateData.PsychologistJoinedAt = nowBrasiliaDate();
                console.log(`[ReservationsController] 📹 Psicólogo entrou na sala: ConsultaId=${consultationId}, PsychologistId=${userId}, Uid=${currentUserUid}`);
            }

            // Só atualiza se houver algo para atualizar
            if (Object.keys(updateData).length > 0) {
                await prisma.reservaSessao.update({
                    where: { Id: reservaSessao.Id },
                    data: updateData
                });
            }

            // ℹ️ NOTA: O status EmAndamento é atualizado automaticamente pelo job startConsultation
            // no horário exato do ScheduledAt, independente de quem entrou ou não.
            // Não é necessário atualizar aqui quando alguém entra.

            // IMPORTANTE: Sempre registra entrada no Redis, mesmo se o token já existir
            // Isso garante que o token esteja disponível no Redis para validações futuras
            try {
                await roomService.registerParticipantJoin(consultationId, currentRole, token);
                console.log(`[ReservationsController] ✅ Token registrado no Redis para ${currentRole}`);
            } catch (redisError) {
                // Não falha a requisição se o Redis não estiver disponível
                console.warn(`[ReservationsController] ⚠️ Erro ao registrar token no Redis (não crítico):`, redisError);
            }

            // Logs detalhados para debug de áudio e vídeo
            console.log(`[ReservationsController] ===== ENTRADA NA SALA =====`);
            console.log(`[ReservationsController] Role: ${currentRole}`);
            console.log(`[ReservationsController] ConsultaId: ${reservaSessao.ConsultaId}`);
            console.log(`[ReservationsController] Channel: ${channel}`);
            console.log(`[ReservationsController] Uid: ${currentUserUid}`);
            console.log(`[ReservationsController] Token gerado: ${token ? '✅' : '❌'}`);
            console.log(`[ReservationsController] PatientId: ${reservaSessao.PatientId || 'VAZIO'}`);
            console.log(`[ReservationsController] PsychologistId: ${reservaSessao.PsychologistId || 'VAZIO'}`);
            console.log(`[ReservationsController] PatientJoinedAt: ${reservaSessao.PatientJoinedAt || 'Nunca'}`);
            console.log(`[ReservationsController] PsychologistJoinedAt: ${reservaSessao.PsychologistJoinedAt || 'Nunca'}`);
            console.log(`[ReservationsController] ============================`);

            return res.json({
                token,
                uid: currentUserUid,
                role: currentRole,
                channel,
                participants: {
                    patient: {
                        uid: patientUid
                    },
                    psychologist: {
                        uid: psychologistUid
                    }
                }
            });
        } catch (error) {
            console.error('[ReservationsController] Erro ao buscar token pelo channel:', error);
            return res.status(500).json({ error: 'Erro interno no servidor' });
        }
    }

    /**
     * Reagenda uma sessão pelo psicólogo dentro da sala (problema do psicólogo)
     * Status: "ReagendadaPsicologoForaPrazo"
     * Regras: Devolve sessão ao paciente, NÃO faz repasse financeiro
     * 
     * IMPORTANTE: Busca a partir da ReservaSessao pelo AgendaId, ReservaSessaoId ou ConsultaId
     */
    async reagendarPsicologoSala(req: Request, res: Response): Promise<Response> {
        const { getClientIp } = await import('../utils/getClientIp.util');
        const { logConsultaCancel } = await import('../utils/auditLogger.util');
        const ipAddress = getClientIp(req);

        try {
            const id = normalizeParamStringRequired(req.params.id);
            if (!id) {
                return res.status(400).json({ error: 'ID é obrigatório' });
            }
            const userId = this.userService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            // Verifica se é psicólogo
            const user = await this.userService.verifyUserRole(userId, [ROLES.Psychologist]);
            if (!user) {
                return res.status(403).json({ error: 'Somente psicólogos podem reagendar sessões na sala.' });
            }

            const { motivo, observacao } = req.body;
            const agendaId = req.body.agendaId || id; // AgendaId pode vir do body ou params
            const reservaSessaoId = req.body.reservaSessaoId || ''; // ID da ReservaSessao se fornecido
            const consultaId = req.body.consultaId || ''; // ID da Consulta se fornecido

            if (!motivo) {
                return res.status(400).json({ error: 'Motivo é obrigatório' });
            }

            // BUSCA PRIMÁRIA: ReservaSessao a partir do AgendaId, ReservaSessaoId ou ConsultaId
            let reservaSessao = null;

            if (reservaSessaoId) {
                // Busca pela ReservaSessaoId
                reservaSessao = await prisma.reservaSessao.findUnique({
                    where: { Id: reservaSessaoId },
                    include: {
                        Consulta: {
                            include: {
                                ReservaSessao: true,
                                Agenda: true,
                                CicloPlano: true,
                                Paciente: {
                                    select: { Id: true, Nome: true, Email: true }
                                },
                                Psicologo: {
                                    select: { Id: true, Nome: true, Email: true }
                                },
                            }
                        }
                    }
                });
            } else if (agendaId) {
                // Busca pelo AgendaId (campo da ReservaSessao)
                reservaSessao = await prisma.reservaSessao.findFirst({
                    where: { AgendaId: agendaId },
                    include: {
                        Consulta: {
                            include: {
                                ReservaSessao: true,
                                Agenda: true,
                                CicloPlano: true,
                                Paciente: {
                                    select: { Id: true, Nome: true, Email: true }
                                },
                                Psicologo: {
                                    select: { Id: true, Nome: true, Email: true }
                                },
                            }
                        }
                    }
                });
            } else if (consultaId) {
                // Busca pelo ConsultaId
                reservaSessao = await prisma.reservaSessao.findUnique({
                    where: { ConsultaId: consultaId },
                    include: {
                        Consulta: {
                            include: {
                                ReservaSessao: true,
                                Agenda: true,
                                CicloPlano: true,
                                Paciente: {
                                    select: { Id: true, Nome: true, Email: true }
                                },
                                Psicologo: {
                                    select: { Id: true, Nome: true, Email: true }
                                },
                            }
                        }
                    }
                });
            }

            if (!reservaSessao || !reservaSessao.Consulta) {
                return res.status(404).json({ error: 'ReservaSessao não encontrada' });
            }

            const consulta = reservaSessao.Consulta;
            const consultaIdToUse = consulta.Id;

            // Verifica se o psicólogo é o responsável (pode ser pelo Consulta ou ReservaSessao)
            const psicologoId = consulta.PsicologoId || reservaSessao.PsychologistId;
            if (psicologoId !== userId) {
                return res.status(403).json({ error: 'Apenas o psicólogo responsável pode reagendar esta sessão.' });
            }

            // Verifica se a sala está aberta (só pode reagendar dentro da sala)
            const { ConsultaRoomService } = await import('../services/consultaRoom.service');
            const roomService = new ConsultaRoomService();
            const isRoomOpen = await roomService.isRoomOpen(consultaIdToUse);

            if (!isRoomOpen) {
                return res.status(403).json({
                    error: 'Ação não permitida',
                    message: 'O reagendamento só pode ser feito dentro da sala ativa. A sala já foi encerrada.',
                    code: 'ROOM_CLOSED'
                });
            }

            // Verifica se a consulta já está em um status que não permite reagendamento
            const statusAtual = consulta.Status as string;
            const statusBloqueados = ['Realizada', 'CanceladaNaoCumprimentoContratualPaciente', 'CanceladaNaoCumprimentoContratualPsicologo'];
            if (statusBloqueados.includes(statusAtual)) {
                return res.status(400).json({
                    error: 'Ação não permitida',
                    message: `Não é possível reagendar uma consulta com status: ${statusAtual}`
                });
            }

            // Upload de documento se houver
            let documentoUrl: string | undefined;
            const file = (req as MulterRequest).file;
            if (file) {
                const { uploadFile } = await import('../services/storage.services');
                const filePath = `cancelamentos/${reservaSessao.Id}/${Date.now()}-${file.originalname}`;
                const data = await uploadFile(filePath, file.buffer, {
                    contentType: file.mimetype,
                });
                documentoUrl = data.fullUrl;
            }

            // Usa ConsultaStatusService para atualizar status (garante todas as regras de negócio)
            const { ConsultaStatusService } = await import('../services/consultaStatus.service');
            const statusService = new ConsultaStatusService();

            // Atualiza status usando o serviço (que já cuida de devolver sessão para CicloPlano)
            await statusService.atualizarStatus({
                consultaId: consultaIdToUse,
                novoStatus: 'ReagendadaPsicologoForaPrazo' as ConsultaStatus,
                origem: ConsultaOrigemStatus.Psicologo,
                telaGatilho: 'ModuloRealizacaoSessao',
                usuarioId: userId,
            });

            // Atualiza status da ReservaSessao, Agenda e trata consultas avulsas + limpa tokens
            await prisma.$transaction(async (tx) => {
                // Atualiza status da ReservaSessao e limpa tokens do Agora
                await tx.reservaSessao.update({
                    where: { Id: reservaSessao.Id },
                    data: {
                        Status: AgendaStatus.Reagendada,
                        AgoraTokenPatient: null,
                        AgoraTokenPsychologist: null,
                        Uid: null,
                        UidPsychologist: null,
                    },
                });

                // Atualiza status da Agenda (se existir)
                if (consulta.Agenda) {
                    await tx.agenda.update({
                        where: { Id: consulta.Agenda.Id },
                        data: { Status: AgendaStatus.Reagendada, PacienteId: null },
                    });
                } else if (reservaSessao.AgendaId) {
                    // Se não tem Agenda no relacionamento, tenta atualizar pelo AgendaId da ReservaSessao
                    await tx.agenda.update({
                        where: { Id: reservaSessao.AgendaId },
                        data: { Status: AgendaStatus.Reagendada, PacienteId: null },
                    });
                }

                // Se não tem CicloPlano mas tem PacienteId, trata como consulta avulsa (ControleConsultaMensal)
                const pacienteId = consulta.PacienteId || reservaSessao.PatientId;
                if (!consulta.CicloPlano && pacienteId) {
                    const controle = await tx.controleConsultaMensal.findFirst({
                        where: { UserId: pacienteId },
                        orderBy: { CreatedAt: 'desc' },
                    });
                    if (controle) {
                        await tx.controleConsultaMensal.update({
                            where: { Id: controle.Id },
                            data: {
                                ConsultasDisponiveis: {
                                    increment: 1,
                                },
                            },
                        });
                        console.log(`✅ [reagendarPsicologoSala] 1 sessão devolvida ao ControleConsultaMensal para paciente ${pacienteId}`);
                    }
                }

                // Cria registro de auditoria/cancelamento
                // SessaoId deve ser o ConsultaId (conforme schema do CancelamentoSessao)
                await tx.cancelamentoSessao.create({
                    data: {
                        SessaoId: consultaIdToUse,
                        AutorId: userId,
                        Motivo: motivo,
                        PacienteId: consulta.PacienteId || reservaSessao.PatientId || '',
                        PsicologoId: consulta.PsicologoId || reservaSessao.PsychologistId || '',
                        Horario: consulta.Agenda?.Horario || consulta.Time || '',
                        LinkDock: documentoUrl || null,
                        Status: 'Deferido',
                        Tipo: 'Psicologo',
                        Protocolo: `REAGEND-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${consultaIdToUse}`,
                    },
                });
            });

            // Encerra a sala e invalida tokens
            await roomService.closeRoom(consultaIdToUse, 'cancelled');

            // Registra na auditoria
            await logConsultaCancel(
                userId,
                consultaIdToUse,
                motivo,
                `REAGEND-${consultaIdToUse}`,
                'Psicologo',
                ipAddress
            );

            return res.status(200).json({
                message: 'Sessão reagendada com sucesso. A sessão foi devolvida ao saldo do paciente.',
                status: 'ReagendadaPsicologoForaPrazo',
                reservaSessaoId: reservaSessao.Id,
                consultaId: consultaIdToUse,
            });
        } catch (error) {
            console.error('Erro ao reagendar sessão na sala:', error);
            return res.status(500).json({ error: 'Erro interno no servidor' });
        }
    }

    /**
     * Cancela uma sessão pelo psicólogo dentro da sala (problema do paciente)
     * Status: "CanceladaNaoCumprimentoContratualPaciente"
     * Regras: NÃO devolve sessão ao paciente, faz repasse financeiro normalmente
     * 
     * IMPORTANTE: Busca a partir da ReservaSessao pelo AgendaId, ReservaSessaoId ou ConsultaId
     */
    async cancelarPsicologoSala(req: Request, res: Response): Promise<Response> {
        const { getClientIp } = await import('../utils/getClientIp.util');
        const { logConsultaCancel } = await import('../utils/auditLogger.util');
        const ipAddress = getClientIp(req);

        try {
            const id = normalizeParamStringRequired(req.params.id);
            if (!id) {
                return res.status(400).json({ error: 'ID é obrigatório' });
            }
            const userId = this.userService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            // Verifica se é psicólogo
            const user = await this.userService.verifyUserRole(userId, [ROLES.Psychologist]);
            if (!user) {
                return res.status(403).json({ error: 'Somente psicólogos podem cancelar sessões na sala.' });
            }

            // Extrai dados do body (pode vir de FormData ou JSON)
            const motivo = req.body.motivo || (typeof req.body.motivo === 'string' ? req.body.motivo : '');
            const observacao = req.body.observacao || '';
            const agendaId = req.body.agendaId || id; // AgendaId pode vir do body ou params
            const reservaSessaoId = req.body.reservaSessaoId || ''; // ID da ReservaSessao se fornecido
            const consultaId = req.body.consultaId || ''; // ID da Consulta se fornecido

            if (!motivo) {
                return res.status(400).json({ error: 'Motivo é obrigatório' });
            }

            // Log para debug
            console.log('[cancelarPsicologoSala] Dados recebidos:', {
                id: id,
                agendaId: agendaId,
                reservaSessaoId: reservaSessaoId,
                consultaId: consultaId,
                motivo: motivo,
                observacao: observacao
            });

            // BUSCA PRIMÁRIA: ReservaSessao a partir do AgendaId, ReservaSessaoId ou ConsultaId
            let reservaSessao = null;

            if (reservaSessaoId) {
                // Busca pela ReservaSessaoId
                reservaSessao = await prisma.reservaSessao.findUnique({
                    where: { Id: reservaSessaoId },
                    include: {
                        Consulta: {
                            include: {
                                ReservaSessao: true,
                                Agenda: true,
                                CicloPlano: true,
                                Psicologo: {
                                    select: { Id: true, Nome: true, Email: true }
                                },
                                Paciente: {
                                    select: { Id: true, Nome: true, Email: true }
                                },
                            }
                        }
                    }
                });
            } else if (agendaId) {
                // Busca pelo AgendaId (campo da ReservaSessao)
                reservaSessao = await prisma.reservaSessao.findFirst({
                    where: { AgendaId: agendaId },
                    include: {
                        Consulta: {
                            include: {
                                ReservaSessao: true,
                                Agenda: true,
                                CicloPlano: true,
                                Psicologo: {
                                    select: { Id: true, Nome: true, Email: true }
                                },
                                Paciente: {
                                    select: { Id: true, Nome: true, Email: true }
                                },
                            }
                        }
                    }
                });
            } else if (consultaId) {
                // Busca pelo ConsultaId
                reservaSessao = await prisma.reservaSessao.findUnique({
                    where: { ConsultaId: consultaId },
                    include: {
                        Consulta: {
                            include: {
                                ReservaSessao: true,
                                Agenda: true,
                                CicloPlano: true,
                                Psicologo: {
                                    select: { Id: true, Nome: true, Email: true }
                                },
                                Paciente: {
                                    select: { Id: true, Nome: true, Email: true }
                                },
                            }
                        }
                    }
                });
            }

            if (!reservaSessao || !reservaSessao.Consulta) {
                return res.status(404).json({ error: 'ReservaSessao não encontrada' });
            }

            const consulta = reservaSessao.Consulta;
            const consultaIdToUse = consulta.Id;

            // Verifica se o psicólogo é o responsável (pode ser pelo Consulta ou ReservaSessao)
            const psicologoId = consulta.PsicologoId || reservaSessao.PsychologistId;
            if (psicologoId !== userId) {
                return res.status(403).json({ error: 'Apenas o psicólogo responsável pode cancelar esta sessão.' });
            }

            // Verifica se a sala está aberta (só pode cancelar dentro da sala)
            const { ConsultaRoomService } = await import('../services/consultaRoom.service');
            const roomService = new ConsultaRoomService();
            const isRoomOpen = await roomService.isRoomOpen(consultaIdToUse);

            if (!isRoomOpen) {
                return res.status(403).json({
                    error: 'Ação não permitida',
                    message: 'O cancelamento só pode ser feito dentro da sala ativa. A sala já foi encerrada.',
                    code: 'ROOM_CLOSED'
                });
            }

            // Verifica se a consulta já está em um status que não permite cancelamento
            const statusAtual = consulta.Status as string;
            const statusBloqueados = ['Realizada', 'CanceladaNaoCumprimentoContratualPaciente', 'CanceladaNaoCumprimentoContratualPsicologo'];
            if (statusBloqueados.includes(statusAtual)) {
                return res.status(400).json({
                    error: 'Ação não permitida',
                    message: `Não é possível cancelar uma consulta com status: ${statusAtual}`
                });
            }

            // Upload de documento se houver
            let documentoUrl: string | undefined;
            const file = (req as MulterRequest).file;
            if (file) {
                const { uploadFile } = await import('../services/storage.services');
                const filePath = `cancelamentos/${reservaSessao.Id}/${Date.now()}-${file.originalname}`;
                const data = await uploadFile(filePath, file.buffer, {
                    contentType: file.mimetype,
                });
                documentoUrl = data.fullUrl;
            }

            // Usa ConsultaStatusService para atualizar status (garante todas as regras de negócio)
            const { ConsultaStatusService } = await import('../services/consultaStatus.service');
            const statusService = new ConsultaStatusService();

            // Atualiza status usando o serviço (NÃO devolve sessão neste caso)
            await statusService.atualizarStatus({
                consultaId: consultaIdToUse,
                novoStatus: 'CanceladaNaoCumprimentoContratualPaciente' as ConsultaStatus,
                origem: ConsultaOrigemStatus.Psicologo,
                telaGatilho: 'ModuloRealizacaoSessao',
                usuarioId: userId,
            });

            // Atualiza status da ReservaSessao, Agenda e cria CancelamentoSessao
            await prisma.$transaction(async (tx) => {
                // Atualiza status da ReservaSessao e limpa tokens do Agora
                await tx.reservaSessao.update({
                    where: { Id: reservaSessao.Id },
                    data: {
                        Status: AgendaStatus.Cancelled_by_psychologist,
                        AgoraTokenPatient: null,
                        AgoraTokenPsychologist: null,
                        Uid: null,
                        UidPsychologist: null,
                    },
                });

                // Atualiza status da Agenda (se existir)
                if (consulta.Agenda) {
                    await tx.agenda.update({
                        where: { Id: consulta.Agenda.Id },
                        data: { Status: AgendaStatus.Cancelado, PacienteId: null },
                    });
                } else if (reservaSessao.AgendaId) {
                    // Se não tem Agenda no relacionamento, tenta atualizar pelo AgendaId da ReservaSessao
                    await tx.agenda.update({
                        where: { Id: reservaSessao.AgendaId },
                        data: { Status: AgendaStatus.Cancelado, PacienteId: null },
                    });
                }

                // Cria registro de auditoria/cancelamento
                // SessaoId deve ser o ConsultaId (conforme schema do CancelamentoSessao)
                await tx.cancelamentoSessao.create({
                    data: {
                        SessaoId: consultaIdToUse,
                        AutorId: userId,
                        Motivo: motivo,
                        PacienteId: consulta.PacienteId || reservaSessao.PatientId || '',
                        PsicologoId: consulta.PsicologoId || reservaSessao.PsychologistId || '',
                        Horario: consulta.Agenda?.Horario || consulta.Time || '',
                        LinkDock: documentoUrl || null,
                        Status: 'Deferido',
                        Tipo: 'Psicologo',
                        Protocolo: `CANCEL-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${consultaIdToUse}`,
                    },
                });
            });

            // Processa repasse financeiro normalmente
            try {
                const { processRepasse } = await import('../jobs/consultationJobs');
                await processRepasse(consultaIdToUse, null);
            } catch (repasseError) {
                console.error('Erro ao processar repasse:', repasseError);
                // Não falha a requisição se o repasse falhar
            }

            // Encerra a sala e invalida tokens
            await roomService.closeRoom(consultaIdToUse, 'cancelled');

            // Registra na auditoria
            await logConsultaCancel(
                userId,
                consultaIdToUse,
                motivo,
                `CANCEL-${consultaIdToUse}`,
                'Psicologo',
                ipAddress
            );

            // Envia e-mails de cancelamento para paciente e psicólogo
            try {
                const { EmailService } = await import('../services/email.service');
                const emailService = new EmailService();
                const reservationEmailData = {
                    paciente: {
                        nome: consulta.Paciente?.Nome || 'Paciente',
                        email: consulta.Paciente?.Email || ''
                    },
                    psicologo: {
                        nome: consulta.Psicologo?.Nome || 'Psicólogo',
                        email: consulta.Psicologo?.Email || ''
                    },
                    date: consulta.Agenda?.Data || consulta.Date,
                    time: consulta.Agenda?.Horario || consulta.Time
                };
                await emailService.sendCancelamentoCriadoEmail(
                    reservationEmailData as any,
                    motivo,
                    `CANCEL-${consultaIdToUse}`
                );
            } catch (emailError) {
                console.error('[reservations.controller] Erro ao enviar e-mails de cancelamento (psicólogo sala):', emailError);
            }

            // Notificações via socket para paciente e psicólogo
            try {
                const { NotificationService } = await import('../services/notification.service');
                const { WebSocketNotificationService } = await import('../services/websocketNotification.service');
                const notificationService = new NotificationService(new WebSocketNotificationService());

                const dataStr = consulta.Date ? new Date(consulta.Date).toLocaleDateString('pt-BR') : '';
                const horaStr = consulta.Time || '';

                // Paciente: sessão cancelada pelo psicólogo (status deferido)
                if (consulta.PacienteId) {
                    await notificationService.sendNotification({
                        userId: consulta.PacienteId,
                        title: 'Sessão Cancelada',
                        message: `Sua sessão foi cancelada pelo psicólogo. Protocolo: CANCEL-${consultaIdToUse}`,
                        type: 'info'
                    });
                }

                // Psicólogo: confirmação de cancelamento executado
                if (consulta.PsicologoId) {
                    const nomePaciente = consulta.Paciente?.Nome || 'Paciente';
                    await notificationService.sendNotification({
                        userId: consulta.PsicologoId,
                        title: 'Cancelamento Concluído',
                        message: `Você cancelou a sessão de ${nomePaciente} agendada para ${dataStr} às ${horaStr}. Protocolo: CANCEL-${consultaIdToUse}`,
                        type: 'info'
                    });
                }
            } catch (notificationError) {
                console.error('[reservations.controller] Erro ao enviar notificações de cancelamento via socket (psicólogo sala):', notificationError);
            }

            return res.status(200).json({
                message: 'Sessão cancelada com sucesso. O repasse financeiro será executado normalmente.',
                status: 'CanceladaNaoCumprimentoContratualPaciente',
                reservaSessaoId: reservaSessao.Id,
                consultaId: consultaIdToUse,
            });
        } catch (error) {
            console.error('Erro ao cancelar sessão na sala:', error);
            return res.status(500).json({ error: 'Erro interno no servidor' });
        }
    }
}
