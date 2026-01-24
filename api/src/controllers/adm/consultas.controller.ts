import { Request, Response } from "express";
import { AuthorizationService } from "../../services/authorization.service";
import { IConsultas } from "../../interfaces/adm/iConsultas.interface";
import { ConsultasService } from "../../services/adm/consultas.service";
import { ActionType, Module } from "../../types/permissions.types";
import { STATUS } from "../../constants/status.constants";
import { normalizeQueryString } from "../../utils/validation.util";
import { ConsultaStatus } from "../../generated/prisma";
import { ConsultaStatusService } from "../../services/consultaStatus.service";
import { ConsultaOrigemStatus } from "../../constants/consultaStatus.constants";
import { CancelamentoService } from "../../services/cancelamento.service";
import { processRepasseAsync } from "../agora.controller";
import { processarTodasConsultas } from "../../scripts/processarRepassesConsultas";

export class ConsultasController implements IConsultas {
    private service: ConsultasService;
    private authService: AuthorizationService;
    private consultaStatusService: ConsultaStatusService;
    private cancelamentoService: CancelamentoService;

    constructor(
        authService: AuthorizationService = new AuthorizationService(),
        service: ConsultasService = new ConsultasService(authService)
    ) {
        this.authService = authService;
        this.service = service;
        this.consultaStatusService = new ConsultaStatusService();
        this.cancelamentoService = new CancelamentoService();
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

    /**
     * Retorna lista paginada de consultas (todas)
     */
    async getConsultasLista(req: Request, res: Response): Promise<Response> {
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
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 20;
            const status = typeof req.query.status === "string" ? req.query.status : undefined;

            const result = await this.service.getConsultasLista(user, { page, limit, status });
            return res.json(result);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Erro ao buscar consultas";
            return res.status(500).json({ success: false, error: message, data: [] });
        }
    }

    /**
     * Atualiza status da consulta e opcionalmente repasse/devolução
     */
    async updateConsultaStatus(req: Request, res: Response): Promise<Response> {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, error: "Unauthorized" });
        }

        const hasPermission = await this.authService.checkPermission(
            user.Id,
            Module.Sessions,
            ActionType.Update
        );
        if (!hasPermission) {
            return res.status(403).json({ success: false, message: "Acesso negado" });
        }

        const rawId = req.params.id;
        const consultaId = (Array.isArray(rawId) ? rawId[0] : rawId) as string;
        const { status, repasse, devolverSessao } = req.body as {
            status?: string;
            repasse?: boolean;
            devolverSessao?: boolean;
        };

        if (!consultaId) {
            return res.status(400).json({ success: false, message: "ConsultaId é obrigatório" });
        }

        if (!status || typeof status !== 'string' || status.trim() === '') {
            return res.status(400).json({ success: false, message: "Status é obrigatório e deve ser uma string válida" });
        }

        // Normaliza o status (remove espaços extras)
        const statusNormalizado = status.trim();

        // Lista completa de status válidos conforme schema.prisma
        // Inclui todos os valores do enum ConsultaStatus, mesmo que não estejam no Prisma gerado
        const validStatuses = [
            'Agendada',
            'EmAndamento',
            'Realizada',
            'PacienteNaoCompareceu',
            'PsicologoNaoCompareceu',
            'CanceladaPacienteNoPrazo',
            'CanceladaPsicologoNoPrazo',
            'ReagendadaPacienteNoPrazo',
            'ReagendadaPsicologoNoPrazo',
            'CanceladaPacienteForaDoPrazo',
            'CanceladaPsicologoForaDoPrazo',
            'CanceladaForcaMaior',
            'CanceladaNaoCumprimentoContratualPaciente',
            'ReagendadaPsicologoForaDoPrazo',
            'CanceladaNaoCumprimentoContratualPsicologo',
            'PsicologoDescredenciado',
            'CanceladoAdministrador',
            'CANCELAMENTO_SISTEMICO_PSICOLOGO',
            'CANCELAMENTO_SISTEMICO_PACIENTE',
            'ForaDaPlataforma',
            'Reservado',
            'Cancelado',
        ];
        
        // Verifica se o status normalizado está na lista de valores válidos
        const isValidStatus = validStatuses.includes(statusNormalizado);
        
        if (!isValidStatus) {
            console.error(`[updateConsultaStatus] Status inválido recebido: "${statusNormalizado}". Status válidos:`, validStatuses);
            return res.status(400).json({ 
                success: false, 
                message: `Status inválido: "${statusNormalizado}". Status válidos: ${validStatuses.join(', ')}` 
            });
        }
        
        // Valida também contra o enum do Prisma (se disponível)
        try {
            const prismaStatuses = Object.values(ConsultaStatus) as string[];
            if (!prismaStatuses.includes(statusNormalizado)) {
                console.warn(`[updateConsultaStatus] Status "${statusNormalizado}" não está no enum Prisma gerado, mas é válido no schema`);
            }
        } catch (error) {
            // Ignora erro se ConsultaStatus não estiver disponível
        }

        try {
            await this.consultaStatusService.atualizarStatus({
                consultaId,
                novoStatus: statusNormalizado as ConsultaStatus,
                origem: ConsultaOrigemStatus.Admin,
                usuarioId: user.Id,
                telaGatilho: "adm-estacao/gestao-consultas",
            });

            if (repasse) {
                await processRepasseAsync(consultaId, "concluida");
            }

            if (devolverSessao) {
                const consulta = await this.service.getConsultaBasica(consultaId);
                if (!consulta) {
                    throw new Error("Consulta não encontrada para devolução de sessão");
                }
                await this.cancelamentoService.devolverSessaoCliente(consultaId, {
                    CicloPlanoId: consulta.CicloPlanoId ?? null,
                    PacienteId: consulta.PacienteId ?? null,
                });
            }

            return res.json({ success: true, message: "Status atualizado com sucesso" });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Erro ao atualizar consulta";
            console.error(`[updateConsultaStatus] Erro ao atualizar status da consulta ${consultaId}:`, error);
            return res.status(500).json({ success: false, error: message });
        }
    }

    /**
     * Processa repasses para todas as consultas realizadas
     * Endpoint administrativo para executar o script de processamento
     */
    async processarRepassesConsultas(req: Request, res: Response): Promise<Response> {
        try {
            console.log('🚀 [Admin] Iniciando processamento de repasses para todas as consultas...');
            
            // Executa o script de processamento
            await processarTodasConsultas();
            
            return res.json({ 
                success: true, 
                message: 'Repasses processados com sucesso para todas as consultas realizadas' 
            });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Erro ao processar repasses';
            console.error('[processarRepassesConsultas] Erro:', error);
            return res.status(500).json({ 
                success: false, 
                error: message 
            });
        }
    }
}
