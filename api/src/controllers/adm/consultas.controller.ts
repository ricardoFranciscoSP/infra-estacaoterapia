import { Request, Response } from "express";
import { AuthorizationService } from "../../services/authorization.service";
import { IConsultas } from "../../interfaces/adm/iConsultas.interface";
import { ConsultasService } from "../../services/adm/consultas.service";
import { ActionType, Module } from "../../types/permissions.types";
import { STATUS } from "../../constants/status.constants";
import { normalizeQueryString } from "../../utils/validation.util";

export class ConsultasController implements IConsultas {
    private service: ConsultasService;
    private authService: AuthorizationService;

    constructor(
        authService: AuthorizationService = new AuthorizationService(),
        service: ConsultasService = new ConsultasService(authService)
    ) {
        this.authService = authService;
        this.service = service;
    }

    /**
     * Retorna o contador de consultas realizadas (status Completed)
     * @param req Request do Express
     * @param res Response do Express
     * @returns Response com o total de consultas realizadas
     */
    async getConsultasRealizadas(req: Request, res: Response): Promise<Response> {
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                total: 0
            });
        }

        const hasPermission = await this.authService.checkPermission(
            user.Id,
            Module.Sessions,
            ActionType.Read
        );

        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: "Acesso negado",
                total: 0
            });
        }

        try {
            const result = await this.service.getConsultasRealizadas(user);
            return res.json({
                success: true,
                total: result.total,
                message: "Total de consultas realizadas obtido com sucesso"
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                error: error.message || "Erro ao buscar consultas realizadas",
                total: 0
            });
        }
    }

    /**
     * Retorna contagem mensal de consultas concluídas para o ano informado (ou atual).
     * Query param: year (opcional)
     */
    async getConsultasMensais(req: Request, res: Response): Promise<Response> {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const hasPermission = await this.authService.checkPermission(
            user.Id,
            Module.Sessions,
            ActionType.Read
        );
        if (!hasPermission) {
            return res.status(403).json({ success: false, message: "Acesso negado" });
        }

        // year pode vir como string; garante número válido
        const yearParam = normalizeQueryString(req.query.year);
        const year = yearParam && !isNaN(Number(yearParam)) ? Number(yearParam) : undefined;

        try {
            const result = await this.service.getConsultasMensais(user, year);
            return res.json({
                success: true,
                year: result.year,
                counts: result.counts,
                total: result.total,
                message: "Contagem mensal de consultas concluídas"
            });
        } catch (error: any) {
            return res.status(500).json({ success: false, error: error.message || 'Erro ao buscar consultas mensais' });
        }
    }

    /**
     * Retorna o total de consultas canceladas (todos os status de cancelamento)
     */
    async getConsultasCanceladas(req: Request, res: Response): Promise<Response> {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, error: 'Unauthorized', total: 0 });
        }

        const hasPermission = await this.authService.checkPermission(
            user.Id,
            Module.Sessions,
            ActionType.Read
        );
        if (!hasPermission) {
            return res.status(403).json({ success: false, message: "Acesso negado", total: 0 });
        }

        try {
            const result = await this.service.getConsultasCanceladas(user);
            return res.json({
                success: true,
                total: result.total,
                message: "Total de consultas canceladas obtido com sucesso"
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                error: error.message || "Erro ao buscar consultas canceladas",
                total: 0
            });
        }
    }

    /**
     * Retorna o total de consultas do mês atual (todas, independente do status)
     */
    async getConsultasMesAtual(req: Request, res: Response): Promise<Response> {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, error: 'Unauthorized', total: 0 });
        }

        const hasPermission = await this.authService.checkPermission(
            user.Id,
            Module.Sessions,
            ActionType.Read
        );
        if (!hasPermission) {
            return res.status(403).json({ success: false, message: "Acesso negado", total: 0 });
        }

        try {
            const result = await this.service.getConsultasMesAtual(user);
            return res.json({
                success: true,
                total: result.total,
                message: "Total de consultas do mês atual obtido com sucesso"
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                error: error.message || "Erro ao buscar consultas do mês atual",
                total: 0
            });
        }
    }

    /**
     * Retorna a lista de consultas do mês atual (todas, independente do status)
     */
    async getConsultasMesAtualLista(req: Request, res: Response): Promise<Response> {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, error: 'Unauthorized', data: [] });
        }

        const hasPermission = await this.authService.checkPermission(
            user.Id,
            Module.Sessions,
            ActionType.Read
        );
        if (!hasPermission) {
            return res.status(403).json({ success: false, message: "Acesso negado", data: [] });
        }

        try {
            const consultas = await this.service.getConsultasMesAtualLista(user);
            return res.json(consultas);
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                error: error.message || "Erro ao buscar consultas do mês atual",
                data: []
            });
        }
    }

    /**
     * Retorna a lista de consultas de uma data específica (YYYY-MM-DD)
     */
    async getConsultasPorData(req: Request, res: Response): Promise<Response> {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, error: 'Unauthorized', data: [] });
        }

        const hasPermission = await this.authService.checkPermission(
            user.Id,
            Module.Sessions,
            ActionType.Read
        );
        if (!hasPermission) {
            return res.status(403).json({ success: false, message: "Acesso negado", data: [] });
        }

        const dateParam = typeof req.query.date === "string" ? req.query.date.trim() : "";
        if (!dateParam) {
            return res.status(400).json({ success: false, error: "Data é obrigatória.", data: [] });
        }

        try {
            const consultas = await this.service.getConsultasPorData(user, dateParam);
            return res.json({ success: true, data: consultas });
        } catch (error: any) {
            const message = error?.message || "Erro ao buscar consultas por data";
            const status = message === "Data inválida." ? 400 : 500;
            return res.status(status).json({
                success: false,
                error: message,
                data: []
            });
        }
    }

    /**
     * Retorna contagem mensal de TODAS as consultas para o ano informado (ou atual).
     * Query param: year (opcional)
     */
    async getConsultasMensaisTodas(req: Request, res: Response): Promise<Response> {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const hasPermission = await this.authService.checkPermission(
            user.Id,
            Module.Sessions,
            ActionType.Read
        );
        if (!hasPermission) {
            return res.status(403).json({ success: false, message: "Acesso negado" });
        }

        const yearParam = normalizeQueryString(req.query.year);
        const year = yearParam && !isNaN(Number(yearParam)) ? Number(yearParam) : undefined;

        try {
            const result = await this.service.getConsultasMensaisTodas(user, year);
            return res.json({
                success: true,
                year: result.year,
                counts: result.counts,
                total: result.total,
                message: "Contagem mensal de todas as consultas"
            });
        } catch (error: any) {
            return res.status(500).json({ success: false, error: error.message || 'Erro ao buscar consultas mensais' });
        }
    }
}
