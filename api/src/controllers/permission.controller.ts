import { Request, Response } from 'express';
import { AuthorizationService } from "../services/authorization.service";
import { PermissionService } from '../services/permission.service';
import { Role, ActionType, Module } from '../types/permissions.types';
import { logPermissionOperation, logAuditFromRequest } from '../utils/auditLogger.util';
import { getClientIp } from '../utils/getClientIp.util';

export class PermissionController {
    constructor(
        private authService: AuthorizationService,
        private permissionService: PermissionService
    ) { }

    /**
     * Verifica se o usuário é Admin ou Management
     */
    private async checkAdminAccess(req: Request): Promise<boolean> {
        const userId = this.authService.getLoggedUserId(req);
        if (!userId) return false;

        const userRole = await this.authService.getUserRole(userId);
        return userRole === Role.Admin || userRole === Role.Management;
    }

    /**
     * Lista todas as permissões do sistema (apenas Admin/Management).
     * @param req Request do Express.
     * @param res Response do Express.
     * @returns Response com lista de permissões ou erro.
     */
    async listPermissions(req: Request, res: Response): Promise<void> {
        try {
            if (!(await this.checkAdminAccess(req))) {
                res.status(403).json({ message: "Acesso negado", success: false });
                return;
            }

            const permissions = await this.permissionService.listPermissions();
            res.status(200).json({ success: true, data: permissions });
        } catch (error) {
            console.error("Erro ao listar permissões:", error);
            res.status(500).json({ error: "Erro ao listar permissões.", success: false });
        }
    }

    /**
     * Cria uma nova permissão (apenas Admin/Management).
     */
    async createPermission(req: Request, res: Response): Promise<void> {
        try {
            if (!(await this.checkAdminAccess(req))) {
                res.status(403).json({ message: "Acesso negado", success: false });
                return;
            }

            const permissionData = req.body;
            const permission = await this.permissionService.createPermission(permissionData);
            
            // Registrar auditoria
            const userId = this.authService.getLoggedUserId(req);
            if (userId && permission) {
                try {
                    await logAuditFromRequest(
                        req,
                        userId,
                        ActionType.Create,
                        Module.Permission,
                        `Permissão criada: ${permissionData.module || 'N/A'}/${permissionData.action || 'N/A'}`,
                        'Sucesso',
                        { permissionId: permission.Id, ...permissionData }
                    );
                } catch (auditError) {
                    console.error('[PermissionController] Erro ao registrar auditoria:', auditError);
                }
            }
            
            res.status(201).json({ success: true, data: permission });
        } catch (error) {
            console.error("Erro ao criar permissão:", error);
            res.status(500).json({ error: "Erro ao criar permissão.", success: false });
        }
    }

    /**
     * Atualiza uma permissão existente (apenas Admin/Management).
     */
    async updatePermission(req: Request, res: Response): Promise<void> {
        try {
            if (!(await this.checkAdminAccess(req))) {
                res.status(403).json({ message: "Acesso negado", success: false });
                return;
            }

            const { id } = req.params;
            const permissionData = req.body;
            const permission = await this.permissionService.updatePermission(id, permissionData);
            res.status(200).json({ success: true, data: permission });
        } catch (error) {
            console.error("Erro ao atualizar permissão:", error);
            res.status(500).json({ error: "Erro ao atualizar permissão.", success: false });
        }
    }

    /**
     * Deleta uma permissão (apenas Admin/Management).
     */
    async deletePermission(req: Request, res: Response): Promise<void> {
        try {
            if (!(await this.checkAdminAccess(req))) {
                res.status(403).json({ message: "Acesso negado", success: false });
                return;
            }

            const { id } = req.params;
            await this.permissionService.deletePermission(id);
            res.status(200).json({ success: true, message: "Permissão deletada com sucesso" });
        } catch (error) {
            console.error("Erro ao deletar permissão:", error);
            res.status(500).json({ error: "Erro ao deletar permissão.", success: false });
        }
    }

    /**
     * Lista permissões por role
     */
    async getPermissionsByRole(req: Request, res: Response): Promise<void> {
        try {
            if (!(await this.checkAdminAccess(req))) {
                res.status(403).json({ message: "Acesso negado", success: false });
                return;
            }

            const { role } = req.params;
            const permissions = await this.permissionService.getPermissionsByRole(role as any);
            res.status(200).json({ success: true, data: permissions });
        } catch (error) {
            console.error("Erro ao listar permissões do role:", error);
            res.status(500).json({ error: "Erro ao listar permissões do role.", success: false });
        }
    }

    /**
     * Cria múltiplas permissões para um role
     */
    async bulkCreateRolePermissions(req: Request, res: Response): Promise<void> {
        try {
            if (!(await this.checkAdminAccess(req))) {
                res.status(403).json({ message: "Acesso negado", success: false });
                return;
            }

            const data = req.body;
            const permissions = await this.permissionService.bulkCreateRolePermissions(data);
            res.status(201).json({ success: true, data: permissions });
        } catch (error) {
            console.error("Erro ao criar permissões do role:", error);
            res.status(500).json({ error: "Erro ao criar permissões do role.", success: false });
        }
    }

    // ===================== USER PERMISSIONS =====================

    /**
     * Lista permissões de um usuário específico
     */
    async getUserPermissions(req: Request, res: Response): Promise<void> {
        try {
            if (!(await this.checkAdminAccess(req))) {
                res.status(403).json({ message: "Acesso negado", success: false });
                return;
            }

            const { userId } = req.params;
            const permissions = await this.permissionService.getUserPermissions(userId);
            res.status(200).json({ success: true, data: permissions });
        } catch (error) {
            console.error("Erro ao listar permissões do usuário:", error);
            res.status(500).json({ error: "Erro ao listar permissões do usuário.", success: false });
        }
    }

    /**
     * Cria ou atualiza permissão de usuário específico
     */
    async createUserPermission(req: Request, res: Response): Promise<void> {
        try {
            if (!(await this.checkAdminAccess(req))) {
                res.status(403).json({ message: "Acesso negado", success: false });
                return;
            }

            const data = req.body;
            const permission = await this.permissionService.createUserPermission(data);
            
            // Registrar auditoria
            const userId = this.authService.getLoggedUserId(req);
            if (userId && permission && data.userId) {
                try {
                    await logPermissionOperation(
                        userId,
                        ActionType.Create,
                        data.userId,
                        data.module || 'N/A',
                        data.action || 'N/A',
                        getClientIp(req)
                    );
                } catch (auditError) {
                    console.error('[PermissionController] Erro ao registrar auditoria:', auditError);
                }
            }
            
            res.status(201).json({ success: true, data: permission });
        } catch (error) {
            console.error("Erro ao criar permissão do usuário:", error);
            res.status(500).json({ error: "Erro ao criar permissão do usuário.", success: false });
        }
    }

    /**
     * Cria múltiplas permissões para um usuário específico
     */
    async bulkCreateUserPermissions(req: Request, res: Response): Promise<void> {
        try {
            if (!(await this.checkAdminAccess(req))) {
                res.status(403).json({ message: "Acesso negado", success: false });
                return;
            }

            const data = req.body;
            const permissions = await this.permissionService.bulkCreateUserPermissions(data);
            res.status(201).json({ success: true, data: permissions });
        } catch (error) {
            console.error("Erro ao criar permissões do usuário:", error);
            res.status(500).json({ error: "Erro ao criar permissões do usuário.", success: false });
        }
    }

    /**
     * Remove permissão específica de usuário
     */
    async deleteUserPermission(req: Request, res: Response): Promise<void> {
        try {
            if (!(await this.checkAdminAccess(req))) {
                res.status(403).json({ message: "Acesso negado", success: false });
                return;
            }

            const { userId, module, action } = req.params;
            await this.permissionService.deleteUserPermission(userId, module as any, action as any);
            
            // Registrar auditoria
            const adminUserId = this.authService.getLoggedUserId(req);
            if (adminUserId) {
                try {
                    await logPermissionOperation(
                        adminUserId,
                        ActionType.Delete,
                        userId,
                        module,
                        action,
                        getClientIp(req)
                    );
                } catch (auditError) {
                    console.error('[PermissionController] Erro ao registrar auditoria:', auditError);
                }
            }
            
            res.status(200).json({ success: true, message: "Permissão removida com sucesso" });
        } catch (error) {
            console.error("Erro ao remover permissão do usuário:", error);
            res.status(500).json({ error: "Erro ao remover permissão do usuário.", success: false });
        }
    }

    /**
     * Lista todas as permissões de um usuário (role + específicas)
     */
    async getPermissionsForUser(req: Request, res: Response): Promise<void> {
        try {
            if (!(await this.checkAdminAccess(req))) {
                res.status(403).json({ message: "Acesso negado", success: false });
                return;
            }

            const { userId } = req.params;
            const result = await this.permissionService.getPermissionsForUser(userId);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error("Erro ao listar permissões do usuário:", error);
            res.status(500).json({ error: "Erro ao listar permissões do usuário.", success: false });
        }
    }
}