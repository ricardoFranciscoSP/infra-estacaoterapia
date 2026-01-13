import { Request, Response } from "express";
import prisma from "../prisma/client";
import { ConsultaStatusService } from "../services/consultaStatus.service";
import { ProximaConsultaService } from "../services/proximaConsulta.service";
import { AutorTipoCancelamento } from "../types/permissions.types";
import { nowBrasiliaDate } from "../utils/timezone.util";

/**
 * Controller para endpoints internos usados pelo socket-server
 * Estes endpoints não requerem autenticação, pois são chamados internamente
 */
export class InternalController {
    private consultaStatusService: ConsultaStatusService;
    private proximaConsultaService: ProximaConsultaService;

    constructor() {
        this.consultaStatusService = new ConsultaStatusService();
        this.proximaConsultaService = new ProximaConsultaService();
    }

    /**
     * GET /internal/consultas/:consultationId
     * Busca uma consulta por ID
     */
    async getConsulta(req: Request, res: Response): Promise<void> {
        try {
            const { consultationId } = req.params;

            if (!consultationId) {
                res.status(400).json({
                    success: false,
                    error: "ID da consulta é obrigatório"
                });
                return;
            }

            const consulta = await prisma.consulta.findUnique({
                where: { Id: consultationId },
                include: {
                    Paciente: { select: { Id: true } },
                    Psicologo: { select: { Id: true } }
                }
            });

            if (!consulta) {
                res.status(404).json({
                    success: false,
                    error: "Consulta não encontrada"
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: {
                    Id: consulta.Id,
                    PacienteId: consulta.PacienteId,
                    PsicologoId: consulta.PsicologoId,
                    Paciente: consulta.Paciente ? { Id: consulta.Paciente.Id } : undefined,
                    Psicologo: consulta.Psicologo ? { Id: consulta.Psicologo.Id } : undefined
                }
            });
        } catch (error) {
            console.error('[InternalController] Erro ao buscar consulta:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * PATCH /internal/reserva-sessao/:consultationId/join
     * Atualiza timestamp de join na reserva de sessão
     */
    async updateReservaSessaoJoin(req: Request, res: Response): Promise<void> {
        try {
            const { consultationId } = req.params;
            const { field, timestamp } = req.body;

            if (!consultationId || !field || !timestamp) {
                res.status(400).json({
                    success: false,
                    error: "ID da consulta, campo e timestamp são obrigatórios"
                });
                return;
            }

            if (field !== 'PatientJoinedAt' && field !== 'PsychologistJoinedAt') {
                res.status(400).json({
                    success: false,
                    error: "Campo inválido. Deve ser 'PatientJoinedAt' ou 'PsychologistJoinedAt'"
                });
                return;
            }

            const reservaSessao = await prisma.reservaSessao.update({
                where: { ConsultaId: consultationId },
                data: { [field]: new Date(timestamp) },
                include: { Consulta: true }
            });

            res.status(200).json({
                success: true,
                data: reservaSessao
            });
        } catch (error) {
            console.error('[InternalController] Erro ao atualizar join:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * GET /internal/reserva-sessao/:consultationId
     * Busca reserva de sessão por consulta ID
     */
    async getReservaSessao(req: Request, res: Response): Promise<void> {
        try {
            const { consultationId } = req.params;

            if (!consultationId) {
                res.status(400).json({
                    success: false,
                    error: "ID da consulta é obrigatório"
                });
                return;
            }

            const reservaSessao = await prisma.reservaSessao.findUnique({
                where: { ConsultaId: consultationId },
                include: {
                    Consulta: {
                        select: {
                            Id: true,
                            Date: true,
                            Status: true,
                            PsicologoId: true,
                            PacienteId: true,
                            AgendaId: true
                        }
                    }
                }
            });

            if (!reservaSessao) {
                res.status(404).json({
                    success: false,
                    error: "Reserva de sessão não encontrada"
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: reservaSessao
            });
        } catch (error) {
            console.error('[InternalController] Erro ao buscar reserva de sessão:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * GET /internal/notifications/:userId/unread-count
     * Conta notificações não lidas de um usuário
     */
    async countUnreadNotifications(req: Request, res: Response): Promise<void> {
        try {
            const { userId } = req.params;

            if (!userId) {
                res.status(400).json({
                    success: false,
                    error: "ID do usuário é obrigatório"
                });
                return;
            }

            const count = await prisma.notificationStatus.count({
                where: { UserId: userId, Status: "unread" }
            });

            res.status(200).json({
                success: true,
                data: count
            });
        } catch (error) {
            console.error('[InternalController] Erro ao contar notificações:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * PATCH /internal/notifications/:notificationId/read
     * Marca notificação como lida
     */
    async markNotificationAsRead(req: Request, res: Response): Promise<void> {
        try {
            const { notificationId } = req.params;
            const { userId } = req.body;

            if (!notificationId || !userId) {
                res.status(400).json({
                    success: false,
                    error: "ID da notificação e ID do usuário são obrigatórios"
                });
                return;
            }

            await prisma.notificationStatus.updateMany({
                where: {
                    UserId: userId,
                    NotificationId: notificationId,
                    Status: "unread"
                },
                data: {
                    Status: "read",
                    ReadAt: new Date()
                }
            });

            res.status(200).json({
                success: true,
                data: { notificationId, userId }
            });
        } catch (error) {
            console.error('[InternalController] Erro ao marcar notificação como lida:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * PATCH /internal/notifications/:userId/read-all
     * Marca todas as notificações de um usuário como lidas
     */
    async markAllNotificationsAsRead(req: Request, res: Response): Promise<void> {
        try {
            const { userId } = req.params;

            if (!userId) {
                res.status(400).json({
                    success: false,
                    error: "ID do usuário é obrigatório"
                });
                return;
            }

            await prisma.notificationStatus.updateMany({
                where: { UserId: userId, Status: "unread" },
                data: {
                    Status: "read",
                    ReadAt: new Date()
                }
            });

            res.status(200).json({
                success: true,
                data: { userId }
            });
        } catch (error) {
            console.error('[InternalController] Erro ao marcar todas as notificações como lidas:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * GET /internal/configuracoes/:key ou /internal/configuracoes
     * Busca configuração(ões)
     */
    async getConfiguracao(req: Request, res: Response): Promise<void> {
        try {
            const { key } = req.params;

            // O modelo Configuracao é um singleton - sempre busca a primeira/única configuração
            const config = await prisma.configuracao.findFirst();

            if (!config) {
                res.status(404).json({
                    success: false,
                    error: "Configuração não encontrada"
                });
                return;
            }

            // Se uma chave específica foi fornecida, retorna apenas esse campo
            if (key) {
                // Verifica se o campo existe na configuração
                if (key in config) {
                    const value = (config as any)[key];
                    res.status(200).json({
                        success: true,
                        data: {
                            Chave: key,
                            Valor: value !== null && value !== undefined ? String(value) : null
                        }
                    });
                } else {
                    res.status(404).json({
                        success: false,
                        error: `Campo '${key}' não encontrado na configuração`
                    });
                }
                return;
            }

            // Se não há chave, retorna toda a configuração
            res.status(200).json({
                success: true,
                data: config
            });
        } catch (error) {
            console.error('[InternalController] Erro ao buscar configuração:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * GET /internal/users/:userId
     * Busca usuário por ID
     */
    async getUser(req: Request, res: Response): Promise<void> {
        try {
            const { userId } = req.params;

            if (!userId) {
                res.status(400).json({
                    success: false,
                    error: "ID do usuário é obrigatório"
                });
                return;
            }

            const user = await prisma.user.findUnique({
                where: { Id: userId },
                select: {
                    Id: true,
                    Nome: true,
                    Email: true,
                    Role: true
                }
            });

            if (!user) {
                res.status(404).json({
                    success: false,
                    error: "Usuário não encontrado"
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: user
            });
        } catch (error) {
            console.error('[InternalController] Erro ao buscar usuário:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * POST /internal/cancelamento-sessao
     * Cria cancelamento de sessão
     */
    async createCancelamentoSessao(req: Request, res: Response): Promise<void> {
        try {
            const { ConsultaId, Motivo, AutorId, AutorTipo } = req.body;

            if (!ConsultaId || !Motivo || !AutorTipo) {
                res.status(400).json({
                    success: false,
                    error: "ConsultaId, Motivo e AutorTipo são obrigatórios"
                });
                return;
            }

            // Busca a consulta para obter os IDs necessários
            const consulta = await prisma.consulta.findUnique({
                where: { Id: ConsultaId },
                select: {
                    PacienteId: true,
                    PsicologoId: true,
                    Date: true,
                    Time: true
                }
            });

            if (!consulta) {
                res.status(404).json({
                    success: false,
                    error: "Consulta não encontrada"
                });
                return;
            }

            // Gera protocolo único
            const protocolo = `AUTO-${Date.now()}`;

            // Extrai data e horário da consulta
            const dataConsulta = consulta.Date ? new Date(consulta.Date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            const horario = consulta.Time || '00:00';

            const cancelamento = await prisma.cancelamentoSessao.create({
                data: {
                    Protocolo: protocolo,
                    Motivo,
                    Data: dataConsulta,
                    Horario: horario,
                    SessaoId: ConsultaId,
                    PacienteId: consulta.PacienteId || '',
                    PsicologoId: consulta.PsicologoId || '',
                    AutorId: AutorId || '',
                    Status: 'Deferido',
                    Tipo: AutorTipo as AutorTipoCancelamento
                }
            });

            res.status(201).json({
                success: true,
                data: cancelamento
            });
        } catch (error) {
            console.error('[InternalController] Erro ao criar cancelamento:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * POST /internal/consultas/:consultationId/inactivity
     * Processa inatividade de consulta (cancela e processa repasse)
     */
    async processInactivity(req: Request, res: Response): Promise<void> {
        try {
            const { consultationId } = req.params;
            const { missingRole } = req.body;

            if (!consultationId || !missingRole) {
                res.status(400).json({
                    success: false,
                    error: "ID da consulta e missingRole são obrigatórios"
                });
                return;
            }

            if (!['Patient', 'Psychologist', 'Both'].includes(missingRole)) {
                res.status(400).json({
                    success: false,
                    error: "missingRole deve ser 'Patient', 'Psychologist' ou 'Both'"
                });
                return;
            }

            // Processa inatividade usando ConsultaStatusService
            await this.consultaStatusService.processarInatividade(
                consultationId,
                missingRole as 'Patient' | 'Psychologist' | 'Both'
            );

            // Processa repasse financeiro APENAS quando inatividade do paciente
            if (missingRole === 'Patient') {
                try {
                    const { processRepasse } = await import('../jobs/consultationJobs');
                    await processRepasse(consultationId, null);
                    console.log(`✅ [InternalController] Repasse financeiro processado para psicólogo na consulta ${consultationId}`);
                } catch (repasseError) {
                    console.error(`❌ [InternalController] Erro ao processar repasse:`, repasseError);
                    // Não falha a requisição se o repasse falhar
                }
            }

            res.status(200).json({
                success: true,
                data: { consultationId, missingRole }
            });
        } catch (error) {
            console.error('[InternalController] Erro ao processar inatividade:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * POST /internal/proxima-consulta/notificar
     * Notifica ambos os usuários sobre atualização da próxima consulta
     */
    async notificarAmbosUsuarios(req: Request, res: Response): Promise<void> {
        try {
            const { psicologoId, pacienteId, motivo } = req.body;

            if (!psicologoId || !pacienteId || !motivo) {
                res.status(400).json({
                    success: false,
                    error: "psicologoId, pacienteId e motivo são obrigatórios"
                });
                return;
            }

            await this.proximaConsultaService.notificarAmbosUsuarios(
                psicologoId,
                pacienteId,
                motivo
            );

            res.status(200).json({
                success: true,
                data: { psicologoId, pacienteId, motivo }
            });
        } catch (error) {
            console.error('[InternalController] Erro ao notificar usuários:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * GET /internal/proxima-consulta/psicologo/:psicologoId
     * Busca próxima consulta do psicólogo
     */
    async buscarProximaConsulta(req: Request, res: Response): Promise<void> {
        try {
            const { psicologoId } = req.params;

            if (!psicologoId) {
                res.status(400).json({
                    success: false,
                    error: "ID do psicólogo é obrigatório"
                });
                return;
            }

            const proximaConsulta = await this.proximaConsultaService.buscarProximaConsulta(psicologoId);

            res.status(200).json({
                success: true,
                data: proximaConsulta
            });
        } catch (error) {
            console.error('[InternalController] Erro ao buscar próxima consulta:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * GET /internal/proxima-consulta/paciente/:pacienteId
     * Busca próxima consulta do paciente
     */
    async buscarProximaConsultaPaciente(req: Request, res: Response): Promise<void> {
        try {
            const { pacienteId } = req.params;

            if (!pacienteId) {
                res.status(400).json({
                    success: false,
                    error: "ID do paciente é obrigatório"
                });
                return;
            }

            const proximaConsulta = await this.proximaConsultaService.buscarProximaConsultaPaciente(pacienteId);

            res.status(200).json({
                success: true,
                data: proximaConsulta
            });
        } catch (error) {
            console.error('[InternalController] Erro ao buscar próxima consulta do paciente:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }
}

