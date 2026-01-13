import axios, { AxiosInstance } from 'axios';
import jwt from 'jsonwebtoken';
import { CreatePaymentProfileFromTokenParams } from '../types/compraPlano.types';

// Configuração robusta de URL e chave da API da Vindi
const VINDI_API_URL =
    process.env.VINDI_API_URL ||
    process.env.SAND_BOX_VINDI_URL ||
    'https://sandbox-app.vindi.com.br/api/v1/';

const VINDI_API_KEY =
    process.env.VINDI_API_KEY_PRIVADA ||
    process.env.VINDI_API_KEY_PRIVADA_DEV ||
    '';

// Vindi usa Basic Auth com "api_key:" (dois pontos ao final)
const basicToken = VINDI_API_KEY ? Buffer.from(`${VINDI_API_KEY}:`).toString('base64') : '';

if (!basicToken) {
    console.warn('[Vindi] Chave da API ausente. Verifique VINDI_API_KEY_PRIVADA ou VINDI_API_KEY_PRIVADA_DEV.');
}

const API: AxiosInstance = axios.create({
    baseURL: VINDI_API_URL,
    headers: {
        Authorization: `Basic ${basicToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
});


interface CustomerInput {
    name: string;
    email: string;
    registry_code: string;
    telefone?: string;
    metadata?: Record<string, any>;
    notes?: string;
    code?: string;
    address?: {
        street: string;
        number: string;
        additional_details?: string;
        zipcode: string;
        neighborhood: string;
        city: string;
        state: string;
        country: string;
    };
    phones?: {
        phone_type: string;
        number: string;
        extension?: string;
    }[];
}


interface SubscriptionInput {
    customer_id: string;
    plan_id: string;
    payment_method_code: string;
    product_items: { product_id: number }[];
    installments?: number;
    start_at?: string; // formato ISO opcional
    metadata?: Record<string, any>;
    payment_profile_id?: number;
}

export class VindiService {
    // Cria apenas o cliente na Vindi e retorna o objeto da Vindi
    static async createCustomer(data: CustomerInput): Promise<any> {
        // Removido: validação de name, email e cpf (já vem tratado)
        const payload: any = {
            name: data.name,
            email: data.email,
            registry_code: data.registry_code,
            metadata: {},
        };

        if (data.address) {
            payload.address = {
                street: data.address.street,
                number: data.address.number,
                additional_details: data.address.additional_details,
                zipcode: data.address.zipcode,
                neighborhood: data.address.neighborhood,
                city: data.address.city,
                state: data.address.state,
                country: 'BR',
            };
        }
        if (data.telefone) {
            const numero = data.telefone.replace(/\D/g, '');
            if (numero) {
                payload.phones = [
                    {
                        phone_type: 'mobile',
                        number: numero,
                        extension: ''
                    }
                ];
            }
        }

        try {
            const response = await API.post('customers', payload);
            return response.data.customer;
        } catch (error: any) {
            let vindiErrorDetail = error.response?.data;
            if (vindiErrorDetail?.errors) {
                console.error('Detalhes do erro Vindi:', JSON.stringify(vindiErrorDetail.errors, null, 2));
                // Retorne a mensagem detalhada para o AuthService
                throw new Error(
                    vindiErrorDetail.errors.map((e: any) => `${e.parameter}: ${e.message}`).join(' | ')
                );
            }
            console.error('Erro ao criar cliente na Vindi:', {
                message: error.message,
                status: error.response?.status,
                responseData: vindiErrorDetail,
                payloadEnviado: payload
            });
            throw new Error('Erro ao criar usuário na Vindi.');
        }
    }

    static async getCustomerById(customerId: string): Promise<any> {
        try {
            const response = await API.get(`customers/${customerId}`);
            return response.data.customer;
        } catch (error: any) {
            let vindiErrorDetail = error.response?.data;
            if (vindiErrorDetail?.errors) {
                console.error('Detalhes do erro Vindi:', JSON.stringify(vindiErrorDetail.errors, null, 2));
                throw new Error(
                    vindiErrorDetail.errors.map((e: any) => `${e.parameter}: ${e.message}`).join(' | ')
                );
            }
            console.error('Erro ao buscar cliente na Vindi:', {
                message: error.message,
                status: error.response?.status,
                responseData: vindiErrorDetail,
                customerId
            });
            throw new Error('Erro ao buscar usuário na Vindi.');
        }
    }

    // Cria uma assinatura na Vindi e retorna o objeto da assinatura
    static async createSubscription(data: SubscriptionInput & { payment_profile_id?: number }): Promise<any> {
        // Monta o payload apenas com os campos necessários
        const payload: any = {
            plan_id: data.plan_id,
            customer_id: data.customer_id,
            payment_method_code: data.payment_method_code,
            payment_profile_id: data.payment_profile_id
        };

        // Adiciona product_items se fornecido
        if (data.product_items && data.product_items.length > 0) {
            payload.product_items = data.product_items;
        }

        // Adiciona start_at se fornecido (para agendamento futuro)
        if (data.start_at) {
            payload.start_at = data.start_at;
        }

        // Adiciona installments se fornecido
        if (data.installments) {
            payload.installments = data.installments;
        }

        // Adiciona metadata se fornecido
        if (data.metadata) {
            payload.metadata = data.metadata;
        }

        try {
            const response = await API.post('subscriptions', payload);
            return response.data.subscription;
        } catch (error: any) {
            let vindiErrorDetail = error.response?.data;
            if (vindiErrorDetail?.errors) {
                console.error('Detalhes do erro Vindi:', JSON.stringify(vindiErrorDetail.errors, null, 2));
                throw new Error(
                    vindiErrorDetail.errors.map((e: any) => `${e.parameter}: ${e.message}`).join(' | ')
                );
            }
            console.error('Erro ao criar assinatura na Vindi:', {
                message: error.message,
                status: error.response?.status,
                responseData: vindiErrorDetail,
                payloadEnviado: payload
            });
            throw new Error('Erro ao criar assinatura na Vindi.');
        }
    }

    // Busca as faturas (bills) de uma assinatura
    static async getBillsBySubscriptionId(subscriptionId: string): Promise<any> {
        try {
            const response = await API.get(`subscriptions/${subscriptionId}/bills`);
            return response.data.bills;
        } catch (error: any) {
            let vindiErrorDetail = error.response?.data;
            if (vindiErrorDetail?.errors) {
                console.error('Detalhes do erro Vindi:', JSON.stringify(vindiErrorDetail.errors, null, 2));
                throw new Error(
                    vindiErrorDetail.errors.map((e: any) => `${e.parameter}: ${e.message}`).join(' | ')
                );
            }
            console.error('Erro ao buscar bills na Vindi:', {
                message: error.message,
                status: error.response?.status,
                responseData: vindiErrorDetail,
                subscriptionId
            });
            throw new Error('Erro ao buscar bills na Vindi.');
        }
    }

    // Busca as cobranças (charges) de uma assinatura
    static async getChargesBySubscriptionId(subscriptionId: string): Promise<any> {
        try {
            const response = await API.get(`subscriptions/${subscriptionId}/charges`);
            return response.data.charges;
        } catch (error: any) {
            let vindiErrorDetail = error.response?.data;
            if (vindiErrorDetail?.errors) {
                console.error('Detalhes do erro Vindi:', JSON.stringify(vindiErrorDetail.errors, null, 2));
                throw new Error(
                    vindiErrorDetail.errors.map((e: any) => `${e.parameter}: ${e.message}`).join(' | ')
                );
            }
            console.error('Erro ao buscar charges na Vindi:', {
                message: error.message,
                status: error.response?.status,
                responseData: vindiErrorDetail,
                subscriptionId
            });
            throw new Error('Erro ao buscar charges na Vindi.');
        }
    }

    // Cria uma fatura (bill) para uma assinatura
    static async createBillForSubscription(subscriptionId: string, data?: any): Promise<any> {
        try {
            const response = await API.post(`subscriptions/${subscriptionId}/bills`, data || {});
            return response.data.bill;
        } catch (error: any) {
            let vindiErrorDetail = error.response?.data;
            if (vindiErrorDetail?.errors) {
                console.error('Detalhes do erro Vindi:', JSON.stringify(vindiErrorDetail.errors, null, 2));
                throw new Error(
                    vindiErrorDetail.errors.map((e: any) => `${e.parameter}: ${e.message}`).join(' | ')
                );
            }
            console.error('Erro ao criar fatura (bill) na Vindi:', {
                message: error.message,
                status: error.response?.status,
                responseData: vindiErrorDetail,
                subscriptionId,
                payloadEnviado: data
            });
            throw new Error('Erro ao criar fatura (bill) na Vindi.');
        }
    }

    // Cria um novo perfil de pagamento para um cliente existente
    static async createPaymentProfile(data: {
        holder_name: string;
        card_expiration: string;
        card_number: string;
        card_cvv: string;
        payment_method_code: string;
        payment_company_code: string;
        customer_id: number;
    }): Promise<any> {
        try {
            const response = await API.post('payment_profiles', data);
            return response.data.payment_profile;
        } catch (error: any) {
            let vindiErrorDetail = error.response?.data;
            if (vindiErrorDetail?.errors) {
                console.error('Detalhes do erro Vindi:', JSON.stringify(vindiErrorDetail.errors, null, 2));
                throw new Error(
                    vindiErrorDetail.errors.map((e: any) => `${e.parameter}: ${e.message}`).join(' | ')
                );
            }
            console.error('Erro ao criar payment_profile na Vindi:', {
                message: error.message,
                status: error.response?.status,
                responseData: vindiErrorDetail,
                payloadEnviado: data
            });
            throw new Error('Erro ao criar payment_profile na Vindi.');
        }
    }

    // Deleta uma assinatura (subscription) pelo id
    static async deleteSubscription(subscriptionId: string): Promise<void> {
        try {
            await API.delete(`subscriptions/${subscriptionId}`);
        } catch (error: any) {
            let vindiErrorDetail = error.response?.data;
            if (vindiErrorDetail?.errors) {
                console.error('Detalhes do erro Vindi:', JSON.stringify(vindiErrorDetail.errors, null, 2));
                throw new Error(
                    vindiErrorDetail.errors.map((e: any) => `${e.parameter}: ${e.message}`).join(' | ')
                );
            }
            console.error('Erro ao deletar assinatura na Vindi:', {
                message: error.message,
                status: error.response?.status,
                responseData: vindiErrorDetail,
                subscriptionId
            });
            throw new Error('Erro ao deletar assinatura na Vindi.');
        }
    }

    // Cria uma fatura (bill) avulsa para um cliente e produto específico
    static async createBill(data: {
        customer_id: number;
        payment_method_code?: string;
        payment_profile_id?: number | string;
        bill_items: { product_id: number; amount: number }[];
    }): Promise<any> {
        try {
            const payload: any = {
                customer_id: data.customer_id,
                bill_items: data.bill_items
            };

            // Adiciona payment_method_code se fornecido
            if (data.payment_method_code) {
                payload.payment_method_code = data.payment_method_code;
            }

            // Adiciona payment_profile_id se fornecido (para cobrança automática no cartão)
            if (data.payment_profile_id) {
                payload.payment_profile_id = typeof data.payment_profile_id === 'string'
                    ? Number(data.payment_profile_id)
                    : data.payment_profile_id;
            }

            const response = await API.post('bills', payload);
            return response.data.bill;
        } catch (error: any) {
            let vindiErrorDetail = error.response?.data;
            if (vindiErrorDetail?.errors) {
                console.error('Detalhes do erro Vindi:', JSON.stringify(vindiErrorDetail.errors, null, 2));
                throw new Error(
                    vindiErrorDetail.errors.map((e: any) => `${e.parameter}: ${e.message}`).join(' | ')
                );
            }
            console.error('Erro ao criar bill avulsa na Vindi:', {
                message: error.message,
                status: error.response?.status,
                responseData: vindiErrorDetail,
                payloadEnviado: data
            });
            throw new Error('Erro ao criar bill avulsa na Vindi.');
        }
    }

    // Cria um produto na Vindi
    static async createProduct(data: {
        name: string;
        code: string;
        unit: string;
        status?: string;
        description?: string;
        invoice?: string;
        pricing_schema: {
            price: number;
            minimum_price?: number;
            schema_type: string;
            pricing_ranges?: Array<{
                start_quantity: number;
                end_quantity: number;
                price: number;
                overage_price?: number;
            }>;
        };
        metadata?: Record<string, unknown>;
        body?: string;
    }): Promise<unknown> {
        const payload: {
            name: string;
            code: string;
            unit: string;
            status: string;
            description: string;
            invoice: string;
            pricing_schema: {
                price: number;
                minimum_price: number;
                schema_type: string;
                pricing_ranges: Array<{
                    start_quantity: number;
                    end_quantity: number;
                    price: number;
                    overage_price?: number;
                }>;
            };
            metadata: Record<string, unknown>;
            body: string;
        } = {
            name: data.name,
            code: data.code,
            unit: data.unit,
            status: data.status || "active",
            description: data.description || "",
            invoice: data.invoice || "always",
            pricing_schema: {
                price: data.pricing_schema.price,
                minimum_price: data.pricing_schema.minimum_price || 0,
                schema_type: data.pricing_schema.schema_type,
                pricing_ranges: data.pricing_schema.pricing_ranges || [],
            },
            metadata: data.metadata || {},
            body: data.body || "Unknown Type: Create"
        };

        try {
            const response = await API.post('products', payload);
            return response.data.product;
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { errors?: Array<{ parameter?: string; message?: string }> } } };
            const vindiErrorDetail = axiosError.response?.data;
            if (vindiErrorDetail?.errors) {
                console.error('Detalhes do erro Vindi:', JSON.stringify(vindiErrorDetail.errors, null, 2));
                throw new Error(
                    vindiErrorDetail.errors.map((e) => `${e.parameter}: ${e.message}`).join(' | ')
                );
            }
            console.error('Erro ao criar produto na Vindi:', {
                message: error instanceof Error ? error.message : String(error),
                status: axiosError.response?.data,
                payloadEnviado: payload
            });
            throw new Error('Erro ao criar produto na Vindi.');
        }
    }

    // Atualiza um produto na Vindi
    static async updateProduct(productId: string | number, data: {
        name?: string;
        code?: string;
        unit?: string;
        status?: string;
        description?: string;
        invoice?: string;
        pricing_schema?: {
            price?: number;
            minimum_price?: number;
            schema_type?: string;
            pricing_ranges?: Array<{
                start_quantity: number;
                end_quantity: number;
                price: number;
                overage_price?: number;
            }>;
        };
        metadata?: Record<string, unknown>;
        body?: string;
    }): Promise<unknown> {
        const payload: Record<string, unknown> = {};

        if (data.name !== undefined) payload.name = data.name;
        if (data.code !== undefined) payload.code = data.code;
        if (data.unit !== undefined) payload.unit = data.unit;
        if (data.status !== undefined) payload.status = data.status;
        if (data.description !== undefined) payload.description = data.description;
        if (data.invoice !== undefined) payload.invoice = data.invoice;
        if (data.pricing_schema !== undefined) payload.pricing_schema = data.pricing_schema;
        if (data.metadata !== undefined) payload.metadata = data.metadata;
        if (data.body !== undefined) payload.body = data.body;

        try {
            const response = await API.put(`products/${productId}`, payload);
            return response.data.product;
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { errors?: Array<{ parameter?: string; message?: string }> } } };
            const vindiErrorDetail = axiosError.response?.data;
            if (vindiErrorDetail?.errors) {
                console.error('Detalhes do erro Vindi:', JSON.stringify(vindiErrorDetail.errors, null, 2));
                throw new Error(
                    vindiErrorDetail.errors.map((e) => `${e.parameter}: ${e.message}`).join(' | ')
                );
            }
            console.error('Erro ao atualizar produto na Vindi:', {
                message: error instanceof Error ? error.message : String(error),
                status: axiosError.response?.data,
                productId,
                payloadEnviado: payload
            });
            throw new Error('Erro ao atualizar produto na Vindi.');
        }
    }

    // Cria uma fatura (invoice) avulsa para um cliente e produto específico
    static async createInvoice(data: {
        customer_id: number;
        items: { product_id: number; quantity: number; price: number }[];
        metadata?: Record<string, any>;
    }): Promise<any> {
        const payload: any = {
            customer_id: data.customer_id,
            items: data.items,
            metadata: data.metadata || {}
        };

        try {
            const response = await API.post('invoices', payload);
            return response.data.invoice;
        } catch (error: any) {
            let vindiErrorDetail = error.response?.data;
            if (vindiErrorDetail?.errors) {
                console.error('Detalhes do erro Vindi:', JSON.stringify(vindiErrorDetail.errors, null, 2));
                throw new Error(
                    vindiErrorDetail.errors.map((e: any) => `${e.parameter}: ${e.message}`).join(' | ')
                );
            }
            console.error('Erro ao criar invoice avulsa na Vindi:', {
                message: error.message,
                status: error.response?.status,
                responseData: vindiErrorDetail,
                payloadEnviado: payload
            });
            throw new Error('Erro ao criar invoice avulsa na Vindi.');
        }
    }

    /**
     * Cria um pagamento (bill) para um cliente e produto específico.
     * Retorna os dados relevantes do pagamento, incluindo informações de PIX se disponíveis.
     */
    static async createPayment(data: {
        customer_id: number;
        payment_method_code: string;
        bill_items: { product_id: number; amount: number }[];
        quantity?: number; // Opcional, para casos de cobrança por quantidade
        pix?: boolean; // Se true, tenta criar um pagamento com PIX

    }): Promise<{
        bill_id: number;
        bill_code: string;
        amount: number;
        status: string;
        quantity?: number;
        payment_method_code: string;

        pix?: {
            qr_code: string;
            qr_code_text: string;
        };
    }> {
        try {
            const response = await API.post('bills', data);
            const bill = response.data.bill;
            return {
                bill_id: bill.id,
                bill_code: bill.code,
                amount: bill.amount,
                status: bill.status,
                payment_method_code: bill.payment_method?.code,
                quantity: bill.quantity,
                pix: bill.pix ? {
                    qr_code: bill.pix.qr_code,
                    qr_code_text: bill.pix.qr_code_text
                } : undefined
            };
        } catch (error: any) {
            let vindiErrorDetail = error.response?.data;
            if (vindiErrorDetail?.errors) {
                console.error('Detalhes do erro Vindi:', JSON.stringify(vindiErrorDetail.errors, null, 2));
                throw new Error(
                    vindiErrorDetail.errors.map((e: any) => `${e.parameter}: ${e.message}`).join(' | ')
                );
            }
            console.error('Erro ao criar pagamento na Vindi:', {
                message: error.message,
                status: error.response?.status,
                responseData: vindiErrorDetail,
                payloadEnviado: data
            });
            throw new Error('Erro ao criar pagamento na Vindi.');
        }
    }

    /**
     * Busca o status de uma transação (bill) pelo ID.
     * Retorna os dados relevantes do bill, incluindo status e informações de pagamento.
     */
    static async getTransactionStatus(billId: number): Promise<{ bill_id: number; bill_code: string; amount: number; status: string; payment_method_code: string; pix?: { qr_code: string; qr_code_text: string; }; }> {
        try {
            const response = await API.get(`bills/${billId}`);
            const bill = response.data.bill;
            return {
                bill_id: bill.id,
                bill_code: bill.code,
                amount: bill.amount,
                status: bill.status,
                payment_method_code: bill.payment_method?.code,
                pix: bill.pix ? {
                    qr_code: bill.pix.qr_code,
                    qr_code_text: bill.pix.qr_code_text
                } : undefined
            };
        } catch (error: any) {
            let vindiErrorDetail = error.response?.data;
            if (vindiErrorDetail?.errors) {
                console.error('Detalhes do erro Vindi:', JSON.stringify(vindiErrorDetail.errors, null, 2));
                throw new Error(
                    vindiErrorDetail.errors.map((e: any) => `${e.parameter}: ${e.message}`).join(' | ')
                );
            }
            console.error('Erro ao buscar status da transação na Vindi:', {
                message: error.message,
                status: error.response?.status,
                responseData: vindiErrorDetail,
                billId
            });
            throw new Error('Erro ao buscar status da transação na Vindi.');
        }
    }

    /**
     * Busca uma fatura (bill) pelo ID.
     */
    static async getBillById(billId: number): Promise<any> {
        try {
            const response = await API.get(`bills/${billId}`);
            return response.data.bill;
        } catch (error: any) {
            let vindiErrorDetail = error.response?.data;
            if (vindiErrorDetail?.errors) {
                console.error('Detalhes do erro Vindi:', JSON.stringify(vindiErrorDetail.errors, null, 2));
                throw new Error(
                    vindiErrorDetail.errors.map((e: any) => `${e.parameter}: ${e.message}`).join(' | ')
                );
            }
            console.error('Erro ao buscar fatura (bill) na Vindi:', {
                message: error.message,
                status: error.response?.status,
                responseData: vindiErrorDetail,
                billId
            });
            throw new Error('Erro ao buscar fatura (bill) na Vindi.');
        }
    }

    /**
     * Busca bills pendentes de um customer na Vindi
     * @param customerId ID do customer na Vindi
     * @returns Lista de bills pendentes ordenados por data de vencimento
     */
    static async getBillsByCustomerId(customerId: number, status: string = 'pending'): Promise<any[]> {
        try {
            const response = await API.get(`bills`, {
                params: {
                    customer_id: customerId,
                    status: status,
                    per_page: 100 // Busca até 100 bills pendentes
                }
            });
            const bills = response.data.bills || [];
            
            // Ordena por data de vencimento (mais próxima primeiro)
            return bills.sort((a: any, b: any) => {
                const dateA = a.due_at ? new Date(a.due_at).getTime() : 0;
                const dateB = b.due_at ? new Date(b.due_at).getTime() : 0;
                return dateA - dateB;
            });
        } catch (error: any) {
            let vindiErrorDetail = error.response?.data;
            if (vindiErrorDetail?.errors) {
                console.error('Detalhes do erro Vindi:', JSON.stringify(vindiErrorDetail.errors, null, 2));
                throw new Error(
                    vindiErrorDetail.errors.map((e: any) => `${e.parameter}: ${e.message}`).join(' | ')
                );
            }
            console.error('Erro ao buscar bills do customer na Vindi:', {
                message: error.message,
                status: error.response?.status,
                responseData: vindiErrorDetail,
                customerId
            });
            throw new Error('Erro ao buscar bills do customer na Vindi.');
        }
    }

    /**
     * Aplica um desconto/reembolso em uma fatura existente na Vindi
     * Cria um novo bill item com o produto de desconto
     * @param billId ID da fatura na Vindi
     * @param valorDesconto Valor do desconto a ser aplicado
     * @param productIdDesconto ID do produto de desconto (padrão: 363879)
     */
    static async aplicarDescontoEmBill(billId: number, valorDesconto: number, productIdDesconto: number = 363879): Promise<any> {
        try {
            // Busca a fatura atual para obter os dados necessários
            const bill = await this.getBillById(billId);
            
            if (!bill) {
                throw new Error(`Fatura ${billId} não encontrada na Vindi`);
            }

            // Verifica se a fatura já está paga ou cancelada
            if (bill.status === 'paid' || bill.status === 'canceled') {
                console.warn(`[AplicarDescontoEmBill] Fatura ${billId} já está ${bill.status}. Não é possível aplicar desconto.`);
                return null;
            }

            // Cria um novo bill com o desconto usando o produto de desconto
            const billDesconto = await this.createBill({
                customer_id: Number(bill.customer?.id || bill.customer_id),
                payment_method_code: bill.payment_method?.code || 'credit_card',
                payment_profile_id: bill.payment_profile?.id,
                bill_items: [
                    {
                        product_id: productIdDesconto,
                        amount: valorDesconto
                    }
                ]
            });

            console.log(`[AplicarDescontoEmBill] Desconto de R$ ${valorDesconto.toFixed(2)} aplicado na fatura ${billId}. Novo bill criado: ${billDesconto?.id}`);
            
            return billDesconto;
        } catch (error: any) {
            let vindiErrorDetail = error.response?.data;
            if (vindiErrorDetail?.errors) {
                console.error('Detalhes do erro Vindi:', JSON.stringify(vindiErrorDetail.errors, null, 2));
                throw new Error(
                    vindiErrorDetail.errors.map((e: any) => `${e.parameter}: ${e.message}`).join(' | ')
                );
            }
            console.error('Erro ao aplicar desconto na fatura na Vindi:', {
                message: error.message,
                status: error.response?.status,
                responseData: vindiErrorDetail,
                billId,
                valorDesconto
            });
            throw new Error('Erro ao aplicar desconto na fatura na Vindi.');
        }
    }

    /**
     * Atualiza um cliente existente na Vindi.
     * @param customerId ID do cliente na Vindi
     * @param data Dados a serem atualizados
     */
    static async updateCustomer(customerId: string, data: Partial<CustomerInput>): Promise<any> {
        const payload: any = {};

        if (data.name !== undefined) payload.name = data.name;
        if (data.email !== undefined) payload.email = data.email;
        if (data.registry_code !== undefined) payload.registry_code = data.registry_code;

        if (data.address) {
            payload.address = {
                street: data.address.street,
                number: data.address.number,
                additional_details: data.address.additional_details,
                zipcode: data.address.zipcode,
                neighborhood: data.address.neighborhood,
                city: data.address.city,
                state: data.address.state,
                country: 'BR',
            };
        }
        if (data.telefone) {
            const numero = data.telefone.replace(/\D/g, '');
            if (numero) {
                payload.phones = [
                    {
                        phone_type: 'mobile',
                        number: numero,
                        extension: ''
                    }
                ];
            }
        }

        try {
            const response = await API.put(`customers/${customerId}`, payload);
            return response.data.customer;
        } catch (error: any) {
            let vindiErrorDetail = error.response?.data;
            if (vindiErrorDetail?.errors) {
                console.error('Detalhes do erro Vindi:', JSON.stringify(vindiErrorDetail.errors, null, 2));
                throw new Error(
                    vindiErrorDetail.errors.map((e: any) => `${e.parameter}: ${e.message}`).join(' | ')
                );
            }
            console.error('Erro ao atualizar cliente na Vindi:', {
                message: error.message,
                status: error.response?.status,
                responseData: vindiErrorDetail,
                customerId,
                payloadEnviado: payload
            });
            throw new Error('Erro ao atualizar cliente na Vindi.');
        }
    }

    /**
     * Deleta um cliente na Vindi pelo ID.
     * @param customerId ID do cliente na Vindi
     */
    static async deleteCustomer(customerId: string): Promise<void> {
        try {
            await API.delete(`customers/${customerId}`);
        } catch (error: any) {
            let vindiErrorDetail = error.response?.data;
            if (vindiErrorDetail?.errors) {
                console.error('Detalhes do erro Vindi:', JSON.stringify(vindiErrorDetail.errors, null, 2));
                throw new Error(
                    vindiErrorDetail.errors.map((e: any) => `${e.parameter}: ${e.message}`).join(' | ')
                );
            }
            console.error('Erro ao deletar cliente na Vindi:', {
                message: error.message,
                status: error.response?.status,
                responseData: vindiErrorDetail,
                customerId
            });
            throw new Error('Erro ao deletar cliente na Vindi.');
        }
    }

    /**
     * Cria uma assinatura de plano recebendo os dados via token JWT do frontend.
     * O token deve conter: customer_id, plan_id, payment_method_code, product_items, installments, start_at, metadata.
     */
    static async createSubscriptionFromToken(token: string): Promise<any> {
        console.log('Criando assinatura a partir do token:', token);

        // Validação extra: verifica se o token tem formato JWT
        if (!token || typeof token !== 'string' || token.split('.').length !== 3) {
            console.error('Token recebido não está no formato JWT:', token);
            throw new Error('Token recebido não está no formato JWT. Verifique o envio do frontend.');
        }

        try {
            // Decodifica o token JWT (não verifica assinatura, apenas decodifica)
            const decoded: any = jwt.decode(token);
            console.log('Conteúdo decodificado do token:', decoded);
            if (!decoded) throw new Error('Token inválido ou não decodificável.');

            // Valida campos obrigatórios
            if (!decoded.customer_id || !decoded.plan_id || !decoded.payment_method_code || !decoded.product_items) {
                throw new Error('Dados obrigatórios ausentes no token.');
            }

            // Chama o método padrão de criação de assinatura
            return await this.createSubscription({
                customer_id: decoded.customer_id,
                plan_id: decoded.plan_id,
                payment_method_code: decoded.payment_method_code,
                product_items: decoded.product_items,
                installments: decoded.installments,
                start_at: decoded.start_at,
                metadata: decoded.metadata
            });
        } catch (error: any) {
            console.error('Erro ao criar assinatura via token:', error);
            throw new Error('Erro ao criar assinatura via token: ' + error.message);
        }
    }

    /**
     * Cria uma cobrança (charge) via cartão usando gateway_token.
     * @param params Dados necessários para criar a cobrança
     */
    static async createChargeCard(params: {
        customer_id: string | number;
        payment_method_code: string;
        payment_company_code: string;
        gateway_token: string;
        amount: number;
    }): Promise<any> {
        try {
            const payload = {
                charge: {
                    customer_id: params.customer_id,
                    payment_method_code: params.payment_method_code,
                    payment_company_code: params.payment_company_code,
                    payment_profile: {
                        gateway_token: params.gateway_token,
                    },
                    billing: { amount: params.amount }
                }
            };
            const response = await API.post('charges', payload);
            return response.data.charge;
        } catch (error: any) {
            let vindiErrorDetail = error.response?.data;
            if (vindiErrorDetail?.errors) {
                console.error('Detalhes do erro Vindi:', JSON.stringify(vindiErrorDetail.errors, null, 2));
                throw new Error(
                    vindiErrorDetail.errors.map((e: any) => `${e.parameter}: ${e.message}`).join(' | ')
                );
            }
            console.error('Erro ao criar charge via cartão na Vindi:', {
                message: error.message,
                status: error.response?.status,
                responseData: vindiErrorDetail,
                payloadEnviado: params
            });
            throw new Error('Erro ao criar charge via cartão na Vindi.');
        }
    }


    static async createCustomerIfNotExists(user: any): Promise<any[]> {
        if (user.vindiCustomerId) return user.vindiCustomerId;

        // Converte telefone para formato E.164 (Brasil)
        let telefoneE164 = "";
        if (user.telefone) {
            let numero = user.telefone.replace(/\D/g, '');
            // Adiciona o prefixo do Brasil se não estiver presente
            if (numero.length === 11) {
                telefoneE164 = `55${numero}`;
            } else if (numero.length === 13 && numero.startsWith('55')) {
                telefoneE164 = numero;
            } else {
                // fallback: retorna o número sem formatação
                telefoneE164 = numero;
            }
        }

        const payload = {
            name: user.nome || user.name,
            email: user.email,
            registry_code: user.cpf || user.registry_code,
            code: String(user.id || user.Id),
            notes: "",
            metadata: {},
            address: user.address
                ? {
                    street: user.address.Rua || user.address.street,
                    number: user.address.Numero || user.address.number,
                    additional_details: user.address.Complemento || user.address.additional_details || "",
                    zipcode: user.address.Cep || user.address.zipcode,
                    neighborhood: user.address.Bairro || user.address.neighborhood,
                    city: user.address.Cidade || user.address.city,
                    state: user.address.Estado || user.address.state,
                    country: user.address.country || "BR"
                }
                : undefined,
            phones: telefoneE164
                ? [{
                    phone_type: "mobile",
                    number: telefoneE164,
                }]
                : []
        };

        try {
            const response = await API.post('customers', payload);
            return response.data.customer;
        } catch (error: any) {
            let vindiErrorDetail = error.response?.data;
            // Se o erro for "code: já está em uso", busca o cliente existente e retorna
            if (vindiErrorDetail?.errors) {
                const codeError = vindiErrorDetail.errors.find((e: any) =>
                    e.parameter === "code" && e.message.includes("já está em uso")
                );
                if (codeError) {
                    // Busca o cliente pelo código (user.id ou user.Id)
                    const code = String(user.id || user.Id);
                    try {
                        const existing = await API.get(`customers?query=${code}`);
                        // Retorna o primeiro cliente encontrado
                        if (existing.data.customers && existing.data.customers.length > 0) {
                            return existing.data.customers[0].id;
                        }
                    } catch (findErr) {
                        console.error('Erro ao buscar cliente existente na Vindi:', findErr);
                    }
                }
                // ...existing error handling...
                throw new Error(
                    vindiErrorDetail.errors.map((e: any) => `${e.parameter}: ${e.message}`).join(' | ')
                );
            }
            // ...existing error handling...
            throw new Error('Erro ao criar cliente na Vindi.');
        }
    }

    /**
     * Cria um perfil de pagamento usando gateway_token e payment_company_code.
     * @param params { gateway_token, payment_company_code }
     */
    static async createPaymentProfileFromToken(params: CreatePaymentProfileFromTokenParams): Promise<any> {
        try {
            const payload = {
                gateway_token: params.gateway_token,
                payment_method_code: "credit_card",
                payment_company_code: params.payment_company_code,
                customer_id: params.customer_id // <-- Adicionado aqui
            };
            const response = await API.post("payment_profiles", payload);
            return response.data.payment_profile;
        } catch (error: any) {
            let vindiErrorDetail = error.response?.data;
            if (vindiErrorDetail?.errors) {
                console.error('Detalhes do erro Vindi:', JSON.stringify(vindiErrorDetail.errors, null, 2));
                throw new Error(
                    vindiErrorDetail.errors.map((e: any) => `${e.parameter}: ${e.message}`).join(' | ')
                );
            }
            console.error('Erro ao criar payment_profile via token na Vindi:', {
                message: error.message,
                status: error.response?.status,
                responseData: vindiErrorDetail,
                payloadEnviado: params
            });
            throw new Error('Erro ao criar payment_profile via token na Vindi.');
        }
    }

    /**
     * Busca uma subscription pelo ID.
     * @param subscriptionId ID da subscription na Vindi
     */
    static async getSubscriptionById(subscriptionId: string): Promise<any> {
        try {
            const response = await API.get(`subscriptions/${subscriptionId}`);
            return response.data.subscription;
        } catch (error: any) {
            let vindiErrorDetail = error.response?.data;
            if (vindiErrorDetail?.errors) {
                console.error('Detalhes do erro Vindi:', JSON.stringify(vindiErrorDetail.errors, null, 2));
                throw new Error(
                    vindiErrorDetail.errors.map((e: any) => `${e.parameter}: ${e.message}`).join(' | ')
                );
            }
            console.error('Erro ao buscar subscription na Vindi:', {
                message: error.message,
                status: error.response?.status,
                responseData: vindiErrorDetail,
                subscriptionId
            });
            throw new Error('Erro ao buscar subscription na Vindi.');
        }
    }

    /**
     * Atualiza o payment_profile de uma subscription (renovação de cartão).
     * @param subscriptionId ID da subscription na Vindi
     * @param paymentProfileId ID do novo payment_profile
     */
    static async updateSubscriptionPaymentProfile(
        subscriptionId: string,
        paymentProfileId: number
    ): Promise<any> {
        try {
            const payload = {
                payment_profile_id: paymentProfileId
            };
            const response = await API.put(`subscriptions/${subscriptionId}`, payload);
            return response.data.subscription;
        } catch (error: any) {
            let vindiErrorDetail = error.response?.data;
            if (vindiErrorDetail?.errors) {
                console.error('Detalhes do erro Vindi:', JSON.stringify(vindiErrorDetail.errors, null, 2));
                throw new Error(
                    vindiErrorDetail.errors.map((e: any) => `${e.parameter}: ${e.message}`).join(' | ')
                );
            }
            console.error('Erro ao atualizar payment_profile da subscription na Vindi:', {
                message: error.message,
                status: error.response?.status,
                responseData: vindiErrorDetail,
                subscriptionId,
                paymentProfileId
            });
            throw new Error('Erro ao atualizar payment_profile da subscription na Vindi.');
        }
    }
}