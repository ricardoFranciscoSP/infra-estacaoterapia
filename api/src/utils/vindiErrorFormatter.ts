/**
 * Utilitário para formatar mensagens de erro da Vindi com status detalhados
 */

export interface VindiErrorDetails {
    status?: string;
    billStatus?: string;
    chargeStatus?: string;
    paymentMethod?: string;
    errors?: Array<{ parameter?: string; message?: string }>;
    gatewayMessage?: string;
    responseData?: {
        bill?: { status?: string };
        charge?: { status?: string };
        payment_method?: { code?: string };
        errors?: Array<{ parameter?: string; message?: string }>;
        [key: string]: unknown;
    };
}

type VindiError = {
    responseData?: VindiErrorDetails['responseData'];
    [key: string]: unknown;
};

/**
 * Mapeia status da Vindi para mensagens amigáveis em português
 */
const VINDI_STATUS_MESSAGES: Record<string, string> = {
    // Status de Bill (Fatura)
    'pending': 'Aguardando pagamento',
    'paid': 'Pagamento aprovado',
    'canceled': 'Pagamento cancelado',
    'failed': 'Pagamento falhou',
    'rejected': 'Pagamento rejeitado',
    'refunded': 'Pagamento estornado',
    'seen': 'Fatura visualizada',
    'overpaid': 'Pagamento acima do valor',
    'underpaid': 'Pagamento abaixo do valor',
    
    // Status de Charge (Cobrança)
    'waiting': 'Aguardando processamento',
    'processing': 'Processando pagamento',
    'authorized': 'Pagamento autorizado',
    'unauthorized': 'Pagamento não autorizado',
    'captured': 'Pagamento capturado',
    'voided': 'Pagamento anulado',
    
    // Status de Payment Profile
    'active': 'Ativo',
    'inactive': 'Inativo',
    'expired': 'Expirado',
};

/**
 * Formata mensagem de erro da Vindi com status detalhado
 */
export function formatVindiErrorMessage(
    baseMessage: string,
    errorDetails?: VindiErrorDetails,
    context: 'plano' | 'consulta_avulsa' = 'plano'
): string {
    let message = baseMessage;
    const details: string[] = [];

    // Adiciona status da fatura (bill) se disponível
    if (errorDetails?.billStatus) {
        const statusMsg = VINDI_STATUS_MESSAGES[errorDetails.billStatus.toLowerCase()] || errorDetails.billStatus;
        details.push(`Status da fatura: ${statusMsg}`);
    }

    // Adiciona status da cobrança (charge) se disponível
    if (errorDetails?.chargeStatus) {
        const statusMsg = VINDI_STATUS_MESSAGES[errorDetails.chargeStatus.toLowerCase()] || errorDetails.chargeStatus;
        details.push(`Status da cobrança: ${statusMsg}`);
    }

    // Adiciona status geral se disponível
    if (errorDetails?.status && !errorDetails.billStatus && !errorDetails.chargeStatus) {
        const statusMsg = VINDI_STATUS_MESSAGES[errorDetails.status.toLowerCase()] || errorDetails.status;
        details.push(`Status: ${statusMsg}`);
    }

    // Adiciona método de pagamento se disponível
    if (errorDetails?.paymentMethod) {
        const methodName = errorDetails.paymentMethod === 'credit_card' ? 'Cartão de crédito' :
                          errorDetails.paymentMethod === 'pix' ? 'PIX' :
                          errorDetails.paymentMethod;
        details.push(`Método de pagamento: ${methodName}`);
    }

    // Adiciona mensagem do gateway se disponível
    if (errorDetails?.gatewayMessage) {
        details.push(`Detalhes: ${errorDetails.gatewayMessage}`);
    }

    // Adiciona erros específicos da Vindi se disponíveis
    if (errorDetails?.errors && Array.isArray(errorDetails.errors) && errorDetails.errors.length > 0) {
        const errorMessages = errorDetails.errors
            .map(err => {
                if (err.parameter && err.message) {
                    return `${err.parameter}: ${err.message}`;
                }
                return err.message || err.parameter || '';
            })
            .filter(msg => msg.length > 0);
        
        if (errorMessages.length > 0) {
            details.push(`Erros: ${errorMessages.join('; ')}`);
        }
    }

    // Monta mensagem final
    if (details.length > 0) {
        message += ` (${details.join(' | ')})`;
    }

    return message;
}

/**
 * Extrai detalhes de erro de uma resposta da Vindi
 */
export function extractVindiErrorDetails(error: unknown): VindiErrorDetails {
    const vindiError = error as VindiError;
    const details: VindiErrorDetails = {};

    // Tenta extrair do responseData
    if (vindiError?.responseData) {
        if (vindiError.responseData.bill?.status) {
            details.billStatus = vindiError.responseData.bill.status;
        }
        if (vindiError.responseData.charge?.status) {
            details.chargeStatus = vindiError.responseData.charge.status;
        }
        if (vindiError.responseData.payment_method?.code) {
            details.paymentMethod = vindiError.responseData.payment_method.code;
        }
        if (vindiError.responseData.errors) {
            details.errors = vindiError.responseData.errors;
        }
        if (vindiError.responseData.gateway_message) {
            details.gatewayMessage = String(vindiError.responseData.gateway_message);
        }
        details.responseData = vindiError.responseData;
    }

    // Tenta extrair diretamente do objeto
    if (vindiError?.bill && typeof vindiError.bill === 'object' && 'status' in vindiError.bill) {
        details.billStatus = String(vindiError.bill.status);
    }
    if (vindiError?.charge && typeof vindiError.charge === 'object' && 'status' in vindiError.charge) {
        details.chargeStatus = String(vindiError.charge.status);
    }
    if (vindiError?.status) {
        details.status = String(vindiError.status);
    }
    if (vindiError?.payment_method && typeof vindiError.payment_method === 'object' && 'code' in vindiError.payment_method) {
        details.paymentMethod = String(vindiError.payment_method.code);
    }
    if (vindiError?.gateway_message) {
        details.gatewayMessage = String(vindiError.gateway_message);
    }
    if (vindiError?.errors) {
        details.errors = Array.isArray(vindiError.errors) ? vindiError.errors : [vindiError.errors];
    }

    return details;
}

