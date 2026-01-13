import prisma from "../prisma/client";
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { getWebhookQueue } from '../workers/worker.webhook';
import { SessionDurationService } from './sessionDuration.service';
import { Server as SocketServer } from 'socket.io';
import { ConsultaOrigemStatus } from '../constants/consultaStatus.constants';
import { ConsultaRoomService } from './consultaRoom.service';

dayjs.extend(utc);
dayjs.extend(timezone);

interface SessionMonitoringData {
    consultaId: string;
    scheduledAt: string;
    patientId: string;
    psychologistId: string;
}

/**
 * Serviço para monitorar e gerenciar sessões em tempo real
 * Responsável por:
 * - Gerar tokens 15 segundos antes do início da sessão
 * - Monitorar entrada de participantes (paciente e psicólogo)
 * - Detectar ausência após 10 minutos e executar cancelamento automático
 * - Enviar notificações via Socket.io
 * - Gerenciar duração da sessão com Redis e Socket.io
 */
export class SessionMonitoringService {
    private durationService: SessionDurationService;
    private io: SocketServer | null = null;

    constructor(io?: SocketServer) {
        this.io = io || null;
        this.durationService = new SessionDurationService(io);
    }

    /**
    * Agenda a geração de tokens 60 segundos (1 minuto) ANTES do início da sessão
     * @param consultaId ID da consulta
     * @param scheduledAtStr Data/hora agendada no formato 'YYYY-MM-DD HH:mm:ss'
     */
    async scheduleTokenGeneration(consultaId: string, scheduledAtStr: string): Promise<boolean> {
        if (!scheduledAtStr) {
            console.warn(`[SessionMonitoring] ScheduledAt não definido para consulta ${consultaId}`);
            return false;
        }

        try {
            const scheduled = dayjs.tz(scheduledAtStr, 'America/Sao_Paulo');
            const now = dayjs.tz(dayjs(), 'America/Sao_Paulo');

            // Gera token 60 segundos (1 minuto) ANTES do horário agendado
            const tokenGenerationTime = scheduled.subtract(60, 'second');
            const delayMs = Math.max(0, tokenGenerationTime.valueOf() - now.valueOf());

            console.log(`[SessionMonitoring] Agendando tokens para consulta ${consultaId}`, {
                scheduledAt: scheduled.format('YYYY-MM-DD HH:mm:ss'),
                tokenGenerationTime: tokenGenerationTime.format('YYYY-MM-DD HH:mm:ss'),
                delayMs,
                delaySeconds: Math.floor(delayMs / 1000)
            });

            const webhookQueue = getWebhookQueue();
            if (!webhookQueue) {
                console.error(`[SessionMonitoring] WebhookQueue não disponível`);
                return false;
            }

            await webhookQueue.add(
                'generateTokens',
                { consultaId },
                {
                    delay: delayMs,
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000,
                    },
                    jobId: `token-gen-${consultaId}`,
                    removeOnComplete: {
                        age: 3600,
                    },
                }
            );

            console.log(`✅ [SessionMonitoring] Tokens agendados para ${delayMs}ms antes da sessão`);
            return true;
        } catch (error) {
            console.error(`[SessionMonitoring] Erro ao agendar tokens:`, error);
            return false;
        }
    }

    /**
     * Agenda monitoramento de presença: inicia no horário da consulta e verifica após 10min
     * @param data Dados da sessão
     */
    async schedulePresenceMonitoring(data: SessionMonitoringData): Promise<boolean> {
        const { consultaId, scheduledAt, patientId, psychologistId } = data;

        if (!scheduledAt) {
            console.warn(`[SessionMonitoring] ScheduledAt não definido para consulta ${consultaId}`);
            return false;
        }

        try {
            const scheduled = dayjs.tz(scheduledAt, 'America/Sao_Paulo');
            const now = dayjs.tz(dayjs(), 'America/Sao_Paulo');

            // Verifica presença 10 minutos APÓS o horário agendado
            const checkTime = scheduled.add(10, 'minute');
            const delayMs = Math.max(0, checkTime.valueOf() - now.valueOf());

            console.log(`[SessionMonitoring] Agendando verificação de presença para consulta ${consultaId}`, {
                scheduledAt: scheduled.format('YYYY-MM-DD HH:mm:ss'),
                checkTime: checkTime.format('YYYY-MM-DD HH:mm:ss'),
                delayMs,
                delayMinutes: Math.floor(delayMs / 60000)
            });

            const webhookQueue = getWebhookQueue();
            if (!webhookQueue) {
                console.error(`[SessionMonitoring] WebhookQueue não disponível`);
                return false;
            }

            await webhookQueue.add(
                'checkPresence',
                {
                    consultaId,
                    patientId,
                    psychologistId,
                    scheduledAt
                },
                {
                    delay: delayMs,
                    attempts: 2,
                    backoff: {
                        type: 'fixed',
                        delay: 5000,
                    },
                    jobId: `presence-check-${consultaId}`,
                    removeOnComplete: {
                        age: 3600,
                    },
                }
            );

            console.log(`✅ [SessionMonitoring] Verificação de presença agendada para 10min após início`);
            return true;
        } catch (error) {
            console.error(`[SessionMonitoring] Erro ao agendar verificação de presença:`, error);
            return false;
        }
    }

    /**
     * Verifica presença na sessão e executa ações necessárias
     */
    async checkSessionPresence(consultaId: string, patientId: string, psychologistId: string): Promise<void> {
        try {
            console.log(`[SessionMonitoring] Verificando presença na consulta ${consultaId}`);

            const reservaSessao = await prisma.reservaSessao.findUnique({
                where: { ConsultaId: consultaId },
                include: {
                    Consulta: {
                        include: {
                            Paciente: true,
                            Psicologo: true,
                        }
                    }
                }
            });

            if (!reservaSessao) {
                console.warn(`[SessionMonitoring] ReservaSessao não encontrada para consulta ${consultaId}`);
                return;
            }

            const roomService = new ConsultaRoomService();
            const roomState = await roomService.getRoomState(consultaId);

            const patientJoined = !!(
                roomState?.patientJoined || roomState?.patientJoinedAt || reservaSessao.PatientJoinedAt
            );
            const psychologistJoined = !!(
                roomState?.psychologistJoined || roomState?.psychologistJoinedAt || reservaSessao.PsychologistJoinedAt
            );

            console.log(`[SessionMonitoring] Status de presença:`, {
                consultaId,
                patientJoined,
                psychologistJoined,
                status: reservaSessao.Status
            });

            // Cenário 1: Psicólogo não entrou - fecha sala e cancela por timeout
            if (patientJoined && !psychologistJoined) {
                console.log(`⚠️ [SessionMonitoring] Psicólogo ausente - fechamento automático via Redis`);
                await roomService.closeRoom(consultaId, 'timeout', 'psychologist');
                return;
            }

            // Cenário 2: Paciente não entrou - fecha sala e cancela por timeout
            if (psychologistJoined && !patientJoined) {
                console.log(`⚠️ [SessionMonitoring] Paciente ausente - fechamento automático via Redis`);
                await roomService.closeRoom(consultaId, 'timeout', 'patient');
                return;
            }

            // Cenário 3: Nenhum entrou - fecha sala e cancela por timeout (missing both)
            if (!patientJoined && !psychologistJoined) {
                console.log(`⚠️ [SessionMonitoring] Ambos ausentes - fechamento automático via Redis`);
                await roomService.closeRoom(consultaId, 'timeout', 'both');
                return;
            }

            // Cenário 4: Ambos entraram - Sessão está ocorrendo normalmente
            console.log(`✅ [SessionMonitoring] Ambos presentes - Sessão em andamento normalmente`);

        } catch (error) {
            console.error(`[SessionMonitoring] Erro ao verificar presença:`, error);
        }
    }

    /**
     * Trata ausência do psicólogo: notifica paciente, cancela e devolve saldo
     */
    private async handlePsychologistAbsence(
        consultaId: string,
        patientId: string,
        psychologistId: string,
        consulta: { Paciente: { Nome: string } | null; Psicologo: { Nome: string } | null }
    ): Promise<void> {
        try {
            // Envia notificação ao paciente antes do cancelamento
            await this.sendAbsenceNotification(
                patientId,
                'psychologist',
                consulta.Psicologo?.Nome || 'Psicólogo',
                consultaId
            );

            // Aguarda 30 segundos para o paciente ver a notificação
            await new Promise(resolve => setTimeout(resolve, 30000));

            // Executa cancelamento sistêmico com devolução de saldo
            const { CancelamentoService } = await import('./cancelamento.service');
            const cancelamentoService = new CancelamentoService();

            const protocolo = `AUTO-PSYCH-${Date.now()}`;
            const now = dayjs.tz(dayjs(), 'America/Sao_Paulo');

            await cancelamentoService.create({
                idconsulta: consultaId,
                idPaciente: patientId,
                idPsicologo: psychologistId,
                motivo: 'Cancelamento automático - Psicólogo não compareceu após 10 minutos do horário agendado',
                protocolo,
                horario: now.format('YYYY-MM-DD HH:mm:ss'),
                tipo: 'Sistema',
                data: now.format('YYYY-MM-DD'),
            });

            // Atualiza status usando ConsultaStatusService
            const { ConsultaStatusService } = await import('./consultaStatus.service');
            const statusService = new ConsultaStatusService();

            await statusService.atualizarStatus({
                consultaId,
                novoStatus: 'PsicologoNaoCompareceu',
                origem: ConsultaOrigemStatus.Sistemico,
                telaGatilho: 'Sessão - Monitoramento Automático',
                usuarioId: psychologistId,
            });

            console.log(`✅ [SessionMonitoring] Cancelamento por ausência do psicólogo concluído`);

        } catch (error) {
            console.error(`[SessionMonitoring] Erro ao tratar ausência do psicólogo:`, error);
        }
    }

    /**
     * Trata ausência do paciente: notifica psicólogo, cancela e faz repasse
     */
    private async handlePatientAbsence(
        consultaId: string,
        patientId: string,
        psychologistId: string,
        consulta: { Paciente: { Nome: string } | null; Psicologo: { Nome: string } | null }
    ): Promise<void> {
        try {
            // Envia notificação ao psicólogo antes do cancelamento
            await this.sendAbsenceNotification(
                psychologistId,
                'patient',
                consulta.Paciente?.Nome || 'Paciente',
                consultaId
            );

            // Aguarda 30 segundos para o psicólogo ver a notificação
            await new Promise(resolve => setTimeout(resolve, 30000));

            // Executa cancelamento sistêmico SEM devolução de saldo
            const { CancelamentoService } = await import('./cancelamento.service');
            const cancelamentoService = new CancelamentoService();

            const protocolo = `AUTO-PAT-${Date.now()}`;
            const now = dayjs.tz(dayjs(), 'America/Sao_Paulo');

            await cancelamentoService.create({
                idconsulta: consultaId,
                idPaciente: patientId,
                idPsicologo: psychologistId,
                motivo: 'Cancelamento automático - Paciente não compareceu após 10 minutos do horário agendado',
                protocolo,
                horario: now.format('YYYY-MM-DD HH:mm:ss'),
                tipo: 'Sistema',
                data: now.format('YYYY-MM-DD'),
            });

            // Atualiza status usando ConsultaStatusService
            const { ConsultaStatusService } = await import('./consultaStatus.service');
            const statusService = new ConsultaStatusService();

            await statusService.atualizarStatus({
                consultaId,
                novoStatus: 'PacienteNaoCompareceu',
                origem: ConsultaOrigemStatus.Sistemico,
                telaGatilho: 'Sessão - Monitoramento Automático',
                usuarioId: patientId,
            });

            // Processa repasse ao psicólogo
            await this.processPaymentToPsychologist(consultaId, psychologistId);

            console.log(`✅ [SessionMonitoring] Cancelamento por ausência do paciente concluído`);

        } catch (error) {
            console.error(`[SessionMonitoring] Erro ao tratar ausência do paciente:`, error);
        }
    }

    /**
     * Trata caso onde ambos não compareceram
     */
    private async handleBothAbsent(
        consultaId: string,
        patientId: string,
        psychologistId: string,
        consulta: { Paciente: { Nome: string } | null; Psicologo: { Nome: string } | null }
    ): Promise<void> {
        try {
            // Executa cancelamento sistêmico com devolução de saldo
            const { CancelamentoService } = await import('./cancelamento.service');
            const cancelamentoService = new CancelamentoService();

            const protocolo = `AUTO-BOTH-${Date.now()}`;
            const now = dayjs.tz(dayjs(), 'America/Sao_Paulo');

            await cancelamentoService.create({
                idconsulta: consultaId,
                idPaciente: patientId,
                idPsicologo: psychologistId,
                motivo: 'Cancelamento automático - Nenhum dos participantes compareceu',
                protocolo,
                horario: now.format('YYYY-MM-DD HH:mm:ss'),
                tipo: 'Sistema',
                data: now.format('YYYY-MM-DD'),
            });

            // Atualiza status
            const { ConsultaStatusService } = await import('./consultaStatus.service');
            const statusService = new ConsultaStatusService();

            await statusService.atualizarStatus({
                consultaId,
                novoStatus: 'Cancelado',
                origem: ConsultaOrigemStatus.Sistemico,
                telaGatilho: 'Sessão - Monitoramento Automático',
                usuarioId: patientId,
            });

            console.log(`✅ [SessionMonitoring] Cancelamento por ausência de ambos concluído`);

        } catch (error) {
            console.error(`[SessionMonitoring] Erro ao tratar ausência de ambos:`, error);
        }
    }

    /**
     * Envia notificação de ausência via Socket.io (estilo Google Meet)
     */
    private async sendAbsenceNotification(
        userId: string,
        absentRole: 'patient' | 'psychologist',
        absentName: string,
        consultaId: string
    ): Promise<void> {
        try {
            const message = absentRole === 'psychologist'
                ? `O psicólogo ${absentName} não entrou na sessão após 10 minutos. A consulta será cancelada e o valor será devolvido ao seu saldo.`
                : `O paciente ${absentName} não entrou na sessão após 10 minutos. A consulta será cancelada e você receberá o repasse normalmente.`;

            // Usa o serviço de notificação via Socket
            if (this.io) {
                const { emitirEventoUsuario } = await import('../utils/emitirEventoUsuario');

                await emitirEventoUsuario(this.io, userId, 'user:status-update', {
                    consultaId,
                    message,
                    absentRole,
                    absentName,
                    countdown: 30, // 30 segundos até o cancelamento
                    severity: 'warning',
                    timestamp: new Date().toISOString()
                });
            }

            console.log(`📢 [SessionMonitoring] Notificação de ausência enviada para ${userId}`);

        } catch (error) {
            console.error(`[SessionMonitoring] Erro ao enviar notificação:`, error);
        }
    }

    /**
     * Processa o repasse financeiro ao psicólogo quando paciente não comparece
     */
    private async processPaymentToPsychologist(consultaId: string, psychologistId: string): Promise<void> {
        try {
            console.log(`💰 [SessionMonitoring] Processando repasse ao psicólogo ${psychologistId}`);

            const consulta = await prisma.consulta.findUnique({
                where: { Id: consultaId }
            });

            if (!consulta || !consulta.Valor) {
                console.warn(`[SessionMonitoring] Consulta ou valor não encontrado para repasse`);
                return;
            }

            // Cria registro financeiro de repasse
            await prisma.financeiroPsicologo.create({
                data: {
                    UserId: psychologistId,
                    Valor: consulta.Valor,
                    Status: 'pendente',
                    DataVencimento: dayjs().add(7, 'day').toDate(),
                    Tipo: 'Repasse',
                }
            });

            // Marca consulta como faturada
            await prisma.consulta.update({
                where: { Id: consultaId },
                data: { Faturada: true }
            });

            console.log(`✅ [SessionMonitoring] Repasse processado com sucesso`);

        } catch (error) {
            console.error(`[SessionMonitoring] Erro ao processar repasse:`, error);
        }
    }

    /**
     * Inicia monitoramento de duração da sessão
     * Dispara evento a cada segundo para atualizar cronômetros
     */
    async startSessionTimer(consultaId: string, scheduledAt: string, io: SocketServer): Promise<void> {
        try {
            // Inicializa serviço de duração com Redis e Socket
            await this.durationService.initializeSessionDuration(consultaId, scheduledAt, io);

            console.log(`⏱️ [SessionMonitoring] Timer da sessão iniciado para consulta ${consultaId}`);

        } catch (error) {
            console.error(`[SessionMonitoring] Erro ao iniciar timer:`, error);
        }
    }

    /**
     * Processa tick do timer (chamado pelo worker a cada segundo)
     */
    async processTick(consultaId: string, tickNumber: number, io: SocketServer): Promise<void> {
        try {
            await this.durationService.processTick(consultaId, tickNumber, io);
        } catch (error) {
            console.error(`[SessionMonitoring] Erro ao processar tick do timer:`, error);
        }
    }

    /**
     * Pausa o timer da sessão
     */
    async pauseTimer(consultaId: string): Promise<void> {
        try {
            await this.durationService.pauseSessionDuration(consultaId);
        } catch (error) {
            console.error(`[SessionMonitoring] Erro ao pausar timer:`, error);
        }
    }

    /**
     * Retoma o timer da sessão
     */
    async resumeTimer(consultaId: string): Promise<void> {
        try {
            await this.durationService.resumeSessionDuration(consultaId);
        } catch (error) {
            console.error(`[SessionMonitoring] Erro ao retomar timer:`, error);
        }
    }

    /**
     * Encerra o timer da sessão
     */
    async endTimer(consultaId: string): Promise<void> {
        try {
            await this.durationService.endSessionDuration(consultaId);
        } catch (error) {
            console.error(`[SessionMonitoring] Erro ao encerrar timer:`, error);
        }
    }
}
