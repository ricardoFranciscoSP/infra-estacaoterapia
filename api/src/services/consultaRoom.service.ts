import { getIORedisClient } from "../config/redis.config";
import prisma from "../prisma/client";
import { WebSocketNotificationService } from "./websocketNotification.service";
import { ConsultaStatusService } from "./consultaStatus.service";
import { AgendaStatus } from "../types/permissions.types";

/**
 * Tipo para os dados da sala armazenados no Redis
 */
interface RoomData {
    consultationId: string;
    scheduledAt?: string;
    status: 'open' | 'closed';
    patientJoined?: boolean;
    psychologistJoined?: boolean;
    patientJoinedAt?: string | null;
    psychologistJoinedAt?: string | null;
    closedAt?: string | null;
    tokensInvalidated: boolean;
    reason?: 'completed' | 'cancelled' | 'inactivity' | 'timeout';
}

/**
 * Serviço para gerenciar o estado das salas de consulta usando Redis
 * Garante que tokens sejam invalidados e status sejam atualizados corretamente
 */
export class ConsultaRoomService {
    private redis: ReturnType<typeof getIORedisClient>;
    private wsNotify: WebSocketNotificationService;
    private statusService: ConsultaStatusService;

    constructor() {
        this.redis = getIORedisClient();
        this.wsNotify = new WebSocketNotificationService();
        this.statusService = new ConsultaStatusService();
    }

    /**
     * Chave Redis para armazenar estado da sala
     */
    private getRoomKey(consultationId: string): string {
        return `room:${consultationId}`;
    }

    /**
     * Chave Redis para armazenar tokens válidos
     */
    private getTokenKey(consultationId: string, role: 'patient' | 'psychologist'): string {
        return `token:${consultationId}:${role}`;
    }

    /**
     * Chave Redis para armazenar duração da sessão
     */
    private getSessionDurationKey(consultationId: string): string {
        return `session:duration:${consultationId}`;
    }

    /**
     * Inicializa o estado da sala no Redis
     */
    async initializeRoom(consultationId: string, scheduledAt: Date): Promise<void> {
        if (!this.redis) {
            console.warn("⚠️ [ConsultaRoomService] Redis não disponível - inicialização da sala ignorada");
            return;
        }

        try {
            const roomData = {
                consultationId,
                scheduledAt: scheduledAt.toISOString(),
                status: 'open',
                patientJoined: false,
                psychologistJoined: false,
                patientJoinedAt: null,
                psychologistJoinedAt: null,
                closedAt: null,
                tokensInvalidated: false
            };

            // Armazena por 2 horas (tempo máximo de uma consulta + margem)
            await this.redis.setex(
                this.getRoomKey(consultationId),
                7200, // 2 horas
                JSON.stringify(roomData)
            );

            console.log(`✅ [ConsultaRoomService] Sala ${consultationId} inicializada no Redis`);
        } catch (error) {
            console.error(`❌ [ConsultaRoomService] Erro ao inicializar sala ${consultationId}:`, error);
        }
    }

    /**
     * Registra entrada de participante na sala
     */
    async registerParticipantJoin(
        consultationId: string,
        role: 'patient' | 'psychologist',
        token: string
    ): Promise<void> {
        if (!this.redis) {
            console.warn("⚠️ [ConsultaRoomService] Redis não disponível - registro de entrada ignorado");
            return;
        }

        try {
            const roomKey = this.getRoomKey(consultationId);
            const roomDataStr = await this.redis.get(roomKey);

            if (!roomDataStr) {
                console.warn(`⚠️ [ConsultaRoomService] Sala ${consultationId} não encontrada no Redis`);
                return;
            }

            const roomData = JSON.parse(roomDataStr);
            const now = new Date().toISOString();

            if (role === 'patient') {
                roomData.patientJoined = true;
                roomData.patientJoinedAt = now;
            } else {
                roomData.psychologistJoined = true;
                roomData.psychologistJoinedAt = now;
            }

            // Armazena token válido (expira em 1 hora)
            await this.redis.setex(
                this.getTokenKey(consultationId, role),
                3600, // 1 hora
                token
            );

            // Atualiza estado da sala
            await this.redis.setex(roomKey, 7200, JSON.stringify(roomData));

            console.log(`✅ [ConsultaRoomService] ${role} entrou na sala ${consultationId}`);
        } catch (error) {
            console.error(`❌ [ConsultaRoomService] Erro ao registrar entrada:`, error);
        }
    }

    /**
     * Verifica se um token é válido
     */
    async isTokenValid(consultationId: string, role: 'patient' | 'psychologist', token: string): Promise<boolean> {
        if (!this.redis) {
            // Se Redis não estiver disponível, permite (fallback)
            return true;
        }

        try {
            const tokenKey = this.getTokenKey(consultationId, role);
            const storedToken = await this.redis.get(tokenKey);

            // Token é válido se existe no Redis e corresponde
            return storedToken === token;
        } catch (error) {
            console.error(`❌ [ConsultaRoomService] Erro ao verificar token:`, error);
            // Em caso de erro, nega acesso por segurança
            return false;
        }
    }

    /**
     * Verifica se a sala está aberta
     */
    async isRoomOpen(consultationId: string): Promise<boolean> {
        if (!this.redis) {
            // Se Redis não estiver disponível, verifica no banco
            const reservaSessao = await prisma.reservaSessao.findUnique({
                where: { ConsultaId: consultationId },
                include: { Consulta: true }
            });

            if (!reservaSessao || !reservaSessao.Consulta) return false;

            const status = reservaSessao.Consulta.Status as string;
            return !['Concluido', 'Cancelado', 'CanceladaForcaMaior'].includes(status);
        }

        try {
            const roomKey = this.getRoomKey(consultationId);
            const roomDataStr = await this.redis.get(roomKey);

            if (!roomDataStr) {
                // Se não existe no Redis, verifica no banco
                return await this.isRoomOpen(consultationId);
            }

            const roomData = JSON.parse(roomDataStr) as RoomData;
            return roomData.status === 'open' && !roomData.tokensInvalidated;
        } catch (error) {
            console.error(`❌ [ConsultaRoomService] Erro ao verificar se sala está aberta:`, error);
            return false;
        }
    }

    /**
     * Fecha a sala, invalida tokens e atualiza status
     */
    async closeRoom(
        consultationId: string,
        reason: 'completed' | 'cancelled' | 'inactivity' | 'timeout',
        missingRole?: 'patient' | 'psychologist' | 'both'
    ): Promise<void> {
        if (!this.redis) {
            console.warn("⚠️ [ConsultaRoomService] Redis não disponível - fechando sala sem Redis");
            await this.closeRoomInDatabase(consultationId, reason, missingRole);
            return;
        }

        try {
            const roomKey = this.getRoomKey(consultationId);
            const roomDataStr = await this.redis.get(roomKey);

            let roomData: RoomData = {
                consultationId,
                status: 'closed',
                closedAt: new Date().toISOString(),
                tokensInvalidated: true,
                reason
            };

            if (roomDataStr) {
                const parsedData = JSON.parse(roomDataStr) as Partial<RoomData>;
                roomData = { ...parsedData, ...roomData };
            }

            // Atualiza estado no Redis (mantém por 24h para auditoria)
            await this.redis.setex(roomKey, 86400, JSON.stringify(roomData));

            // Remove tokens do Redis
            await this.redis.del(this.getTokenKey(consultationId, 'patient'));
            await this.redis.del(this.getTokenKey(consultationId, 'psychologist'));

            console.log(`✅ [ConsultaRoomService] Sala ${consultationId} fechada no Redis - motivo: ${reason}`);

            // Remove duração da sessão do Redis
            await this.clearSessionDuration(consultationId);

            // Atualiza no banco de dados
            await this.closeRoomInDatabase(consultationId, reason, missingRole);

            // Busca dados da consulta para notificar usuários específicos
            const reservaSessao = await prisma.reservaSessao.findUnique({
                where: { ConsultaId: consultationId },
                include: {
                    Consulta: {
                        include: {
                            Paciente: { select: { Id: true } },
                            Psicologo: { select: { Id: true } }
                        }
                    }
                }
            });

            // ✅ Notifica via Socket.IO - canal da consulta (para quem está na sala)
            const closeMessage = this.getCloseMessage(reason, missingRole);
            const closePayload: {
                event: string;
                consultationId: string;
                reason: string;
                message: string;
                timestamp: string;
            } = {
                event: 'room-closed',
                consultationId,
                reason,
                message: closeMessage,
                timestamp: new Date().toISOString()
            };

            try {
                await this.wsNotify.emitConsultation(`consultation:${consultationId}`, closePayload);
                console.log(`✅ [ConsultaRoomService] Notificação enviada para sala da consulta ${consultationId}`);
            } catch (notifyError: unknown) {
                const err = notifyError as { message?: string };
                console.error(`❌ [ConsultaRoomService] Erro ao notificar sala da consulta:`, err?.message || String(notifyError));
            }

            // ✅ Notifica AMBOS os usuários diretamente (paciente e psicólogo)
            // Isso garante que ambas as salas/abas sejam fechadas mesmo se não estiverem na sala
            if (reservaSessao?.Consulta?.Paciente?.Id) {
                try {
                    await this.wsNotify.emitToUser(reservaSessao.Consulta.Paciente.Id, 'room-closed', closePayload);
                    console.log(`✅ [ConsultaRoomService] Notificação enviada para paciente ${reservaSessao.Consulta.Paciente.Id}`);
                } catch (notifyError: unknown) {
                    const err = notifyError as { message?: string };
                    console.error(`❌ [ConsultaRoomService] Erro ao notificar paciente:`, err?.message || String(notifyError));
                }
            }

            if (reservaSessao?.Consulta?.Psicologo?.Id) {
                try {
                    await this.wsNotify.emitToUser(reservaSessao.Consulta.Psicologo.Id, 'room-closed', closePayload);
                    console.log(`✅ [ConsultaRoomService] Notificação enviada para psicólogo ${reservaSessao.Consulta.Psicologo.Id}`);
                } catch (notifyError: unknown) {
                    const err = notifyError as { message?: string };
                    console.error(`❌ [ConsultaRoomService] Erro ao notificar psicólogo:`, err?.message || String(notifyError));
                }
            }

            // ✅ Envia também evento de status-changed para garantir sincronização
            try {
                const statusChangedPayload: {
                    event: string;
                    consultationId: string;
                    status: string;
                    reason: string;
                    timestamp: string;
                } = {
                    event: 'consultation:status-changed',
                    consultationId,
                    status: reason === 'completed' ? 'Concluido' : 'Cancelado',
                    reason,
                    timestamp: new Date().toISOString()
                };

                await this.wsNotify.emitConsultation(`consultation:${consultationId}`, statusChangedPayload);
                
                if (reservaSessao?.Consulta?.Paciente?.Id) {
                    await this.wsNotify.emitToUser(reservaSessao.Consulta.Paciente.Id, 'consultation:status-changed', statusChangedPayload);
                }
                if (reservaSessao?.Consulta?.Psicologo?.Id) {
                    await this.wsNotify.emitToUser(reservaSessao.Consulta.Psicologo.Id, 'consultation:status-changed', statusChangedPayload);
                }
                
                console.log(`✅ [ConsultaRoomService] Evento status-changed enviado para ${consultationId}`);
            } catch (statusError: unknown) {
                const err = statusError as { message?: string };
                console.error(`❌ [ConsultaRoomService] Erro ao enviar status-changed:`, err?.message || String(statusError));
            }

            console.log(`✅ [ConsultaRoomService] Todas as notificações enviadas para paciente e psicólogo sobre fechamento da sala ${consultationId}`);


        } catch (error) {
            console.error(`❌ [ConsultaRoomService] Erro ao fechar sala:`, error);
            // Tenta fechar no banco mesmo se Redis falhar
            await this.closeRoomInDatabase(consultationId, reason, missingRole);
        }
    }

    /**
     * Fecha sala no banco de dados
     */
    private async closeRoomInDatabase(
        consultationId: string,
        reason: 'completed' | 'cancelled' | 'inactivity' | 'timeout',
        missingRole?: 'patient' | 'psychologist' | 'both'
    ): Promise<void> {
        try {
            const reservaSessao = await prisma.reservaSessao.findUnique({
                where: { ConsultaId: consultationId },
                include: {
                    Consulta: {
                        include: {
                            Paciente: { select: { Id: true } },
                            Psicologo: { select: { Id: true } }
                        }
                    }
                }
            });

            if (!reservaSessao || !reservaSessao.Consulta) {
                console.error(`❌ [ConsultaRoomService] ReservaSessao não encontrada para ${consultationId}`);
                return;
            }

            const consulta = reservaSessao.Consulta;

            // Determina status baseado no motivo
            if (reason === 'completed') {
                // Quando completada, usa ConsultaStatusService.finalizarConsulta() que:
                // - Verifica se ambos estiveram na sala
                // - Atualiza Consulta.Status → Realizada
                // - Atualiza ReservaSessao.Status → Concluido
                // - Atualiza Agenda.Status → Concluido
                // - Processa repasse
                try {
                    // ConsultaStatusService.finalizarConsulta() já:
                    // - Verifica se ambos estiveram na sala
                    // - Atualiza Consulta.Status → Realizada
                    // - Atualiza ReservaSessao.Status → Concluido
                    // - Atualiza Agenda.Status → Concluido
                    // - Limpa tokens do Agora dentro da transação
                    // - Processa repasse
                    await this.statusService.finalizarConsulta(consultationId);
                    console.log(`✅ [ConsultaRoomService] Consulta ${consultationId} finalizada usando ConsultaStatusService`);
                } catch (error) {
                    console.error(`❌ [ConsultaRoomService] Erro ao finalizar consulta:`, error);
                    // Se falhar (ex: ambos não estiveram na sala), limpa tokens mesmo assim
                    await prisma.reservaSessao.update({
                        where: { ConsultaId: consultationId },
                        data: {
                            AgoraTokenPatient: null,
                            AgoraTokenPsychologist: null,
                            Uid: null,
                            UidPsychologist: null
                        }
                    });
                }

                return; // ConsultaStatusService já atualizou tudo incluindo tokens
            } else if (reason === 'inactivity' || reason === 'timeout') {
                // ✅ Usa ConsultaStatusService.processarInatividade para garantir atualização completa de todas as tabelas
                // Isso atualiza: Consulta, ReservaSessao, Agenda, CicloPlano (se aplicável), e limpa tokens
                let missingRoleForInatividade: 'Patient' | 'Psychologist' | 'Both';
                
                if (missingRole === 'psychologist') {
                    missingRoleForInatividade = 'Psychologist';
                } else if (missingRole === 'patient') {
                    missingRoleForInatividade = 'Patient';
                } else {
                    missingRoleForInatividade = 'Both';
                }

                try {
                    // ConsultaStatusService.processarInatividade já:
                    // - Atualiza Consulta.Status (PacienteNaoCompareceu, PsicologoNaoCompareceu, etc)
                    // - Atualiza ReservaSessao.Status → Cancelado
                    // - Atualiza Agenda.Status → Disponivel (libera para novo agendamento)
                    // - Limpa tokens do Agora
                    // - Devolve sessão ao CicloPlano se necessário
                    await this.statusService.processarInatividade(consultationId, missingRoleForInatividade);
                    console.log(`✅ [ConsultaRoomService] Inatividade processada usando ConsultaStatusService para ${consultationId}`);
                } catch (statusError: unknown) {
                    const err = statusError as { message?: string };
                    console.error(`❌ [ConsultaRoomService] Erro ao processar inatividade:`, err?.message || String(statusError));
                    
                    // Fallback: atualiza manualmente se o serviço falhar
                    type ConsultaStatusType = 'CanceladaForcaMaior';
                    const novoStatus: ConsultaStatusType = 'CanceladaForcaMaior';

                    await prisma.$transaction(async (tx) => {
                        await tx.consulta.update({
                            where: { Id: consultationId },
                            data: { Status: novoStatus }
                        });

                        await tx.reservaSessao.update({
                            where: { ConsultaId: consultationId },
                            data: {
                                AgoraTokenPatient: null,
                                AgoraTokenPsychologist: null,
                                Uid: null,
                                UidPsychologist: null,
                                Status: AgendaStatus.Cancelado
                            }
                        });

                        if (consulta.AgendaId) {
                            await tx.agenda.update({
                                where: { Id: consulta.AgendaId },
                                data: { 
                                    Status: AgendaStatus.Cancelado,
                                    PacienteId: null // Libera agenda
                                }
                            });
                        }
                    });

                    console.log(`✅ [ConsultaRoomService] Sala ${consultationId} fechada no banco (fallback) - status: ${novoStatus}`);
                }
                return;
            } else {
                // Caso cancelled ou outros
                type ConsultaStatusType = 'CanceladaForcaMaior';
                const novoStatus: ConsultaStatusType = 'CanceladaForcaMaior';

                // ✅ Atualiza todas as tabelas relacionadas em uma transação
                await prisma.$transaction(async (tx) => {
                    // 1. Atualiza Consulta
                    await tx.consulta.update({
                        where: { Id: consultationId },
                        data: { Status: novoStatus }
                    });

                    // 2. Atualiza ReservaSessao (limpa tokens e atualiza status)
                    await tx.reservaSessao.update({
                        where: { ConsultaId: consultationId },
                        data: {
                            AgoraTokenPatient: null,
                            AgoraTokenPsychologist: null,
                            Uid: null,
                            UidPsychologist: null,
                            Status: AgendaStatus.Cancelado
                        }
                    });

                    // 3. Atualiza Agenda (libera para novo agendamento)
                    if (consulta.AgendaId) {
                        await tx.agenda.update({
                            where: { Id: consulta.AgendaId },
                            data: { 
                                Status: AgendaStatus.Cancelado,
                                PacienteId: null // Libera agenda
                            }
                        });
                    }
                });

                console.log(`✅ [ConsultaRoomService] Sala ${consultationId} fechada no banco - status: ${novoStatus}`);
            }
        } catch (error) {
            console.error(`❌ [ConsultaRoomService] Erro ao fechar sala no banco:`, error);
            throw error;
        }
    }

    /**
     * Retorna mensagem de fechamento baseada no motivo
     */
    private getCloseMessage(reason: string, missingRole?: string): string {
        switch (reason) {
            case 'completed':
                return 'A consulta foi concluída.';
            case 'inactivity':
                if (missingRole === 'psychologist') {
                    return 'A consulta foi encerrada por inatividade do psicólogo.';
                } else if (missingRole === 'patient') {
                    return 'A consulta foi encerrada por inatividade do paciente.';
                }
                return 'A consulta foi encerrada por inatividade.';
            case 'timeout':
                return 'A consulta foi encerrada automaticamente após o tempo limite.';
            case 'cancelled':
                return 'A consulta foi cancelada.';
            default:
                return 'A consulta foi encerrada.';
        }
    }

    /**
     * Obtém estado atual da sala
     */
    async getRoomState(consultationId: string): Promise<RoomData | null> {
        if (!this.redis) {
            return null;
        }

        try {
            const roomKey = this.getRoomKey(consultationId);
            const roomDataStr = await this.redis.get(roomKey);

            if (!roomDataStr) return null;

            return JSON.parse(roomDataStr);
        } catch (error) {
            console.error(`❌ [ConsultaRoomService] Erro ao obter estado da sala:`, error);
            return null;
        }
    }

    /**
     * Salva a duração atual da sessão no Redis
     * Usado para sincronizar timers entre paciente e psicólogo
     */
    async saveSessionDuration(
        consultationId: string,
        duration: number,
        timeRemaining: number,
        timestamp: number
    ): Promise<void> {
        if (!this.redis) {
            console.warn("⚠️ [ConsultaRoomService] Redis não disponível - duração não salva");
            return;
        }

        try {
            const durationKey = this.getSessionDurationKey(consultationId);
            let lastWarningMinutesSent: number | undefined;
            const existingDataStr = await this.redis.get(durationKey);
            if (existingDataStr) {
                try {
                    const existingData = JSON.parse(existingDataStr);
                    if (typeof existingData?.lastWarningMinutesSent === 'number') {
                        lastWarningMinutesSent = existingData.lastWarningMinutesSent;
                    }
                } catch (parseError) {
                    console.warn(`⚠️ [ConsultaRoomService] Erro ao parsear duração existente:`, parseError);
                }
            }

            const durationData = {
                consultationId,
                duration, // em segundos
                timeRemaining, // em segundos
                timestamp,
                updatedAt: new Date().toISOString(),
                lastWarningMinutesSent
            };

            // Salva por 2 horas (tempo máximo de uma consulta + margem)
            await this.redis.setex(
                durationKey,
                7200, // 2 horas
                JSON.stringify(durationData)
            );

            console.log(`✅ [ConsultaRoomService] Duração salva no Redis para ${consultationId}: ${duration}s (restam ${timeRemaining}s)`);
        } catch (error) {
            console.error(`❌ [ConsultaRoomService] Erro ao salvar duração:`, error);
        }
    }

    /**
     * Obtém a duração atual da sessão do Redis
     * Retorna null se não encontrar ou se Redis não estiver disponível
     */
    async getSessionDuration(
        consultationId: string
    ): Promise<{ duration: number; timeRemaining: number; timestamp: number; lastWarningMinutesSent?: number } | null> {
        if (!this.redis) {
            return null;
        }

        try {
            const durationKey = this.getSessionDurationKey(consultationId);
            const durationDataStr = await this.redis.get(durationKey);

            if (!durationDataStr) {
                console.log(`ℹ️ [ConsultaRoomService] Duração não encontrada no Redis para ${consultationId}`);
                return null;
            }

            const durationData = JSON.parse(durationDataStr);
            return {
                duration: durationData.duration || 0,
                timeRemaining: durationData.timeRemaining || 0,
                timestamp: durationData.timestamp || Date.now(),
                lastWarningMinutesSent: typeof durationData.lastWarningMinutesSent === 'number'
                    ? durationData.lastWarningMinutesSent
                    : undefined
            };
        } catch (error) {
            console.error(`❌ [ConsultaRoomService] Erro ao obter duração:`, error);
            return null;
        }
    }

    /**
     * Salva o último aviso de tempo restante enviado para evitar duplicações
     */
    async saveLastWarningMinutes(
        consultationId: string,
        minutesRemaining: number
    ): Promise<void> {
        if (!this.redis) {
            return;
        }

        try {
            const durationKey = this.getSessionDurationKey(consultationId);
            const durationDataStr = await this.redis.get(durationKey);
            if (!durationDataStr) {
                return;
            }

            const durationData = JSON.parse(durationDataStr);
            durationData.lastWarningMinutesSent = minutesRemaining;
            durationData.updatedAt = new Date().toISOString();

            await this.redis.setex(
                durationKey,
                7200,
                JSON.stringify(durationData)
            );
        } catch (error) {
            console.error(`❌ [ConsultaRoomService] Erro ao salvar último aviso:`, error);
        }
    }

    /**
     * Remove a duração da sessão do Redis (quando a sala é fechada)
     */
    async clearSessionDuration(consultationId: string): Promise<void> {
        if (!this.redis) {
            return;
        }

        try {
            const durationKey = this.getSessionDurationKey(consultationId);
            await this.redis.del(durationKey);
            console.log(`✅ [ConsultaRoomService] Duração removida do Redis para ${consultationId}`);
        } catch (error) {
            console.error(`❌ [ConsultaRoomService] Erro ao remover duração:`, error);
        }
    }
}

