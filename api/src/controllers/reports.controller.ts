import { Request, Response } from "express";
import { AuthorizationService } from "../services/authorization.service";
import { ReportsService, ReportFilters } from "../services/reports.service";
import { AuditService } from "../services/audit.service";
import { Role, Module, ActionType } from "../generated/prisma/client";
import { getClientIp } from "../utils/getClientIp.util";

export class ReportsController {
    constructor(
        private authService: AuthorizationService,
        private reportsService: ReportsService,
        private auditService: AuditService
    ) {}

    /**
     * Verifica se o usuário é Admin
     */
    private async checkAdminAccess(req: Request): Promise<string | null> {
        const userId: string | null = this.authService.getLoggedUserId(req);
        if (!userId) return null;

        const userRole = await this.authService.getUserRole(userId);
        return userRole === Role.Admin ? userId : null;
    }

    /**
     * Registra auditoria de acesso a relatórios
     */
    private async logAudit(
        req: Request,
        userId: string,
        reportType: string,
        filters?: ReportFilters
    ): Promise<void> {
        try {
            if (!userId) {
                console.error("[ReportsController] userId é obrigatório para auditoria");
                return;
            }

            const ipAddress = getClientIp(req);
            const filterDescription = filters
                ? ` com filtros: ${Object.entries(filters)
                      .filter(([_, v]) => v !== undefined && v !== null && v !== "")
                      .map(([k, v]) => `${k}=${v}`)
                      .join(", ")}`
                : "";

            const description = `Acesso ao relatório: ${reportType}${filterDescription}`;

            console.log(`[ReportsController] Registrando auditoria:`, {
                userId,
                reportType,
                module: Module.Reports,
                actionType: ActionType.Read,
            });

            await this.auditService.log({
                userId,
                actionType: ActionType.Read,
                module: Module.Reports,
                description,
                ipAddress,
                status: "Sucesso",
                metadata: {
                    reportType,
                    filters: filters || {},
                },
            });

            console.log(`[ReportsController] Auditoria registrada com sucesso para relatório: ${reportType}`);
        } catch (error) {
            // Não interrompe o fluxo principal se houver erro na auditoria
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error("[ReportsController] Erro ao registrar auditoria:", {
                error: errorMessage,
                reportType,
                userId,
            });
        }
    }

    /**
     * Busca usuários ativos
     */
    async getUsuariosAtivos(req: Request, res: Response): Promise<void> {
        try {
            const userId = await this.checkAdminAccess(req);
            if (!userId) {
                res.status(403).json({
                    message: "Acesso negado. Apenas administradores podem acessar relatórios.",
                    success: false,
                });
                return;
            }

            const filters: ReportFilters = {
                startDate: req.query.startDate as string | undefined,
                endDate: req.query.endDate as string | undefined,
                status: req.query.status as string | undefined,
                role: req.query.role as Role | undefined,
                userId: req.query.userId as string | undefined,
                search: req.query.search as string | undefined,
            };

            const usuarios = await this.reportsService.getUsuariosAtivos(filters);

            // Registra auditoria
            await this.logAudit(req, userId, "Usuários Ativos", filters);

            res.status(200).json({
                success: true,
                data: usuarios,
            });
            return;
        } catch (error: unknown) {
            this.handleError(res, "Erro ao buscar usuários ativos:", error);
            return;
        }
    }

    /**
     * Busca planos
     */
    async getPlanos(req: Request, res: Response): Promise<void> {
        try {
            const userId = await this.checkAdminAccess(req);
            if (!userId) {
                res.status(403).json({
                    message: "Acesso negado. Apenas administradores podem acessar relatórios.",
                    success: false,
                });
                return;
            }

            const filters: ReportFilters = {
                startDate: req.query.startDate as string | undefined,
                endDate: req.query.endDate as string | undefined,
                status: req.query.status as string | undefined,
                search: req.query.search as string | undefined,
            };

            const planos = await this.reportsService.getPlanos(filters);

            // Registra auditoria
            await this.logAudit(req, userId, "Planos", filters);

            res.status(200).json({
                success: true,
                data: planos,
            });
            return;
        } catch (error: unknown) {
            this.handleError(res, "Erro ao buscar planos:", error);
            return;
        }
    }

    /**
     * Busca usuários inativos
     */
    async getUsuariosInativos(req: Request, res: Response): Promise<void> {
        try {
            const userId = await this.checkAdminAccess(req);
            if (!userId) {
                res.status(403).json({
                    message: "Acesso negado. Apenas administradores podem acessar relatórios.",
                    success: false,
                });
                return;
            }

            const filters: ReportFilters = {
                startDate: req.query.startDate as string | undefined,
                endDate: req.query.endDate as string | undefined,
                status: req.query.status as string | undefined,
                role: req.query.role as Role | undefined,
                userId: req.query.userId as string | undefined,
                search: req.query.search as string | undefined,
            };

            const usuarios = await this.reportsService.getUsuariosInativos(filters);

            // Registra auditoria
            await this.logAudit(req, userId, "Usuários Inativos", filters);

            res.status(200).json({
                success: true,
                data: usuarios,
            });
            return;
        } catch (error: unknown) {
            this.handleError(res, "Erro ao buscar usuários inativos:", error);
            return;
        }
    }

    /**
     * Busca faturamento
     */
    async getFaturamento(req: Request, res: Response): Promise<void> {
        try {
            const userId = await this.checkAdminAccess(req);
            if (!userId) {
                res.status(403).json({
                    message: "Acesso negado. Apenas administradores podem acessar relatórios.",
                    success: false,
                });
                return;
            }

            const filters: ReportFilters = {
                startDate: req.query.startDate as string | undefined,
                endDate: req.query.endDate as string | undefined,
                status: req.query.status as string | undefined,
                userId: req.query.userId as string | undefined,
                search: req.query.search as string | undefined,
            };

            const faturamento = await this.reportsService.getFaturamento(filters);

            // Registra auditoria
            await this.logAudit(req, userId, "Faturamento", filters);

            res.status(200).json({
                success: true,
                data: faturamento,
            });
            return;
        } catch (error: unknown) {
            this.handleError(res, "Erro ao buscar faturamento:", error);
            return;
        }
    }

    /**
     * Busca repasse
     */
    async getRepasse(req: Request, res: Response): Promise<void> {
        try {
            const userId = await this.checkAdminAccess(req);
            if (!userId) {
                res.status(403).json({
                    message: "Acesso negado. Apenas administradores podem acessar relatórios.",
                    success: false,
                });
                return;
            }

            const filters: ReportFilters = {
                startDate: req.query.startDate as string | undefined,
                endDate: req.query.endDate as string | undefined,
                status: req.query.status as string | undefined,
                userId: req.query.userId as string | undefined,
                search: req.query.search as string | undefined,
            };

            const repasse = await this.reportsService.getRepasse(filters);

            // Registra auditoria
            await this.logAudit(req, userId, "Repasse", filters);

            res.status(200).json({
                success: true,
                data: repasse,
            });
            return;
        } catch (error: unknown) {
            this.handleError(res, "Erro ao buscar repasse:", error);
            return;
        }
    }

    /**
     * Busca avaliações
     */
    async getAvaliacoes(req: Request, res: Response): Promise<void> {
        try {
            const userId = await this.checkAdminAccess(req);
            if (!userId) {
                res.status(403).json({
                    message: "Acesso negado. Apenas administradores podem acessar relatórios.",
                    success: false,
                });
                return;
            }

            const filters: ReportFilters = {
                startDate: req.query.startDate as string | undefined,
                endDate: req.query.endDate as string | undefined,
                status: req.query.status as string | undefined,
                userId: req.query.userId as string | undefined,
                search: req.query.search as string | undefined,
            };

            const avaliacoes = await this.reportsService.getAvaliacoes(filters);

            // Registra auditoria
            await this.logAudit(req, userId, "Avaliações", filters);

            res.status(200).json({
                success: true,
                data: avaliacoes,
            });
            return;
        } catch (error: unknown) {
            this.handleError(res, "Erro ao buscar avaliações:", error);
            return;
        }
    }

    /**
     * Busca sessões
     */
    async getSessoes(req: Request, res: Response): Promise<void> {
        try {
            const userId = await this.checkAdminAccess(req);
            if (!userId) {
                res.status(403).json({
                    message: "Acesso negado. Apenas administradores podem acessar relatórios.",
                    success: false,
                });
                return;
            }

            const filters: ReportFilters = {
                startDate: req.query.startDate as string | undefined,
                endDate: req.query.endDate as string | undefined,
                status: req.query.status as string | undefined,
                userId: req.query.userId as string | undefined,
                search: req.query.search as string | undefined,
            };

            const sessoes = await this.reportsService.getSessoes(filters);

            // Registra auditoria
            await this.logAudit(req, userId, "Sessões", filters);

            res.status(200).json({
                success: true,
                data: sessoes,
            });
            return;
        } catch (error: unknown) {
            this.handleError(res, "Erro ao buscar sessões:", error);
            return;
        }
    }

    /**
     * Busca agenda
     */
    async getAgenda(req: Request, res: Response): Promise<void> {
        try {
            const userId = await this.checkAdminAccess(req);
            if (!userId) {
                res.status(403).json({
                    message: "Acesso negado. Apenas administradores podem acessar relatórios.",
                    success: false,
                });
                return;
            }

            const filters: ReportFilters = {
                startDate: req.query.startDate as string | undefined,
                endDate: req.query.endDate as string | undefined,
                status: req.query.status as string | undefined,
                userId: req.query.userId as string | undefined,
                search: req.query.search as string | undefined,
            };

            const agenda = await this.reportsService.getAgenda(filters);

            // Registra auditoria
            await this.logAudit(req, userId, "Agenda", filters);

            res.status(200).json({
                success: true,
                data: agenda,
            });
            return;
        } catch (error: unknown) {
            this.handleError(res, "Erro ao buscar agenda:", error);
            return;
        }
    }

    /**
     * Busca resumo geral
     */
    async getSummary(req: Request, res: Response): Promise<void> {
        try {
            const userId = await this.checkAdminAccess(req);
            if (!userId) {
                res.status(403).json({
                    message: "Acesso negado. Apenas administradores podem acessar relatórios.",
                    success: false,
                });
                return;
            }

            const filters: ReportFilters = {
                startDate: req.query.startDate as string | undefined,
                endDate: req.query.endDate as string | undefined,
            };

            const summary = await this.reportsService.getSummary(filters);

            // Registra auditoria
            await this.logAudit(req, userId, "Resumo Geral", filters);

            res.status(200).json({
                success: true,
                data: summary,
            });
            return;
        } catch (error: unknown) {
            this.handleError(res, "Erro ao buscar resumo:", error);
            return;
        }
    }

    private handleError(res: Response, logMessage: string, error: unknown): void {
        console.error(logMessage, error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        res.status(500).json({
            message: logMessage,
            success: false,
            error: errorMessage,
        });
    }
}

