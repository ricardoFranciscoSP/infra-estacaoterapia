import { Request, Response } from "express";
import { AuthorizationService } from "../../services/authorization.service";
import { IFinanceiroService } from "../../interfaces/psicoologo/iFinanceiro.interface";
import { normalizeQueryInt } from "../../utils/validation.util";

export class FinanceiroController {

    constructor(
        private financeiroService: IFinanceiroService,
        private authService: AuthorizationService,
    ) { }

    async calcularPagamento(req: Request, res: Response): Promise<void> {
        try {
            console.log("🔹 Iniciando cálculo de pagamento...");
            const psicologoId = this.authService.getLoggedUserId(req);
            if (!psicologoId) {
                res.status(401).json({ error: "Usuário não autenticado" });
                return;
            }

            const resultado = await this.financeiroService.calcularPagamento(psicologoId);
            res.json({ totalPagamento: resultado.totalPagamento || 0 });
        } catch (error: unknown) {
            console.error('[calcularPagamento] Erro ao calcular pagamento:', error);
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            const errorStack = error instanceof Error ? error.stack : undefined;
            console.error('[calcularPagamento] Stack trace:', errorStack);
            res.status(500).json({ 
                error: 'Erro ao calcular pagamento',
                message: errorMessage
            });
        }
    }

    async gerarRelatorioFinanceiro(req: Request, res: Response): Promise<void> {
        const psicologoId = this.authService.getLoggedUserId(req);
        if (!psicologoId) {
            res.status(401).json({ error: "Usuário não autenticado" });
            return;
        }
        const relatorio = await this.financeiroService.gerarRelatorioFinanceiro();
        res.json({ relatorio });
    }

    async processarPagamento(req: Request, res: Response): Promise<void> {
        const psicologoId = this.authService.getLoggedUserId(req);
        if (!psicologoId) {
            res.status(401).json({ error: "Usuário não autenticado" });
            return;
        }
        const { amount } = req.body;
        const sucesso = await this.financeiroService.processarPagamento(psicologoId, amount);
        res.json({ sucesso });
    }

    async getHistoricoSessoes(req: Request, res: Response): Promise<void> {
        try {
            const psicologoId = this.authService.getLoggedUserId(req);
            if (!psicologoId) {
                res.status(401).json({ error: "Usuário não autenticado" });
                return;
            }

            const mes = normalizeQueryInt(req.query.mes);
            const ano = normalizeQueryInt(req.query.ano);
            const page = normalizeQueryInt(req.query.page) ?? 1;
            const pageSize = normalizeQueryInt(req.query.pageSize) ?? 10;
            const todosStatus = req.query.todosStatus === '1' || req.query.todosStatus === 'true';

            console.log('[getHistoricoSessoes] Buscando histórico:', { psicologoId, mes, ano, page, pageSize, todosStatus });

            const historico = await (this.financeiroService as any).getHistoricoSessoes(psicologoId, { mes, ano, page, pageSize, todosStatus });
            
            console.log('[getHistoricoSessoes] Histórico encontrado:', { 
                count: historico?.data?.length || 0, 
                pagination: historico?.pagination,
                todosStatus 
            });

            // Garante que sempre retorna no formato esperado
            const response = {
                data: historico?.data || [],
                pagination: historico?.pagination || {
                    page,
                    pageSize,
                    total: 0,
                    totalPages: 0
                }
            };

            res.json(response);
        } catch (error: unknown) {
            console.error('[getHistoricoSessoes] Erro ao buscar histórico:', error);
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            const errorStack = error instanceof Error ? error.stack : undefined;
            console.error('[getHistoricoSessoes] Stack trace:', errorStack);
            res.status(500).json({ 
                error: 'Erro ao buscar histórico de sessões',
                message: errorMessage,
                data: [],
                pagination: null
            });
        }
    }

    async getGanhosMensais(req: Request, res: Response): Promise<void> {
        const psicologoId = this.authService.getLoggedUserId(req);
        if (!psicologoId) {
            res.status(401).json({ error: "Usuário não autenticado" });
            return;
        }

        const ano = normalizeQueryInt(req.query.ano);
        const mes = normalizeQueryInt(req.query.mes);
        const ganhos = await (this.financeiroService as any).getGanhosMensais(psicologoId, ano, mes);
        res.json(ganhos);
    }

    async getAtendimentosMensais(req: Request, res: Response): Promise<void> {
        const psicologoId = this.authService.getLoggedUserId(req);
        if (!psicologoId) {
            res.status(401).json({ error: "Usuário não autenticado" });
            return;
        }

        const ano = normalizeQueryInt(req.query.ano);
        const mes = normalizeQueryInt(req.query.mes);
        const atendimentos = await (this.financeiroService as any).getAtendimentosMensais(psicologoId, ano, mes);
        res.json(atendimentos);
    }

    async getSaldoDisponivelResgate(req: Request, res: Response): Promise<void> {
        const psicologoId = this.authService.getLoggedUserId(req);
        if (!psicologoId) {
            res.status(401).json({ error: "Usuário não autenticado" });
            return;
        }

        const saldo = await (this.financeiroService as any).getSaldoDisponivelResgate(psicologoId);
        res.json(saldo);
    }

    async getSaldoRetido(req: Request, res: Response): Promise<void> {
        const psicologoId = this.authService.getLoggedUserId(req);
        if (!psicologoId) {
            res.status(401).json({ error: "Usuário não autenticado" });
            return;
        }

        const saldo = await (this.financeiroService as any).getSaldoRetido(psicologoId);
        res.json(saldo);
    }

    async getFaturaPeriodo(req: Request, res: Response): Promise<void> {
        const psicologoId = this.authService.getLoggedUserId(req);
        if (!psicologoId) {
            res.status(401).json({ error: "Usuário não autenticado" });
            return;
        }

        try {
            const fatura = await (this.financeiroService as any).getFaturaPeriodo(psicologoId);
            res.json(fatura);
        } catch (error: unknown) {
            console.error('[getFaturaPeriodo] Erro:', error);
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            res.status(500).json({ 
                error: 'Erro ao buscar fatura do período',
                message: errorMessage
            });
        }
    }
}
