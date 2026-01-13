import { VindiService } from './vindi.service';
import prisma from '../prisma/client';

export interface TrocaCartaoPayload {
    userId: string;
    nomeTitular: string;
    numeroCartao: string;
    validade: string; // formato MM/YY
    cvv: string;
    gateway_token: string;
    payment_company_code: string;
}

export interface TrocaCartaoResponse {
    success: boolean;
    message: string;
    paymentProfileId?: string;
}

export class TrocaCartaoService {
    /**
     * Troca o cartão de crédito de uma subscription na Vindi.
     * Usa tokenização (mesma lógica do checkout) e o método de renovação de cartão.
     */
    async trocarCartao(data: TrocaCartaoPayload): Promise<TrocaCartaoResponse> {
        try {
            // 1. Buscar usuário e validar
            const user = await prisma.user.findUnique({
                where: { Id: data.userId },
                select: {
                    Id: true,
                    VindiCustomerId: true,
                    SubscriptionId: true,
                }
            });

            if (!user) {
                return {
                    success: false,
                    message: 'Usuário não encontrado.'
                };
            }

            if (!user.VindiCustomerId) {
                return {
                    success: false,
                    message: 'Usuário não possui cliente cadastrado na Vindi.'
                };
            }

            if (!user.SubscriptionId) {
                return {
                    success: false,
                    message: 'Usuário não possui assinatura ativa.'
                };
            }

            // 2. Criar novo payment_profile usando gateway_token (tokenização)
            let paymentProfile;
            try {
                paymentProfile = await VindiService.createPaymentProfileFromToken({
                    gateway_token: data.gateway_token,
                    payment_company_code: data.payment_company_code,
                    customer_id: user.VindiCustomerId
                });
            } catch (error: any) {
                console.error('Erro ao criar payment_profile na Vindi:', error);
                return {
                    success: false,
                    message: `Erro ao criar perfil de pagamento: ${error.message}`
                };
            }

            if (!paymentProfile || !paymentProfile.id) {
                return {
                    success: false,
                    message: 'Erro ao criar perfil de pagamento na Vindi.'
                };
            }

            const paymentProfileId = paymentProfile.id;

            // 3. Atualizar a subscription para usar o novo payment_profile (renovação de cartão)
            try {
                await VindiService.updateSubscriptionPaymentProfile(
                    user.SubscriptionId,
                    paymentProfileId
                );
            } catch (error: any) {
                console.error('Erro ao atualizar subscription na Vindi:', error);
                return {
                    success: false,
                    message: `Erro ao atualizar assinatura: ${error.message}`
                };
            }

            // Não salva no banco de dados - apenas efetua a troca na Vindi
            return {
                success: true,
                message: 'Cartão atualizado com sucesso na Vindi!',
                paymentProfileId: String(paymentProfileId)
            };

        } catch (error: any) {
            console.error('Erro ao trocar cartão:', error);
            return {
                success: false,
                message: `Erro ao processar troca de cartão: ${error.message || 'Erro desconhecido'}`
            };
        }
    }
}

