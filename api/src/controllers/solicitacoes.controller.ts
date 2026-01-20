import { Request, Response } from "express";
import { AuthorizationService } from "../services/authorization.service";
import { SolicitacoesService } from "../services/solicitacoes.service";
import { ISolicitacao } from "../types/solicitacoes.types";
import { WebSocketNotificationService } from "../services/websocketNotification.service";
import { NotificationService } from "../services/notification.service";
import { Module, ActionType, Role } from "../types/permissions.types";
import { isSolicitacaoFinanceira } from "../constants/tiposSolicitacao";
import prisma from "../prisma/client";
import { logSolicitacaoCreate, logSolicitacaoUpdate, logSolicitacaoDelete, logAuditFromRequest } from "../utils/auditLogger.util";
import { getClientIp } from "../utils/getClientIp.util";
import { normalizeParamStringRequired, normalizeQueryString } from "../utils/validation.util";

const parseBoolean = (value: unknown): boolean =>
    value === true || value === 'true' || value === '1' || value === 1;

const parseStringArray = (value: unknown): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) {
        return value.map(String).filter(Boolean);
    }
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                return parsed.map(String).filter(Boolean);
            }
        } catch {
            return value.split(',').map((item) => item.trim()).filter(Boolean);
        }
    }
    return [];
};

export class SolicitacoesController {
    private authService: AuthorizationService;
    private solicitacoesService: SolicitacoesService;
    private notificationService: NotificationService;

    constructor() {
        this.authService = new AuthorizationService();
        this.solicitacoesService = new SolicitacoesService();
        this.notificationService = new NotificationService(new WebSocketNotificationService());
    }

    async createSolicitacao(req: Request, res: Response) {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            
            // Log para debug
            console.log('[SolicitacoesController] createSolicitacao chamado com:', {
                hasFile: !!req.file,
                fileName: req.file?.originalname,
                fileSize: req.file?.size,
                mimeType: req.file?.mimetype,
                body: req.body
            });

            const destinatariosIdsRaw = req.body.DestinatariosIds ?? req.body.destinatariosIds ?? req.body['DestinatariosIds[]'];
            const data = {
                ...(req.body as Omit<ISolicitacao, 'Id' | 'CreatedAt' | 'UpdatedAt' | 'Protocol'>),
                PublicoTodos: parseBoolean(req.body.PublicoTodos ?? req.body.publicoTodos),
                PublicoPacientes: parseBoolean(req.body.PublicoPacientes ?? req.body.publicoPacientes),
                PublicoPsicologos: parseBoolean(req.body.PublicoPsicologos ?? req.body.publicoPsicologos),
                PublicoFinanceiro: parseBoolean(req.body.PublicoFinanceiro ?? req.body.publicoFinanceiro),
                DestinatariosIds: parseStringArray(destinatariosIdsRaw)
            };
            const file = req.file as Express.Multer.File | undefined;
            const result = await this.solicitacoesService.createSolicitacao(userId, data, file);

            // Registrar auditoria
            if (result.success && result.protocol) {
                try {
                    // Buscar a solicitação criada para obter o ID e título
                    const solicitacaoCriada = await prisma.solicitacoes.findFirst({
                        where: { Protocol: result.protocol, UserId: userId },
                        select: { Id: true, Title: true, Protocol: true, Tipo: true }
                    });

                    if (solicitacaoCriada) {
                        await logSolicitacaoCreate(
                            userId,
                            solicitacaoCriada.Id,
                            solicitacaoCriada.Protocol,
                            data.Tipo || 'N/A',
                            data.Title || 'Sem título',
                            getClientIp(req)
                        );
                    }
                } catch (auditError) {
                    console.error('[SolicitacoesController] Erro ao registrar auditoria:', auditError);
                    // Não falha a criação se a auditoria falhar
                }
            }

            return res.status(result.success ? 201 : 400).json(result);
        } catch (error) {
            console.error('[SolicitacoesController] Erro ao criar solicitação:', error);
            return res.status(500).json({ success: false, message: 'Erro ao criar solicitação' });
        }
    }

    async getMySolicitacoes(req: Request, res: Response) {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const userRole = await this.authService.getUserRole(userId);
            const result = await this.solicitacoesService.getSolicitacoesByUserId(userId, userRole || undefined);
            return res.status(result.success ? 200 : 404).json(result);
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Erro ao buscar solicitações' });
        }
    }

    async getSolicitacoesByUserId(req: Request, res: Response) {
        try {
            const userId = normalizeParamStringRequired(req.params.userId);
            if (!userId) {
                return res.status(400).json({ success: false, message: 'UserId é obrigatório' });
            }
            const targetUser = await prisma.user.findUnique({
                where: { Id: userId },
                select: { Role: true }
            });
            const result = await this.solicitacoesService.getSolicitacoesByUserId(userId, targetUser?.Role);
            return res.status(result.success ? 200 : 404).json(result);
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Erro ao buscar solicitações' });
        }
    }

    async updateSolicitacaoStatus(req: Request, res: Response) {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            }

            const { solicitacaoId, status } = req.body;

            // Buscar solicitação antes de atualizar para registrar status anterior
            const solicitacaoAntes = await prisma.solicitacoes.findUnique({
                where: { Id: solicitacaoId },
                select: { Status: true, Protocol: true }
            });

            const result = await this.solicitacoesService.updateSolicitacaoStatus(solicitacaoId, status);

            // Registrar auditoria
            if (result.success && solicitacaoAntes) {
                try {
                    await logSolicitacaoUpdate(
                        userId,
                        solicitacaoId,
                        solicitacaoAntes.Protocol,
                        solicitacaoAntes.Status || 'N/A',
                        status,
                        getClientIp(req)
                    );
                } catch (auditError) {
                    console.error('[SolicitacoesController] Erro ao registrar auditoria:', auditError);
                    // Não falha a atualização se a auditoria falhar
                }
            }

            // Enviar notificações persistentes e em tempo real se o status foi atualizado com sucesso
            if (result.success) {
                try {
                    // Buscar a solicitação para obter o criador
                    const solicitacao = await prisma.solicitacoes.findUnique({
                        where: { Id: solicitacaoId },
                        select: { UserId: true, Title: true, Protocol: true, Tipo: true }
                    });

                    if (!solicitacao) {
                        return;
                    }

                    const notifyMessage = `O status da solicitação "${solicitacao.Title || solicitacao.Protocol}" foi atualizado para: ${status}`;

                    // Buscar usuários financeiros (apenas se for solicitação financeira)
                    const shouldNotifyFinance = isSolicitacaoFinanceira(solicitacao.Tipo || "");
                    const financeiros = shouldNotifyFinance
                        ? await prisma.user.findMany({
                            where: { Role: 'Finance', Status: 'Ativo' },
                            select: { Id: true }
                        })
                        : [];

                    // Buscar dados do criador da solicitação
                    const criador = await prisma.user.findUnique({
                        where: { Id: solicitacao.UserId },
                        select: { Id: true }
                    });

                    // Notificar todos os usuários financeiros
                    for (const financeiro of financeiros) {
                        await this.notificationService.sendNotification({
                            userId: financeiro.Id,
                            title: 'Status da Solicitação Atualizado',
                            message: notifyMessage,
                            type: 'info'
                        });
                    }

                    // Notificar o criador da solicitação
                    if (criador) {
                        await this.notificationService.sendNotification({
                            userId: criador.Id,
                            title: 'Status da Sua Solicitação Atualizado',
                            message: notifyMessage,
                            type: 'info'
                        });
                    }
                } catch (notifError) {
                    console.error('[SolicitacoesController] Erro ao enviar notificações:', notifError);
                    // Não falha a atualização se a notificação falhar
                }
            }

            return res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            console.error('[SolicitacoesController] Erro ao atualizar status:', error);
            return res.status(500).json({ success: false, message: 'Erro ao atualizar status da solicitação' });
        }
    }

    async getAll(req: Request, res: Response) {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            }

            // Obter role do usuário
            const userRole = await this.authService.getUserRole(userId);

            // Verificar se conseguiu obter o role
            if (!userRole) {
                console.error('[SolicitacoesController] Não foi possível obter o role do usuário:', userId);
                return res.status(403).json({ success: false, message: 'Não foi possível determinar as permissões do usuário' });
            }

            // Verificar permissão baseada no role
            if (userRole === Role.Psychologist) {
                // Psicólogo pode ver apenas suas próprias solicitações
                const result = await this.solicitacoesService.getAll(userId, userRole);
                return res.status(result.success ? 200 : 400).json(result);
            } else if (userRole === Role.Finance) {
                // Financeiro pode ver apenas solicitações financeiras
                const result = await this.solicitacoesService.getAll(userId, userRole);
                return res.status(result.success ? 200 : 400).json(result);
            } else if (userRole === Role.Admin || userRole === Role.Management) {
                // Admin e Management veem todas as solicitações
                const result = await this.solicitacoesService.getAll(userId, userRole);
                return res.status(result.success ? 200 : 400).json(result);
            } else {
                // Outros roles precisam de permissão específica
                const hasPermission = await this.authService.checkPermission(
                    userId,
                    Module.Finance,
                    ActionType.Read
                );

                if (!hasPermission) {
                    return res.status(403).json({ success: false, message: 'Acesso negado. Permissão necessária para visualizar solicitações.' });
                }

                const result = await this.solicitacoesService.getAll(userId, userRole);
                return res.status(result.success ? 200 : 400).json(result);
            }
        } catch (error) {
            console.error('[SolicitacoesController] Erro em getAll:', error);
            return res.status(500).json({ success: false, message: 'Erro ao buscar solicitações' });
        }
    }

    async getFinanceSolicitacoes(req: Request, res: Response) {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            }

            const userRole = await this.authService.getUserRole(userId);

            if (!userRole) {
                return res.status(403).json({ success: false, message: 'Não foi possível determinar as permissões do usuário' });
            }

            const allowedRoles: Role[] = [Role.Finance, Role.Admin, Role.Management];

            if (!allowedRoles.includes(userRole)) {
                const hasPermission = await this.authService.checkPermission(
                    userId,
                    Module.Finance,
                    ActionType.Read
                );

                if (!hasPermission) {
                    return res.status(403).json({ success: false, message: 'Acesso negado. Permissão necessária para visualizar solicitações financeiras.' });
                }
            }

            const result = await this.solicitacoesService.getFinanceSolicitacoes();
            return res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            console.error('[SolicitacoesController] Erro em getFinanceSolicitacoes:', error);
            return res.status(500).json({ success: false, message: 'Erro ao buscar solicitações financeiras' });
        }
    }

    async getSolicitacaoDocumentUrl(req: Request, res: Response) {
        try {
            const solicitacaoId = normalizeParamStringRequired(req.params.solicitacaoId);
            if (!solicitacaoId) {
                return res.status(400).json({ success: false, message: 'SolicitacaoId é obrigatório' });
            }
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            }

            const userRole = await this.authService.getUserRole(userId);
            const result = await this.solicitacoesService.getSolicitacaoDocumentUrl(solicitacaoId, userId, userRole || undefined);

            if (!result.success) {
                return res.status(403).json(result);
            }

            return res.status(200).json({
                success: true,
                url: result.url,
                expiresAt: result.expiresAt
            });
        } catch (error) {
            console.error('[SolicitacoesController] Erro ao buscar URL do documento:', error);
            return res.status(500).json({ success: false, message: 'Erro ao buscar URL do documento' });
        }
    }

    async delete(req: Request, res: Response) {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            }

            const solicitacaoId = normalizeParamStringRequired(req.params.solicitacaoId);
            if (!solicitacaoId) {
                return res.status(400).json({ success: false, message: 'SolicitacaoId é obrigatório' });
            }

            // Buscar solicitação antes de deletar para registrar auditoria
            const solicitacao = await prisma.solicitacoes.findUnique({
                where: { Id: solicitacaoId },
                select: { Protocol: true }
            });

            const result = await this.solicitacoesService.delete(solicitacaoId);

            // Registrar auditoria
            if (result.success && solicitacao) {
                try {
                    await logSolicitacaoDelete(
                        userId,
                        solicitacaoId,
                        solicitacao.Protocol,
                        getClientIp(req)
                    );
                } catch (auditError) {
                    console.error('[SolicitacoesController] Erro ao registrar auditoria:', auditError);
                    // Não falha a exclusão se a auditoria falhar
                }
            }

            return res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            console.error('[SolicitacoesController] Erro ao excluir solicitação:', error);
            return res.status(500).json({ success: false, message: 'Erro ao excluir solicitação' });
        }
    }

    async filter(req: Request, res: Response) {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            }

            const userRole = await this.authService.getUserRole(userId);
            if (!userRole) {
                return res.status(403).json({ success: false, message: 'Não foi possível determinar as permissões do usuário' });
            }

            if (userRole !== Role.Psychologist && userRole !== Role.Finance && userRole !== Role.Admin && userRole !== Role.Management) {
                const hasPermission = await this.authService.checkPermission(userId, Module.Finance, ActionType.Read);
                if (!hasPermission) {
                    return res.status(403).json({ success: false, message: 'Acesso negado. Permissão necessária para filtrar solicitações.' });
                }
            }

            const tipo = normalizeQueryString(req.query.tipo);
            const status = normalizeQueryString(req.query.status);
            const Protocol = normalizeQueryString(req.query.Protocol);
            const Title = normalizeQueryString(req.query.Title);
            const startDate = normalizeQueryString(req.query.startDate);
            const endDate = normalizeQueryString(req.query.endDate);
            const baseResult = await this.solicitacoesService.filter({
                tipo: tipo || undefined,
                status: status || undefined,
                Protocol: Protocol || undefined,
                Title: Title || undefined,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined
            });

            if (!baseResult.success || !baseResult.solicitacoes) {
                return res.status(baseResult.success ? 200 : 400).json(baseResult);
            }

            let solicitacoes = baseResult.solicitacoes;

            if (userRole === Role.Psychologist) {
                solicitacoes = solicitacoes.filter(s => s.UserId === userId);
            }

            if (userRole === Role.Finance) {
                solicitacoes = solicitacoes.filter(s => isSolicitacaoFinanceira(s.Tipo));
            }

            return res.status(200).json({ success: true, solicitacoes, message: baseResult.message });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Erro ao filtrar solicitações' });
        }
    }

    async addResponse(req: Request, res: Response) {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const solicitacaoId = normalizeParamStringRequired(req.params.solicitacaoId);
            if (!solicitacaoId) {
                return res.status(400).json({ success: false, message: 'SolicitacaoId é obrigatório' });
            }
            const { mensagem, status } = req.body;

            if (!mensagem || !mensagem.trim()) {
                return res.status(400).json({ success: false, message: 'Mensagem é obrigatória' });
            }

            // Verificar role do usuário
            const userRole = await this.authService.getUserRole(userId);
            const isAdmin = userRole === Role.Admin || userRole === Role.Management;

            // Buscar solicitação para verificar ownership
            const allSolicitacoes = await this.solicitacoesService.getAll();
            const solicitacao = allSolicitacoes.solicitacoes?.find(s => s.Id === solicitacaoId);

            if (!solicitacao) {
                return res.status(404).json({ success: false, message: 'Solicitação não encontrada' });
            }

            // Verificar permissão: deve ser admin ou dono da solicitação
            const isOwner = solicitacao.UserId === userId;
            if (!isOwner && !isAdmin) {
                return res.status(403).json({ success: false, message: 'Acesso negado' });
            }

            // Determinar autor baseado no role do usuário
            const user = (req as any).user;
            const userRoleFromUser = user?.Role;

            // Se for admin, marca como admin; caso contrário, mantém como 'paciente' (que inclui psicólogos que são donos)
            const autor: 'paciente' | 'admin' = isAdmin ? 'admin' : 'paciente';
            const autorNome = user?.Nome || req.body.autorNome || undefined;

            const result = await this.solicitacoesService.addResponse(solicitacaoId, mensagem, autor, autorNome, status);

            // Registrar auditoria
            if (result.success) {
                try {
                    const solicitacaoParaAudit = await prisma.solicitacoes.findUnique({
                        where: { Id: solicitacaoId },
                        select: { Protocol: true, Status: true }
                    });
                    
                    if (solicitacaoParaAudit) {
                        await logAuditFromRequest(
                            req,
                            userId,
                            ActionType.Update,
                            Module.Notifications,
                            `Resposta adicionada à solicitação: Protocolo ${solicitacaoParaAudit.Protocol}${status ? ` - Status alterado para: ${status}` : ''}`,
                            'Sucesso',
                            {
                                solicitacaoId,
                                protocolo: solicitacaoParaAudit.Protocol,
                                autor,
                                autorNome,
                                statusAnterior: solicitacaoParaAudit.Status,
                                statusNovo: status || solicitacaoParaAudit.Status,
                            }
                        );
                    }
                } catch (auditError) {
                    console.error('[SolicitacoesController] Erro ao registrar auditoria:', auditError);
                    // Não falha a resposta se a auditoria falhar
                }
            }

            // Enviar notificações persistentes e em tempo real se a resposta foi adicionada com sucesso
            if (result.success) {
                try {
                    // Buscar a solicitação para obter o criador
                    const solicitacao = await prisma.solicitacoes.findUnique({
                        where: { Id: solicitacaoId },
                        select: { UserId: true, Title: true, Protocol: true, Tipo: true }
                    });

                    if (!solicitacao) {
                        return;
                    }

                    const autorNomeDisplay = autorNome || (autor === 'admin' ? 'Administrador' : 'Usuário');
                    const notifyMessage = `${autorNomeDisplay} adicionou uma resposta na solicitação "${solicitacao.Title || solicitacao.Protocol}"`;

                    // Buscar usuários financeiros (apenas se for solicitação financeira)
                    const shouldNotifyFinance = isSolicitacaoFinanceira(solicitacao.Tipo || "");
                    const financeiros = shouldNotifyFinance
                        ? await prisma.user.findMany({
                            where: { Role: 'Finance', Status: 'Ativo' },
                            select: { Id: true }
                        })
                        : [];

                    // Buscar dados do criador da solicitação
                    const criador = await prisma.user.findUnique({
                        where: { Id: solicitacao.UserId },
                        select: { Id: true }
                    });

                    // Notificar todos os usuários financeiros (exceto se foi um financeiro que respondeu)
                    for (const financeiro of financeiros) {
                        if (financeiro.Id !== userId) {
                            await this.notificationService.sendNotification({
                                userId: financeiro.Id,
                                title: 'Nova Resposta na Solicitação',
                                message: notifyMessage,
                                type: 'info'
                            });
                        }
                    }

                    // Notificar o criador da solicitação (exceto se foi ele mesmo que respondeu)
                    if (criador && criador.Id !== userId) {
                        await this.notificationService.sendNotification({
                            userId: criador.Id,
                            title: 'Nova Resposta na Sua Solicitação',
                            message: notifyMessage,
                            type: 'info'
                        });
                    }
                } catch (notifError) {
                    console.error('[SolicitacoesController] Erro ao enviar notificações:', notifError);
                    // Não falha a resposta se a notificação falhar
                }
            }

            return res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            console.error('[SolicitacoesController] Erro ao adicionar resposta:', error);
            return res.status(500).json({ success: false, message: 'Erro ao adicionar resposta' });
        }
    }
}
