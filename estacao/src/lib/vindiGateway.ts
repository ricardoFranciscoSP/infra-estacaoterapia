// Tipos para erros da API Vindi
interface VindiErrorItem {
    message?: string;
    parameter?: string;
}

interface VindiErrorResponse {
    errors?: VindiErrorItem[] | string;
    message?: string;
    error?: string;
}

// Tipos para resposta de sucesso da API Vindi
interface VindiPaymentProfile {
    gateway_token: string;
    customer_id: number;
    payment_method_code: string;
}

interface VindiSuccessResponse {
    payment_profile: VindiPaymentProfile;
}

/**
 * Interface para resposta da API de configuração Vindi
 */
interface VindiConfigResponse {
    vindiPublicKey: string;
}

/**
 * Função auxiliar para obter a chave pública da Vindi
 * Sempre busca via API route em runtime para garantir funcionamento mesmo com placeholder no build
 * Compatível 100% com Docker - lê variáveis de ambiente em tempo de execução
 */
async function getVindiPublicKey(): Promise<string> {
    // No cliente, sempre buscar via API route (mais confiável que variáveis de ambiente do build)
    if (typeof window !== 'undefined') {
        try {
            console.log('[VindiGateway] Buscando chave pública via API route...');

            // Usar URL relativa para funcionar em qualquer ambiente (Docker, localhost, produção)
            const apiUrl = `${window.location.origin}/api/vindi-config/key`;

            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                // Não cachear para sempre obter valor atualizado do servidor
                cache: 'no-store',
                // Timeout de 10 segundos
                signal: AbortSignal.timeout(10000),
            });

            if (!response.ok) {
                const errorData: VindiErrorResponse = await response.json().catch(() => ({
                    message: response.statusText,
                }));
                throw new Error(
                    errorData.message ||
                    `Erro ao obter chave pública da Vindi: ${response.status} ${response.statusText}`
                );
            }

            const data = await response.json() as VindiConfigResponse;

            if (!data.vindiPublicKey) {
                throw new Error('Chave pública da Vindi não retornada pela API');
            }

            console.log('[VindiGateway] Chave pública obtida via API com sucesso');
            return data.vindiPublicKey;
        } catch (error) {
            console.error('[VindiGateway] Erro ao buscar chave pública via API:', error);

            // Fallback: tentar usar variável de ambiente se disponível (apenas em desenvolvimento)
            const fallbackKey = process.env.NEXT_PUBLIC_VINDI_PUBLIC_KEY || process.env.VINDI_PUBLIC_KEY;
            if (fallbackKey && fallbackKey.trim() && !fallbackKey.includes('__PLACEHOLDER_')) {
                console.warn('[VindiGateway] Usando chave pública do fallback (variável de ambiente)');
                return fallbackKey;
            }

            throw new Error(
                `Não foi possível obter a chave pública da Vindi. ` +
                `Verifique se a variável VINDI_PUBLIC_KEY está configurada no Docker ou arquivo de ambiente. ` +
                `Erro: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    // No servidor (SSR), usar variável de ambiente diretamente (Docker lê daqui)
    const vindiPublicKey = process.env.VINDI_PUBLIC_KEY || process.env.NEXT_PUBLIC_VINDI_PUBLIC_KEY;

    if (!vindiPublicKey || vindiPublicKey.trim() === '' || vindiPublicKey.includes('__PLACEHOLDER_')) {
        throw new Error(
            "Chave pública da Vindi não configurada no servidor. " +
            "Configure VINDI_PUBLIC_KEY no Docker ou no arquivo de ambiente."
        );
    }

    if (vindiPublicKey.includes('__PLACEHOLDER_')) {
        throw new Error(
            "Chave pública da Vindi contém placeholder. " +
            "Configure o valor real em VINDI_PUBLIC_KEY no Docker ou arquivo de ambiente."
        );
    }

    return vindiPublicKey;
}

// Tipo para retorno da função generateGatewayToken
interface GenerateGatewayTokenResponse {
    gateway_token: string | undefined;
    customer_id: number | undefined;
    payment_method_code: string | undefined;
}

// Tipo para o callback getPaymentCompanyInfo
interface PaymentCompanyInfo {
    payment_company_code: string;
}

export async function generateGatewayToken({
    nomeTitular,
    numeroCartao,
    validade,
    cvv,
    getPaymentCompanyInfo
}: {
    nomeTitular: string;
    numeroCartao: string;
    validade: string;
    cvv: string;
    getPaymentCompanyInfo: (numeroCartao: string) => PaymentCompanyInfo;
}): Promise<GenerateGatewayTokenResponse> {
    const paymentInfo = getPaymentCompanyInfo(numeroCartao);
    if (!paymentInfo.payment_company_code) {
        throw new Error("Bandeira do cartão não suportada.");
    }

    const paymentData = {
        holder_name: nomeTitular,
        card_number: numeroCartao.replace(/\D/g, ""),
        card_expiration: validade,
        card_cvv: cvv,
        payment_method_code: "credit_card",
        payment_company_code: paymentInfo.payment_company_code,
    };

    // Obter chave pública (com fallback para API route se necessário)
    const vindiPublicKey = await getVindiPublicKey();

    // URL da API Vindi é pública e pode ser definida diretamente
    // Usar sandbox por padrão - pode ser alterado para produção quando necessário
    const vindiApiUrl = 'https://sandbox-app.vindi.com.br/api/v1';

    // Normaliza a URL: remove barras finais
    const normalizedUrl = vindiApiUrl.replace(/\/+$/, '');
    const endpointUrl = `${normalizedUrl}/public/payment_profiles`;

    console.log('[VindiGateway] Configuração:', {
        originalUrl: vindiApiUrl,
        normalizedUrl,
        endpointUrl,
        hasPublicKey: !!vindiPublicKey,
        publicKeyPreview: vindiPublicKey ? `${vindiPublicKey.substring(0, 8)}...` : 'não configurada'
    });

    const response = await fetch(endpointUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Basic ${btoa(`${vindiPublicKey}:`)}`,
        },
        // Evita envio de referrer com dados sensíveis
        referrerPolicy: "no-referrer",
        body: JSON.stringify(paymentData),
    });

    // Verifica o content-type antes de tentar parsear
    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    if (!response.ok) {
        let errorMsg = "Erro ao gerar token de pagamento.";
        try {
            if (isJson) {
                const errorData: VindiErrorResponse = await response.json();
                errorMsg = errorData.errors
                    ? (Array.isArray(errorData.errors)
                        ? errorData.errors.map((e: VindiErrorItem) => e.message || String(e)).join(", ")
                        : String(errorData.errors))
                    : errorData.message || errorData.error || errorMsg;

                console.error("Erro Vindi API:", {
                    status: response.status,
                    statusText: response.statusText,
                    url: endpointUrl,
                    errors: errorData?.errors ? "fornecidos" : undefined,
                });
            } else {
                // Se não for JSON, tenta ler como texto para debug
                const textResponse = await response.text();
                console.error("Erro Vindi API (resposta não-JSON):", {
                    status: response.status,
                    statusText: response.statusText,
                    contentType,
                    url: endpointUrl,
                    responsePreview: textResponse.substring(0, 200),
                });

                // Mensagens mais específicas baseadas no status
                if (response.status === 404) {
                    errorMsg = `Endpoint da API de pagamento não encontrado (404). URL tentada: ${endpointUrl}. Verifique se a URL da API Vindi está correta.`;
                } else if (response.status === 401 || response.status === 403) {
                    errorMsg = "Erro de autenticação na API de pagamento. Verifique as credenciais da Vindi (NEXT_PUBLIC_VINDI_PUBLIC_KEY).";
                } else if (response.status >= 500) {
                    errorMsg = "Erro interno no servidor de pagamento. Tente novamente mais tarde.";
                } else {
                    errorMsg = `Erro ao processar pagamento (${response.status}). Tente novamente.`;
                }
            }
        } catch (err) {
            console.error("Erro ao processar resposta da Vindi:", err instanceof Error ? err.message : String(err));
            if (response.status === 404) {
                errorMsg = `Endpoint da API de pagamento não encontrado (404). URL tentada: ${endpointUrl}.`;
            } else if (response.status >= 500) {
                errorMsg = "Erro interno no servidor de pagamento. Tente novamente mais tarde.";
            }
        }
        throw new Error(errorMsg);
    }

    let data: VindiSuccessResponse;
    try {
        if (!isJson) {
            const textResponse = await response.text();
            console.error("Resposta da Vindi não é JSON:", {
                status: response.status,
                contentType,
                responsePreview: textResponse.substring(0, 200),
            });
            throw new Error("Resposta inválida da API de pagamento. Formato não suportado.");
        }
        data = await response.json();
    } catch (err) {
        if (err instanceof Error && err.message.includes("Resposta inválida")) {
            throw err;
        }
        console.error("Erro ao converter resposta da Vindi em JSON:", err instanceof Error ? err.message : String(err));
        throw new Error("Erro ao processar resposta da API de pagamento. Tente novamente.");
    }

    return {
        gateway_token: data.payment_profile?.gateway_token,
        customer_id: data.payment_profile?.customer_id,
        payment_method_code: data.payment_profile?.payment_method_code
    } as GenerateGatewayTokenResponse;
}
