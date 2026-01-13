import { Request, Response } from "express";
import { AuthorizationService } from "../../services/authorization.service";
import { ConfiguracoesService } from "../../services/adm/configuracoes.service";
import { logConfigOperation, logAuditFromRequest } from "../../utils/auditLogger.util";
import { ActionType, Module } from "../../types/permissions.types";
import { getClientIp } from "../../utils/getClientIp.util";
import { normalizeParamString, normalizeQueryString } from "../../utils/validation.util";

export class ConfiguracoesController {
    private service: ConfiguracoesService;
    private authService: AuthorizationService;

    constructor(
        authService: AuthorizationService = new AuthorizationService(),
        service: ConfiguracoesService = new ConfiguracoesService(authService)
    ) {
        this.authService = authService;
        this.service = service;
    }

    async getRedes(req: Request, res: Response): Promise<Response> {
        return this.service.getRedes(req, res);
    }

    async getRedesPublic(req: Request, res: Response): Promise<Response> {
        const redes = await this.service.getRedesPublic();
        if (redes) {
            return res.status(200).json(redes);
        }
        return res.status(404).json({ error: "Redes sociais não encontradas." });
    }

    async updateRedes(req: Request, res: Response): Promise<Response> {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        return this.service.updateRedes(req, res, user);
    }

    async createRedes(req: Request, res: Response): Promise<Response> {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        return this.service.createRedes(req, res, user);
    }

    async deleteRedes(req: Request, res: Response): Promise<Response> {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        return this.service.deleteRedes(req, res, user);
    }

    async getFaq(req: Request, res: Response): Promise<Response> {
        return this.service.getFaq(req, res);
    }

    async getFaqPublic(req: Request, res: Response): Promise<Response> {
        return this.service.getFaqPublic(req, res);
    }

    async updateFaq(req: Request, res: Response): Promise<Response> {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        return this.service.updateFaq(req, res, user);
    }

    async createFaq(req: Request, res: Response): Promise<Response> {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        return this.service.createFaq(req, res, user);
    }

    async createFaqsBulk(req: Request, res: Response): Promise<Response> {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        return this.service.createFaqsBulk(req, res, user);
    }

    async deleteFaq(req: Request, res: Response): Promise<Response> {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        return this.service.deleteFaq(req, res, user);
    }

    /* Métodos genéricos para outras configurações*/
    async getAll(req: Request, res: Response): Promise<Response> {
        return this.service.getAll(req, res);
    }

    async getById(req: Request, res: Response): Promise<Response> {
        return this.service.getById(req, res);
    }

    async create(req: Request, res: Response): Promise<Response> {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const originalJson = res.json.bind(res);
        const configKey = req.body.key || req.body.Id || 'N/A';
        
        res.json = function(data: any) {
            // Registrar auditoria após sucesso
            if (data && !data.error) {
                try {
                    logConfigOperation(
                        user.Id,
                        ActionType.Create,
                        configKey,
                        req.body.value || undefined,
                        getClientIp(req)
                    ).catch(err => console.error('[ConfiguracoesController] Erro ao registrar auditoria:', err));
                } catch (auditError) {
                    console.error('[ConfiguracoesController] Erro ao registrar auditoria:', auditError);
                }
            }
            return originalJson(data);
        };
        
        return this.service.create(req, res, user);
    }

    async update(req: Request, res: Response): Promise<Response> {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const originalJson = res.json.bind(res);
        const configKey = req.body.key || req.params.id || 'N/A';
        
        res.json = function(data: any) {
            // Registrar auditoria após sucesso
            if (data && !data.error) {
                try {
                    logConfigOperation(
                        user.Id,
                        ActionType.Update,
                        configKey,
                        req.body.value || undefined,
                        getClientIp(req)
                    ).catch(err => console.error('[ConfiguracoesController] Erro ao registrar auditoria:', err));
                } catch (auditError) {
                    console.error('[ConfiguracoesController] Erro ao registrar auditoria:', auditError);
                }
            }
            return originalJson(data);
        };
        
        return this.service.update(req, res, user);
    }

    async delete(req: Request, res: Response): Promise<Response> {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const originalJson = res.json.bind(res);
        const configKey = normalizeParamString(req.params.id) || 'N/A';
        
        res.json = function(data: any) {
            // Registrar auditoria após sucesso
            if (data && !data.error) {
                try {
                    logConfigOperation(
                        user.Id,
                        ActionType.Delete,
                        configKey,
                        undefined,
                        getClientIp(req)
                    ).catch(err => console.error('[ConfiguracoesController] Erro ao registrar auditoria:', err));
                } catch (auditError) {
                    console.error('[ConfiguracoesController] Erro ao registrar auditoria:', auditError);
                }
            }
            return originalJson(data);
        };
        
        return this.service.delete(req, res, user);
    }

    async getIntegrationsPublic(req: Request, res: Response): Promise<Response> {
        return this.service.getIntegrationsPublic(req, res);
    }

    async getMaintenanceStatus(req: Request, res: Response): Promise<Response> {
        return this.service.getMaintenanceStatus(req, res);
    }
}
