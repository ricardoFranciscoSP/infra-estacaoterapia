import { Request, Response } from "express";
import { AuthorizationService } from "../services/authorization.service";
import { AuditService, AuditLogData } from "../services/audit.service";
import { ActionType, Module } from "../generated/prisma/client";
import { normalizeParamStringRequired } from "../utils/validation.util";

export class AuditController {
    constructor(
        private authService: AuthorizationService,
        private auditService: AuditService
    ) { }

    /**
     * Registra um novo evento de auditoria
     */
    async logAudit(req: Request, res: Response): Promise<void> {
        try {
            const adminId: string | null = this.authService.getLoggedUserId(req);

            if (!adminId) {
                res.status(401).json({
                    message: "Usuário não autenticado",
                    success: false
                });
                return;
            }

            const auditData: AuditLogData = req.body;

            if (!auditData.actionType || !auditData.module || !auditData.description) {
                res.status(400).json({
                    message: "actionType, module e description são obrigatórios",
                    success: false
                });
                return;
            }

            auditData.userId = adminId;

            await this.auditService.log(auditData);

            res.status(201).json({
                message: "Auditoria registrada com sucesso",
                success: true
            });
            return;
        } catch (error: unknown) {
            this.handleError(res, "Erro ao registrar auditoria:", error);
            return;
        }
    }

    /**
     * Lista todas as auditorias (com paginação opcional)
     */
    async listAudits(req: Request, res: Response): Promise<void> {
        try {
            const adminId: string | null = this.authService.getLoggedUserId(req);

            if (!adminId) {
                res.status(401).json({
                    message: "Usuário não autenticado",
                    success: false
                });
                return;
            }

            const { page, limit, actionType, module, status, userId, search, startDate, endDate } = req.query;

            const filters: {
                page?: number;
                limit?: number;
                actionType?: ActionType;
                module?: Module;
                status?: string;
                userId?: string;
                search?: string;
                startDate?: Date;
                endDate?: Date;
            } = {};

            if (page) {
                const pageNum = parseInt(page as string, 10);
                if (!isNaN(pageNum) && pageNum > 0) {
                    filters.page = pageNum;
                }
            }

            if (limit) {
                const limitNum = parseInt(limit as string, 10);
                if (!isNaN(limitNum) && limitNum > 0) {
                    filters.limit = limitNum;
                }
            }

            if (actionType && typeof actionType === 'string') {
                // Valida se o actionType é um valor válido do enum
                if (Object.values(ActionType).includes(actionType as ActionType)) {
                    filters.actionType = actionType as ActionType;
                } else {
                    console.warn(`[AuditController] ActionType inválido recebido: ${actionType}`);
                }
            }

            if (module && typeof module === 'string') {
                // Valida se o module é um valor válido do enum
                if (Object.values(Module).includes(module as Module)) {
                    filters.module = module as Module;
                } else {
                    console.warn(`[AuditController] Module inválido recebido: ${module}. Valores válidos: ${Object.values(Module).join(', ')}`);
                    // Não adiciona o filtro se for inválido, ao invés de causar erro 500
                }
            }

            if (status && typeof status === 'string') {
                filters.status = status;
            }

            if (userId && typeof userId === 'string') {
                filters.userId = userId;
            }

            if (search && typeof search === 'string') {
                filters.search = search;
            }

            if (startDate && typeof startDate === 'string') {
                const date = new Date(startDate);
                if (!isNaN(date.getTime())) {
                    filters.startDate = date;
                }
            }

            if (endDate && typeof endDate === 'string') {
                const date = new Date(endDate);
                if (!isNaN(date.getTime())) {
                    filters.endDate = date;
                }
            }

            const audits = await this.auditService.listAudits(filters);

            res.status(200).json({
                success: true,
                data: audits
            });
            return;
        } catch (error: unknown) {
            console.error("[AuditController] Erro ao listar auditorias:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorDetails = error instanceof Error ? error.stack : undefined;
            
            // Log detalhado para debug
            console.error("[AuditController] Detalhes do erro:", {
                message: errorMessage,
                stack: errorDetails,
                query: req.query,
            });
            
            this.handleError(res, "Erro ao listar auditorias:", error);
            return;
        }
    }

    /**
     * Busca uma auditoria específica por ID
     */
    async getAuditById(req: Request, res: Response): Promise<void> {
        try {
            const adminId: string | null = this.authService.getLoggedUserId(req);

            if (!adminId) {
                res.status(401).json({
                    message: "Usuário não autenticado",
                    success: false
                });
                return;
            }

            const id = normalizeParamStringRequired(req.params.id);

            if (!id) {
                res.status(400).json({
                    message: "ID é obrigatório",
                    success: false
                });
                return;
            }

            const audit = await this.auditService.getAuditById(id);

            if (!audit) {
                res.status(404).json({
                    message: "Auditoria não encontrada",
                    success: false
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: audit
            });
            return;
        } catch (error: unknown) {
            this.handleError(res, "Erro ao buscar auditoria:", error);
            return;
        }
    }

    /**
     * Busca auditorias por usuário
     */
    async getAuditsByUser(req: Request, res: Response): Promise<void> {
        try {
            const adminId: string | null = this.authService.getLoggedUserId(req);

            if (!adminId) {
                res.status(401).json({
                    message: "Usuário não autenticado",
                    success: false
                });
                return;
            }

            const userId = normalizeParamStringRequired(req.params.userId);

            if (!userId) {
                res.status(400).json({
                    message: "userId é obrigatório",
                    success: false
                });
                return;
            }

            const audits = await this.auditService.getAuditsByUser(userId);

            res.status(200).json({
                success: true,
                data: audits
            });
            return;
        } catch (error: unknown) {
            this.handleError(res, "Erro ao buscar auditorias do usuário:", error);
            return;
        }
    }

    /**
     * Busca auditorias por tipo de ação
     */
    async getAuditsByEventType(req: Request, res: Response): Promise<void> {
        try {
            const adminId: string | null = this.authService.getLoggedUserId(req);

            if (!adminId) {
                res.status(401).json({
                    message: "Usuário não autenticado",
                    success: false
                });
                return;
            }

            const { eventType } = req.params;

            if (!eventType || !Object.values(ActionType).includes(eventType as ActionType)) {
                res.status(400).json({
                    message: "eventType inválido ou obrigatório",
                    success: false
                });
                return;
            }

            const audits = await this.auditService.getAuditsByEventType(eventType as ActionType);

            res.status(200).json({
                success: true,
                data: audits
            });
            return;
        } catch (error: unknown) {
            this.handleError(res, "Erro ao buscar auditorias por tipo:", error);
            return;
        }
    }

    /**
     * Exporta auditorias para Excel
     */
    async exportToExcel(req: Request, res: Response): Promise<void> {
        try {
            const adminId: string | null = this.authService.getLoggedUserId(req);

            if (!adminId) {
                res.status(401).json({
                    message: "Usuário não autenticado",
                    success: false
                });
                return;
            }

            const { actionType, module, status, userId, search, startDate, endDate } = req.query;

            const filters: {
                actionType?: ActionType;
                module?: Module;
                status?: string;
                userId?: string;
                search?: string;
                startDate?: Date;
                endDate?: Date;
            } = {};

            if (actionType && typeof actionType === 'string' && Object.values(ActionType).includes(actionType as ActionType)) {
                filters.actionType = actionType as ActionType;
            }

            if (module && typeof module === 'string' && Object.values(Module).includes(module as Module)) {
                filters.module = module as Module;
            }

            if (status && typeof status === 'string') {
                filters.status = status;
            }

            if (userId && typeof userId === 'string') {
                filters.userId = userId;
            }

            if (search && typeof search === 'string') {
                filters.search = search;
            }

            if (startDate && typeof startDate === 'string') {
                const date = new Date(startDate);
                if (!isNaN(date.getTime())) {
                    filters.startDate = date;
                }
            }

            if (endDate && typeof endDate === 'string') {
                const date = new Date(endDate);
                if (!isNaN(date.getTime())) {
                    filters.endDate = date;
                }
            }

            const buffer = await this.auditService.exportToExcel(filters);

            const filename = `relatorio_auditoria_${new Date().toISOString().split('T')[0]}.xlsx`;

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(buffer);
            return;
        } catch (error: unknown) {
            this.handleError(res, "Erro ao exportar para Excel:", error);
            return;
        }
    }

    /**
     * Exporta auditorias para PDF
     */
    async exportToPDF(req: Request, res: Response): Promise<void> {
        try {
            const adminId: string | null = this.authService.getLoggedUserId(req);

            if (!adminId) {
                res.status(401).json({
                    message: "Usuário não autenticado",
                    success: false
                });
                return;
            }

            const { actionType, module, status, userId, search, startDate, endDate } = req.query;

            const filters: {
                actionType?: ActionType;
                module?: Module;
                status?: string;
                userId?: string;
                search?: string;
                startDate?: Date;
                endDate?: Date;
            } = {};

            if (actionType && typeof actionType === 'string' && Object.values(ActionType).includes(actionType as ActionType)) {
                filters.actionType = actionType as ActionType;
            }

            if (module && typeof module === 'string' && Object.values(Module).includes(module as Module)) {
                filters.module = module as Module;
            }

            if (status && typeof status === 'string') {
                filters.status = status;
            }

            if (userId && typeof userId === 'string') {
                filters.userId = userId;
            }

            if (search && typeof search === 'string') {
                filters.search = search;
            }

            if (startDate && typeof startDate === 'string') {
                const date = new Date(startDate);
                if (!isNaN(date.getTime())) {
                    filters.startDate = date;
                }
            }

            if (endDate && typeof endDate === 'string') {
                const date = new Date(endDate);
                if (!isNaN(date.getTime())) {
                    filters.endDate = date;
                }
            }

            const buffer = await this.auditService.exportToPDF(filters);

            const filename = `relatorio_auditoria_${new Date().toISOString().split('T')[0]}.pdf`;

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(buffer);
            return;
        } catch (error: unknown) {
            this.handleError(res, "Erro ao exportar para PDF:", error);
            return;
        }
    }

    private handleError(res: Response, logMessage: string, error: unknown): void {
        console.error(logMessage, error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        res.status(500).json({
            message: logMessage,
            success: false,
            error: errorMessage
        });
    }
}
