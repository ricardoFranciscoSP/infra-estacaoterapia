
import { Request, Response } from "express";
import { AuthorizationService } from "../services/authorization.service";
import { ReservaSessaoService } from "../services/reservaSessao.service";
import { normalizeParamString } from "../utils/validation.util";

export class ReservaSessaoController {
    constructor(private authService: AuthorizationService,
        private reservaSessaoService: ReservaSessaoService) { }

    /**
     * Busca reservas do dia atual para um par psicólogo/paciente
     * GET /reserva-sessao/dia-atual?psicologoId=...&pacienteId=...
     */
    async getReservasDiaAtualByPsicologoPaciente(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const { psicologoId, pacienteId } = req.query;
            if (!psicologoId || !pacienteId) {
                return res.status(400).json({ error: 'psicologoId e pacienteId são obrigatórios' });
            }
            const reservas = await this.reservaSessaoService.getReservasDiaAtualByPsicologoPaciente(String(psicologoId), String(pacienteId));
            return res.status(200).json({ success: true, reservas });
        } catch (error) {
            console.error('Erro ao buscar reservas do dia atual:', error);
            return res.status(500).json({ error: 'Erro interno no servidor.' });
        }
    }

    /**
     * Atualiza os tokens de uma reserva
     * POST /reserva-sessao/:id/atualizar-tokens
     */
    async updateTokensReservaSessao(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const id = normalizeParamString(req.params.id);
            if (!id) {
                return res.status(400).json({ error: 'ID da reserva é obrigatório' });
            }
            const { patientToken, psychologistToken, patientUid, psychologistUid } = req.body;
            if (!patientToken || !psychologistToken || !patientUid || !psychologistUid) {
                return res.status(400).json({ error: 'Dados de tokens e UIDs são obrigatórios' });
            }
            const updated = await this.reservaSessaoService.updateTokensReservaSessao(id, {
                patientToken,
                psychologistToken,
                patientUid,
                psychologistUid,
            });
            return res.status(200).json({ success: true, updated });
        } catch (error) {
            console.error('Erro ao atualizar tokens da reserva:', error);
            return res.status(500).json({ error: 'Erro interno no servidor.' });
        }
    }

    /**
     * Busca a reserva de sessão pelo ID para o usuário autenticado.
     * @param req Request do Express contendo id da reserva.
     * @param res Response do Express.
     * @returns Response com reserva encontrada ou erro.
     */
    async getReservaSessao(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const id = normalizeParamString(req.params.id);
            if (!id) {
                return res.status(400).json({ error: 'ID é obrigatório' });
            }
            const reserva = await this.reservaSessaoService.getReservaSessao(id);
            return res.status(200).json(reserva);
        } catch (error) {
            console.error('Erro ao listar reservas:', error);
            return res.status(500).json({ error: 'Erro interno no servidor.' });
        }
    }

    /**
     * Busca a duração sincronizada da sessão do Redis.
     * @param req Request do Express contendo id da consulta.
     * @param res Response do Express.
     * @returns Response com duração encontrada ou null se não existir.
     */
    async getSessionDuration(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const consultationId = normalizeParamString(req.params.id);
            if (!consultationId) {
                return res.status(400).json({ error: 'ID da consulta é obrigatório' });
            }

            const { ConsultaRoomService } = await import('../services/consultaRoom.service');
            const roomService = new ConsultaRoomService();
            const duration = await roomService.getSessionDuration(consultationId);

            return res.status(200).json({
                success: true,
                data: duration
            });
        } catch (error) {
            console.error('Erro ao buscar duração da sessão:', error);
            return res.status(500).json({ error: 'Erro interno no servidor.' });
        }
    }

    /**
     * Busca todos os dados relacionados a uma consulta: ReservaSessao, Agenda e Consulta
     * @param req Request do Express contendo id da consulta.
     * @param res Response do Express.
     * @returns Response com todos os dados relacionados ou erro.
     */
    async getConsultaCompleta(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const consultationId = normalizeParamString(req.params.id);
            if (!consultationId) {
                return res.status(400).json({ error: 'ID da consulta é obrigatório' });
            }

            const result = await this.reservaSessaoService.getConsultaCompleta(consultationId);

            if (!result.success) {
                return res.status(404).json(result);
            }

            return res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao buscar consulta completa:', error);
            return res.status(500).json({ error: 'Erro interno no servidor.' });
        }
    }

    /**
     * Busca todos os dados da ReservaSessao pelo channel (AgoraChannel)
     * Retorna todos os dados necessários para a sala de vídeo: tokens, UIDs, datas, etc.
     * @param req Request do Express contendo channel como parâmetro.
     * @param res Response do Express.
     * @returns Response com todos os dados da ReservaSessao ou erro.
     */
    async getReservaSessaoByChannel(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const channel = normalizeParamString(req.params.channel);

            if (!channel || channel.trim() === '') {
                return res.status(400).json({ error: 'Channel é obrigatório' });
            }

            const result = await this.reservaSessaoService.getReservaSessaoByChannel(channel);

            if (!result.success) {
                return res.status(404).json(result);
            }

            return res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao buscar ReservaSessao por channel:', error);
            return res.status(500).json({ error: 'Erro interno no servidor.' });
        }
    }

    /**
     * Registra entrada de paciente ou psicólogo na sala
     * POST /reserva-sessao/:id/join
     * @param req Request do Express contendo id da consulta e body com userId e role
     * @param res Response do Express
     * @returns Response com sucesso ou erro
     */
    async joinReservaSessao(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const consultationId = normalizeParamString(req.params.id);
            if (!consultationId) {
                return res.status(400).json({ error: 'ID da consulta é obrigatório' });
            }

            const { userId: bodyUserId, role } = req.body;
            const finalUserId = bodyUserId || userId;

            if (!role || (role !== 'Patient' && role !== 'Psychologist')) {
                return res.status(400).json({ error: 'Role deve ser "Patient" ou "Psychologist"' });
            }

            const result = await this.reservaSessaoService.joinReservaSessao(consultationId, finalUserId, role);

            if (!result.success) {
                return res.status(404).json(result);
            }

            // Verifica se ambos entraram e implementa lógica de fechamento se necessário
            const ambosEntraram = result.data?.ambosEntraram;
            const patientJoined = result.data?.PatientJoinedAt !== null;
            const psychologistJoined = result.data?.PsychologistJoinedAt !== null;

            // Se apenas um entrou, agenda verificação e fechamento da sala após 10 minutos do ScheduledAt
            if (!ambosEntraram && (patientJoined || psychologistJoined)) {
                // Busca o ScheduledAt para calcular o tempo correto
                const { ReservaSessaoService } = await import('../services/reservaSessao.service');
                const service = new ReservaSessaoService();
                const reservaData = await service.getReservaSessao(consultationId);
                
                if (reservaData.success && reservaData.data?.ScheduledAt) {
                    const scheduledAt = new Date(reservaData.data.ScheduledAt);
                    const now = new Date();
                    const deadline = new Date(scheduledAt.getTime() + 10 * 60 * 1000); // 10 minutos após ScheduledAt
                    const delayMs = deadline.getTime() - now.getTime();
                    
                    // Se já passou dos 10 minutos, processa imediatamente
                    if (delayMs <= 0) {
                        const rs = reservaData.data as any;
                        const stillOnlyOne = (rs.PatientJoinedAt && !rs.PsychologistJoinedAt) || 
                                            (!rs.PatientJoinedAt && rs.PsychologistJoinedAt);
                        
                        if (stillOnlyOne) {
                            const missingRole: 'Patient' | 'Psychologist' = rs.PatientJoinedAt && !rs.PsychologistJoinedAt
                                ? 'Psychologist'
                                : 'Patient';
                            
                            const { ConsultaStatusService } = await import('../services/consultaStatus.service');
                            const statusService = new ConsultaStatusService();
                            await statusService.processarInatividade(consultationId, missingRole);
                            
                            const { getSocketServer } = await import('../socket/serverInstance');
                            const io = getSocketServer();
                            if (io) {
                                const roomName = `consulta_${consultationId}`;
                                io.to(roomName).emit('room:close', {
                                    reason: 'Apenas um participante entrou na sala',
                                    message: 'A sala foi fechada porque apenas um participante entrou após 10 minutos. Por favor, entre em contato com o suporte.'
                                });
                            }
                            
                            console.log(`⚠️ [joinReservaSessao] Sala ${consultationId} fechada imediatamente - apenas ${missingRole === 'Patient' ? 'psicólogo' : 'paciente'} entrou e já passaram 10 minutos`);
                        }
                    } else {
                        // Agenda verificação após 10 minutos do ScheduledAt
                        setTimeout(async () => {
                            try {
                                const checkResult = await service.getReservaSessao(consultationId);
                                
                                if (checkResult.success && checkResult.data) {
                                    const rs = checkResult.data as any;
                                    const stillOnlyOne = (rs.PatientJoinedAt && !rs.PsychologistJoinedAt) || 
                                                        (!rs.PatientJoinedAt && rs.PsychologistJoinedAt);
                                    
                                    if (stillOnlyOne) {
                                        // Determina qual participante não entrou
                                        const missingRole: 'Patient' | 'Psychologist' = rs.PatientJoinedAt && !rs.PsychologistJoinedAt
                                            ? 'Psychologist'
                                            : 'Patient';
                                        
                                        // Usa processarInatividade para atualizar todos os status corretamente
                                        // Isso atualiza: Consulta, ReservaSessao (via trigger), Agenda (via trigger)
                                        const { ConsultaStatusService } = await import('../services/consultaStatus.service');
                                        const statusService = new ConsultaStatusService();
                                        await statusService.processarInatividade(consultationId, missingRole);
                                        
                                        // Fecha a sala via socket
                                        const { getSocketServer } = await import('../socket/serverInstance');
                                        const io = getSocketServer();

                                        if (io) {
                                            const roomName = `consulta_${consultationId}`;
                                            io.to(roomName).emit('room:close', {
                                                reason: 'Apenas um participante entrou na sala',
                                                message: 'A sala foi fechada porque apenas um participante entrou após 10 minutos. Por favor, entre em contato com o suporte.'
                                            });
                                        }
                                        
                                        console.log(`⚠️ [joinReservaSessao] Sala ${consultationId} fechada após 10 minutos - apenas ${missingRole === 'Patient' ? 'psicólogo' : 'paciente'} entrou`);
                                    }
                                }
                            } catch (error) {
                                console.error(`❌ [joinReservaSessao] Erro ao verificar e fechar sala:`, error);
                            }
                        }, delayMs); // Delay calculado baseado no ScheduledAt + 10 minutos
                        
                        console.log(`⏰ [joinReservaSessao] Verificação de inatividade agendada para ${consultationId} em ${Math.round(delayMs / 1000)}s (10 minutos após ScheduledAt)`);
                    }
                } else {
                    // Fallback: se não conseguir buscar ScheduledAt, usa 10 minutos a partir de agora
                    console.warn(`⚠️ [joinReservaSessao] Não foi possível buscar ScheduledAt para ${consultationId}, usando fallback de 10 minutos`);
                    setTimeout(async () => {
                        try {
                            const { ReservaSessaoService } = await import('../services/reservaSessao.service');
                            const service = new ReservaSessaoService();
                            const checkResult = await service.getReservaSessao(consultationId);
                            
                            if (checkResult.success && checkResult.data) {
                                const rs = checkResult.data as any;
                                const stillOnlyOne = (rs.PatientJoinedAt && !rs.PsychologistJoinedAt) || 
                                                    (!rs.PatientJoinedAt && rs.PsychologistJoinedAt);
                                
                                if (stillOnlyOne) {
                                    const missingRole: 'Patient' | 'Psychologist' = rs.PatientJoinedAt && !rs.PsychologistJoinedAt
                                        ? 'Psychologist'
                                        : 'Patient';
                                    
                                    const { ConsultaStatusService } = await import('../services/consultaStatus.service');
                                    const statusService = new ConsultaStatusService();
                                    await statusService.processarInatividade(consultationId, missingRole);
                                    
                                    const { getSocketServer } = await import('../socket/serverInstance');
                                    const io = getSocketServer();
                                    if (io) {
                                        const roomName = `consulta_${consultationId}`;
                                        io.to(roomName).emit('room:close', {
                                            reason: 'Apenas um participante entrou na sala',
                                            message: 'A sala foi fechada porque apenas um participante entrou após 10 minutos. Por favor, entre em contato com o suporte.'
                                        });
                                    }
                                }
                            }
                        } catch (error) {
                            console.error(`❌ [joinReservaSessao] Erro ao verificar e fechar sala (fallback):`, error);
                        }
                    }, 10 * 60 * 1000); // 10 minutos como fallback
                }
            }

            return res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao registrar entrada na sala:', error);
            return res.status(500).json({ error: 'Erro interno no servidor.' });
        }
    }
}
