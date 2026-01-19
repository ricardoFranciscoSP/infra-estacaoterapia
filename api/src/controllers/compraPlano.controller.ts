import { Request, Response } from "express";
import { ICompraPlanoService } from "../interfaces/compraPlano.interface";
import { AuthorizationService } from "../services/authorization.service";
import { GetUserBasicService } from "../services/getUserBasic.Service";
import { getClientIp } from "../utils/getClientIp.util";
import { logPlanoPurchase, logPaymentError, logPlanoCancel } from "../utils/auditLogger.util";

export class CompraPlanoController {
    constructor(
        private compraPlanoService: ICompraPlanoService,
        private authService: AuthorizationService,
        private userService: GetUserBasicService
    ) { }

    /**
     * Realiza a compra de um plano para o usuário autenticado.
     * @param req Request do Express contendo dados do plano.
     * @param res Response do Express.
     * @returns Response com resultado da compra.
     */
    async comprarPlano(req: Request, res: Response): Promise<Response> {
        const ipAddress = getClientIp(req);
        try {
            const data = req.body;
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const usuario = await this.userService.execute(userId);
            const payload = await this.compraPlanoService.comprarPlano({
                ...data,
                userId,
                usuario
            });
            
            // Finaliza a requisição corretamente
            if ((payload as { error?: unknown }).error || !payload.assinaturaPlano) {
                const status = payload.message?.toLowerCase().includes('não encontrado') ? 404 : 400;
                const planoNome = data.plano?.Nome || 'Desconhecido';
                const valor = data.plano?.Preco || 0;
                
                // Registra erro de pagamento na auditoria
                await logPaymentError(
                    userId,
                    'plano',
                    valor,
                    payload.message || 'Erro desconhecido',
                    { planoId: data.plano?.Id },
                    ipAddress
                );
                
                return res.status(status).json({ 
                    error: payload.message || "Erro ao processar compra do plano",
                    message: payload.message || "Erro ao processar compra do plano"
                });
            }
            
            // Registra compra bem-sucedida na auditoria
            const planoNome = payload.assinaturaPlano?.PlanoAssinatura?.Nome || data.plano?.Nome || 'Desconhecido';
            const valor = payload.assinaturaPlano?.PlanoAssinatura?.Preco || data.plano?.Preco || 0;
            const planoId = payload.assinaturaPlano?.PlanoAssinaturaId || data.plano?.Id || '';
            
            await logPlanoPurchase(
                userId,
                planoId,
                planoNome,
                valor,
                'Sucesso',
                ipAddress
            );
            
            return res.status(201).json(payload);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            console.error('Erro no controller de compra de plano:', error);
            
            // Registra erro na auditoria
            const userId = this.authService.getLoggedUserId(req);
            if (userId) {
                await logPaymentError(
                    userId,
                    'plano',
                    req.body.plano?.Preco || 0,
                    errorMessage,
                    undefined,
                    ipAddress
                );
            }
            
            return res.status(500).json({ 
                message: "Erro ao processar compra do plano", 
                error: errorMessage
            });
        }
    }

    /**
     * Cancela o plano do usuário autenticado.
     * @param req Request do Express.
     * @param res Response do Express.
     * @returns Response com resultado do cancelamento.
     */
    async cancelarPlano(req: Request, res: Response): Promise<Response> {
        const ipAddress = getClientIp(req);
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const response = await this.compraPlanoService.cancelarPlano(req, res, userId);
            
            // Se o cancelamento foi bem-sucedido, registra na auditoria
            // O service retorna Response, então verificamos o statusCode diretamente
            const statusCode = response.statusCode || 500;
            if (statusCode === 200) {
                // A resposta pode conter dados do plano cancelado
                // Como o service retorna Response diretamente, não temos acesso fácil aos dados
                // Vamos registrar após o cancelamento bem-sucedido
                try {
                    const assinaturaPlanoId = req.body.assinaturaPlanoId;
                    if (assinaturaPlanoId) {
                        await logPlanoCancel(
                            userId,
                            assinaturaPlanoId,
                            'Plano cancelado',
                            req.body.motivo,
                            ipAddress
                        );
                    }
                } catch (auditError) {
                    console.error('Erro ao registrar auditoria de cancelamento:', auditError);
                    // Não interrompe o fluxo
                }
            }
            
            return response;
        } catch (error) {
            return res.status(500).json({ message: "Erro ao cancelar plano", error: (error as Error).message });
        }
    }

    /**
     * Realiza o upgrade do plano do usuário autenticado.
     * @param req Request do Express.
     * @param res Response do Express.
     * @returns Response com resultado do upgrade.
     */
    async upgradePlano(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            return await this.compraPlanoService.upgradePlano(req, res, userId);
        } catch (error) {
            return res.status(500).json({ message: "Erro ao realizar upgrade de plano", error: (error as Error).message });
        }
    }

    /**
     * Realiza o downgrade do plano do usuário autenticado.
     * @param req Request do Express.
     * @param res Response do Express.
     * @returns Response com resultado do downgrade.
     */
    async downgradePlano(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            return await this.compraPlanoService.downgradePlano(req, res, userId);
        } catch (error) {
            return res.status(500).json({ message: "Erro ao realizar downgrade de plano", error: (error as Error).message });
        }
    }

    /**
     * Busca os planos do paciente.
     * @param req Request do Express.
     * @param res Response do Express.
     * @returns Response com lista de planos do paciente.
     */
    async getPlanosPaciente(req: Request, res: Response): Promise<Response> {
        try {
            return await this.compraPlanoService.getPlanosPaciente(req, res);
        } catch (error) {
            return res.status(500).json({ message: "Erro ao buscar planos do paciente", error: (error as Error).message });
        }
    }
}
