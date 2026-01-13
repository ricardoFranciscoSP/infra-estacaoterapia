import { Request, Response } from "express";
import { EmailService } from "../services/email.service";
import { ControleFinanceiroService } from "../services/controleFinanceiro.service";
import { AuthorizationService } from "../services/authorization.service";
import { formatarListagemPagamentos } from "../utils/formatarVencimentoFinanceiro.util";
import { stat } from "fs";
import { normalizeParamStringRequired } from "../utils/validation.util";

export class FinanceiroController {
    constructor(
        private controleFinanceiroService: ControleFinanceiroService = new ControleFinanceiroService(),
        private emailService: EmailService = new EmailService(),
        private authService: AuthorizationService
    ) { }

    /**
     * Confirma o pagamento de uma fatura e envia e-mail de confirmação.
     * @param req Request do Express contendo controleFinanceiroId, statusPagamento e transacaoId.
     * @param res Response do Express.
     * @returns Response com resultado da confirmação ou erro.
     */
    async confirmarPagamento(req: Request, res: Response): Promise<Response> {
        const { controleFinanceiroId, statusPagamento, transacaoId } = req.body;

        if (!controleFinanceiroId || !statusPagamento) {
            return res.status(400).json({ message: "Os campos 'controleFinanceiroId' e 'statusPagamento' são obrigatórios." });
        }

        try {
            const { financeiro, user, assinaturaPlano } = await this.controleFinanceiroService.confirmarPagamento({
                controleFinanceiroId,
                statusPagamento,
                transacaoId,
            });

            await this.emailService.enviarConfirmacaoPagamento({
                to: user?.Email!,
                nome: user?.Nome ?? "",
                valor: financeiro.Valor,
                statusPagamento,
            });

            return res.status(200).json({
                message: "Pagamento confirmado com sucesso",
                financeiro,
            });
        } catch (error) {
            console.error("Erro ao confirmar pagamento:", error);
            return res.status(500).json({ message: "Erro interno ao confirmar pagamento." });
        }
    }

    /**
     * Atualiza o status de recorrência e envia e-mail de atualização.
     * @param req Request do Express contendo recorrenciaId e statusPagamento.
     * @param res Response do Express.
     * @returns Response com resultado da atualização ou erro.
     */
    async atualizarStatusRecorrencia(req: Request, res: Response): Promise<Response> {
        const { recorrenciaId, statusPagamento } = req.body;

        if (!recorrenciaId || !statusPagamento) {
            return res.status(400).json({ message: "Os campos 'recorrenciaId' e 'statusPagamento' são obrigatórios." });
        }

        try {
            const { count, user } = await this.controleFinanceiroService.atualizarStatusRecorrencia({
                recorrenciaId,
                statusPagamento,
            });

            await this.emailService.enviarAtualizacaoStatusRecorrencia({
                to: user?.Email!,
                nome: user?.Nome ?? "",
                recorrenciaId,
                statusPagamento,
            });

            return res.status(200).json({
                message: "Status de recorrência atualizado com sucesso",
                registrosAtualizados: count,
            });
        } catch (error) {
            console.error("Erro ao atualizar status de recorrência:", error);
            return res.status(500).json({ message: "Erro interno ao atualizar status de recorrência." });
        }
    }

    /**
     * Lista todos os pagamentos do usuário autenticado.
     * @param req Request do Express.
     * @param res Response do Express.
     * @returns Response com lista de pagamentos ou erro.
     */
    async listarPagamentos(req: Request, res: Response): Promise<Response> {
        const userId = this.authService.getLoggedUserId(req);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        try {
            const pagamentos = await this.controleFinanceiroService.listarPagamentos(userId);

            // Formata os financeiros com vencimento correto baseado em CicloPlano
            const pagamentosFormatados = formatarListagemPagamentos(pagamentos);

            return res.status(200).json({
                pagamentos: pagamentosFormatados || []
            });
        } catch (error) {
            console.error("Erro ao listar pagamentos:", error);
            return res.status(500).json({ message: "Erro interno ao listar pagamentos." });
        }
    }

    /**
     * Exclui um pagamento pelo controleFinanceiroId.
     * @param req Request do Express contendo controleFinanceiroId.
     * @param res Response do Express.
     * @returns Response de sucesso ou erro.
     */
    async excluirPagamento(req: Request, res: Response): Promise<Response> {
        const controleFinanceiroId = normalizeParamStringRequired(req.params.controleFinanceiroId);

        if (!controleFinanceiroId) {
            return res.status(400).json({ message: "O campo 'controleFinanceiroId' é obrigatório." });
        }

        try {
            await this.controleFinanceiroService.excluirPagamento(controleFinanceiroId);

            return res.status(200).json({ message: "Pagamento excluído com sucesso" });
        } catch (error) {
            console.error("Erro ao excluir pagamento:", error);
            return res.status(500).json({ message: "Erro interno ao excluir pagamento." });
        }
    }

    /**
     * Verifica e atualiza status de pagamentos expirados para 'finalizado'.
     * @param req Request do Express.
     * @param res Response do Express.
     * @returns Response com resultado da verificação/atualização ou erro.
     */
    async verificarEAtualizarStatus(req: Request, res: Response): Promise<Response> {
        try {
            const atualizados = await this.controleFinanceiroService.verificarEAtualizarStatus();

            if (atualizados === 0) {
                return res.status(200).json({ message: "Nenhum registro com data expirada encontrado." });
            }

            return res.status(200).json({ message: "Status atualizado para 'finalizado' com sucesso." });
        } catch (error) {
            console.error("Erro ao verificar e atualizar status:", error);
            return res.status(500).json({ message: "Erro interno ao verificar e atualizar status." });
        }
    }
}
