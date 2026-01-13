import { Request, Response } from 'express';
import { TrocaCartaoService } from '../services/trocaCartao.service';

export class TrocaCartaoController {
    private trocaCartaoService: TrocaCartaoService;

    constructor() {
        this.trocaCartaoService = new TrocaCartaoService();
    }

    async trocarCartao(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.userId || (req as any).user?.Id;
            
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Usuário não autenticado.'
                });
                return;
            }

            const { nomeTitular, numeroCartao, validade, cvv, gateway_token, payment_company_code } = req.body;

            // Validações básicas
            if (!nomeTitular || !numeroCartao || !validade || !cvv || !gateway_token || !payment_company_code) {
                res.status(400).json({
                    success: false,
                    message: 'Dados do cartão incompletos.'
                });
                return;
            }

            const result = await this.trocaCartaoService.trocarCartao({
                userId,
                nomeTitular,
                numeroCartao,
                validade,
                cvv,
                gateway_token,
                payment_company_code
            });

            if (result.success) {
                res.status(200).json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error: any) {
            console.error('Erro no controller de troca de cartão:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor ao processar troca de cartão.'
            });
        }
    }
}











