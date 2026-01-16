import prisma from "../prisma/client";
import { Request, Response } from "express";
import { VindiService } from "../services/vindi.service";
import { EmailService } from "../services/email.service";
import { NotificationService } from "../services/notification.service";
import { WebSocketNotificationService } from "../services/websocketNotification.service";
import { CompraPlanoPayload, CompraPlanoResponse } from "../types/compraPlano.types";
import { ICompraPlanoService } from "../interfaces/compraPlano.interface";
import { Prisma, TipoFatura, ControleFinanceiroStatus, PlanoCompraStatus, ControleConsultaMensalStatus, FaturaStatus } from "../generated/prisma/client";
import { CicloPlanoService } from "./cicloPlano.service";
import { formatVindiErrorMessage, extractVindiErrorDetails } from "../utils/vindiErrorFormatter";
import { calcularMultaProporcional } from "../utils/calcularMultaProporcional";
import { calcularVencimentoPorCiclo, validarCicloPlano } from "../utils/calcularVencimentoCiclo.util";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

// Types
type UserWithAddress = Prisma.UserGetPayload<{
    include: { Address: true }
}>;

type AssinaturaPlanoWithPlano = Prisma.AssinaturaPlanoGetPayload<{
    include: { PlanoAssinatura: true }
}>;

type VindiBill = {
    id: number | string;
    amount?: number | string;
    status?: string;
    pix?: {
        qr_code?: string;
        qr_code_text?: string;
    } | null;
    created_at?: string | Date | null;
    [key: string]: unknown;
};

type NovoPlanoParaTroca = {
    Id: string;
    VindiPlanId: string | null;
    ProductId: string | null;
    Preco: number;
    Duracao?: number;
};

type UserParaTroca = {
    PaymentToken?: string | null;
    [key: string]: unknown;
};

type VindiBillData = {
    customer_id: number;
    payment_method_code?: string;
    payment_profile_id?: number | string;
    bill_items: Array<{
        product_id: number;
        amount: number;
    }>;
};

type VindiAddress = {
    street: string;
    number: string;
    additional_details?: string;
    zipcode: string;
    neighborhood: string;
    city: string;
    state: string;
    country: string;
};

type VindiPhone = {
    phone_type: string;
    number: string;
};

type EnderecoNormalizado = {
    Rua: string;
    Numero: string;
    Complemento: string;
    Cep: string;
    Bairro: string;
    Cidade: string;
    Estado: string;
};

type EnderecoInput = {
    Rua?: string;
    Numero?: string | null;
    Complemento?: string | null;
    Cep?: string;
    Bairro?: string;
    Cidade?: string;
    Estado?: string;
};

type EnderecoInputArray = EnderecoInput[];

const emailService = new EmailService();
const cicloPlanoService = new CicloPlanoService();
const notificationService = new NotificationService(new WebSocketNotificationService());

export class CompraPlanoService implements ICompraPlanoService {
    async comprarPlano(data: CompraPlanoPayload, skipPlanoAtivoValidation: boolean = false): Promise<CompraPlanoResponse> {
        try {
            const [user, planoAtivo, plano] = await Promise.all([
                this.buscarUsuario(data.userId),
                this.buscarPlanoAtivo(data.userId),
                this.buscarPlano(data.plano?.Id ?? "")
            ]);

            const erroUsuario = this.validarUsuario(user);
            if (erroUsuario) {
                return { message: erroUsuario };
            }

            // Pula validação de plano ativo para upgrade/downgrade
            if (!skipPlanoAtivoValidation) {
                const erroAssinatura = this.validarPlanoAtivo(planoAtivo);
                if (erroAssinatura) {
                    return { message: erroAssinatura };
                }
            }

            const erroPlano = this.validarPlano(plano);
            if (erroPlano) {
                console.error('Erro de plano:', erroPlano);
                return { message: erroPlano };
            }

            if (!user) {
                return { message: 'Usuário não encontrado' };
            }

            const endereco = this.normalizarEndereco(user.Address);

            let vindiCustomerId = await this.sincronizarCustomerVindi(user, endereco);

            let paymentProfileResp;
            let payment_profile_id: string | number | undefined;
            let gatewayToken: string | undefined;
            let paymentCompanyCode: string | undefined;

            // Se o payload já tem paymentProfileId (downgrade/upgrade), usa ele diretamente
            if (data.paymentProfileId) {
                console.log('✅ Usando PaymentProfileId já cadastrado:', data.paymentProfileId);
                payment_profile_id = data.paymentProfileId;
                // Ainda precisa dos tokens para atualizar o usuário depois
                gatewayToken = data.tokenObj?.gateway_token || user.PaymentToken || "";
                paymentCompanyCode = data.companyInfo?.payment_company_code || "";
            } else {
                // Caso contrário, cria novo payment profile usando o token
                gatewayToken = data.tokenObj?.gateway_token;
                paymentCompanyCode = data.companyInfo?.payment_company_code;

                // Garante que o customer_id é uma string válida
                if (!vindiCustomerId || typeof vindiCustomerId !== 'string' || vindiCustomerId.trim() === '') {
                    console.error('customer_id ausente ou inválido para perfil de pagamento:', vindiCustomerId);
                    return { message: 'customer_id ausente ou inválido para perfil de pagamento', assinaturaPlano: null };
                }

                // Valida se o token e payment_company_code estão presentes e são válidos
                if (!gatewayToken || typeof gatewayToken !== 'string' || gatewayToken.trim() === '') {
                    console.error('gateway_token ausente ou inválido:', { gatewayToken, tokenObj: data.tokenObj });
                    return { message: 'Token de pagamento ausente ou inválido. Por favor, verifique os dados do cartão e tente novamente.', assinaturaPlano: null };
                }

                if (!paymentCompanyCode || typeof paymentCompanyCode !== 'string' || paymentCompanyCode.trim() === '') {
                    console.error('payment_company_code ausente ou inválido:', { paymentCompanyCode, companyInfo: data.companyInfo });
                    return { message: 'Código da operadora do cartão ausente ou inválido. Por favor, verifique os dados do cartão e tente novamente.', assinaturaPlano: null };
                }

                if (gatewayToken && paymentCompanyCode) {
                    try {
                        paymentProfileResp = await VindiService.createPaymentProfileFromToken({
                            gateway_token: gatewayToken,
                            payment_company_code: paymentCompanyCode,
                            customer_id: String(vindiCustomerId)
                        });

                        // A resposta da Vindi já retorna o payment_profile diretamente
                        // Aceita tanto paymentProfileResp.payment_profile.id quanto paymentProfileResp.id
                        payment_profile_id =
                            paymentProfileResp?.payment_profile?.id ??
                            paymentProfileResp?.id;

                        if (!payment_profile_id) {
                            console.error('Perfil de pagamento não foi criado corretamente. Resposta completa:', JSON.stringify(paymentProfileResp, null, 2));
                            return { message: 'Falha ao criar perfil de pagamento na Vindi. O token pode estar inválido ou expirado. Por favor, verifique os dados do cartão e tente novamente.', assinaturaPlano: null };
                        }

                        console.log('✅ Payment Profile criado com sucesso:', { paymentProfileId: payment_profile_id, paymentProfileResp });
                    } catch (err: unknown) {
                        // Log detalhado do erro vindo da Vindi
                        console.error('Erro ao criar perfil de pagamento:', err);
                        const errorDetails = extractVindiErrorDetails(err);
                        const errorMessage = formatVindiErrorMessage(
                            'Falha ao criar perfil de pagamento na Vindi',
                            errorDetails,
                            'plano'
                        );
                        return { message: errorMessage, assinaturaPlano: null };
                    }
                } else {
                    console.error('gateway_token ou payment_company_code ausentes ou undefined:', { gatewayToken, paymentCompanyCode });
                    return { message: 'Dados de perfil de pagamento ausentes ou inválidos no payload', assinaturaPlano: null };
                }
            }

            if (!payment_profile_id) {
                console.error('payment_profile_id não encontrado:', { paymentProfileId: data.paymentProfileId, paymentProfileResp });
                return { message: 'Erro ao obter ID do perfil de pagamento. Por favor, tente novamente.', assinaturaPlano: null };
            }

            const erroVindiCustomerId = !vindiCustomerId ? "Usuário não possui customerId Vindi cadastrado." : null;
            if (erroVindiCustomerId) {
                console.error('Erro VindiCustomerId:', erroVindiCustomerId);
                return { message: erroVindiCustomerId, assinaturaPlano: null };
            }

            let subsResp;
            try {
                // Valida se os IDs necessários estão presentes
                if (!data.plano?.VindiPlanId || !data.plano?.ProductId) {
                    console.error('IDs do plano ausentes:', { VindiPlanId: data.plano?.VindiPlanId, ProductId: data.plano?.ProductId });
                    return { message: 'Dados do plano incompletos. Por favor, tente novamente.', assinaturaPlano: null };
                }

                const subscriptionPayload = {
                    plan_id: data.plano.VindiPlanId,
                    customer_id: vindiCustomerId,
                    payment_method_code: "credit_card",
                    payment_profile_id: String(payment_profile_id),
                    product_items: [
                        { product_id: data.plano.ProductId }
                    ]
                };
                subsResp = await this.criarSubscription(subscriptionPayload);

                if (!subsResp || !subsResp.id) {
                    console.error('Assinatura não foi criada corretamente na Vindi:', subsResp);
                    return { message: 'Falha ao criar assinatura na Vindi', assinaturaPlano: null };
                }
            } catch (err) {
                console.error('Erro ao criar assinatura na Vindi:', err);
                const errorDetails = extractVindiErrorDetails(err as Error);
                const errorMessage = formatVindiErrorMessage(
                    'Falha ao criar assinatura na Vindi',
                    errorDetails,
                    'plano'
                );
                return { message: errorMessage, assinaturaPlano: null };
            }
            const subscriptionId = subsResp.id;

            // OTIMIZAÇÃO: Atualiza usuário imediatamente após criar subscription
            try {
                // Garante que gatewayToken está definido (usa fallback se necessário)
                const tokenParaSalvar = gatewayToken || user.PaymentToken || "";

                await prisma.user.update({
                    where: { Id: data.userId },
                    data: {
                        VindiCustomerId: String(vindiCustomerId),
                        PaymentToken: String(tokenParaSalvar), // Usa o gatewayToken ou fallback
                        PaymentProfileId: String(payment_profile_id),
                        SubscriptionId: String(subscriptionId)
                    }
                });
            } catch (err) {
                console.error('Erro ao atualizar usuário no banco:', err);
                throw err;
            }

            // Usa fuso horário de Brasília para a data atual
            const dataAtual = dayjs().tz('America/Sao_Paulo').startOf('day').toDate();

            // Data de vencimento do plano (DataFim) - baseada na duração total do plano
            let dataFimPlano: Date;
            const duracaoPlano = plano?.Duracao ?? 30; // Default de 30 dias se não houver duração
            dataFimPlano = dayjs().tz('America/Sao_Paulo').add(duracaoPlano, 'day').endOf('day').toDate();

            // Calcula vencimento usando CicloPlano
            // REGRA: DataVencimento = CicloInicio + 1 mês (mantém mesmo dia do mês)
            const resultadoVencimento = calcularVencimentoPorCiclo({
                cicloInicio: dataAtual,
                cicloFim: undefined, // Será calculado automaticamente (30 dias)
            });

            if (!resultadoVencimento.isValido) {
                const erro = resultadoVencimento.erros.join('; ');
                console.error('Erro ao calcular vencimento:', erro);
                throw new Error(`Erro ao calcular vencimento do plano: ${erro}`);
            }

            const dataVencimentoParcela = resultadoVencimento.dataVencimento;

            let assinaturaPlano;
            try {
                // Cria assinatura com VindiSubscriptionId (permanece fixo)
                // DataFim baseada na duração total do plano
                assinaturaPlano = await this.criarAssinaturaPlano(
                    data.userId,
                    data.plano?.Id ?? "",
                    dataAtual,
                    String(subscriptionId), // VindiSubscriptionId
                    duracaoPlano // Duração do plano em dias
                );
            } catch (err) {
                console.error('Erro ao criar assinaturaPlano:', err);
                throw err;
            }

            console.log('Criando ciclo, financeiro, fatura e controle consulta mensal...');
            try {
                // Valida as datas do ciclo
                const validacaoCiclo = validarCicloPlano(
                    resultadoVencimento.cicloInicio,
                    resultadoVencimento.cicloFim
                );

                if (!validacaoCiclo.isValido) {
                    const erro = validacaoCiclo.erros.join('; ');
                    console.error('Ciclo inválido:', erro);
                    throw new Error(`Ciclo inválido: ${erro}`);
                }

                if (validacaoCiclo.avisos.length > 0) {
                    console.warn('Avisos de ciclo:', validacaoCiclo.avisos.join('; '));
                }

                console.log('[CompraPlano] Criando primeiro ciclo:', {
                    assinaturaPlanoId: assinaturaPlano.Id,
                    userId: data.userId,
                    cicloInicio: resultadoVencimento.cicloInicio,
                    cicloFim: resultadoVencimento.cicloFim,
                    dataVencimento: resultadoVencimento.dataVencimento,
                    diasParaVencer: resultadoVencimento.diasParaVencer
                });

                // OTIMIZAÇÃO: Cria ciclo e fatura em paralelo (não dependem um do outro)
                const [primeiroCiclo, fatura] = await Promise.all([
                    cicloPlanoService.criarCiclo({
                        assinaturaPlanoId: assinaturaPlano.Id,
                        userId: data.userId,
                        cicloInicio: resultadoVencimento.cicloInicio,
                        cicloFim: resultadoVencimento.cicloFim,
                        consultasDisponiveis: 4,
                        status: "Pendente" // Status inicial: Pendente (será ativado após pagamento)
                    }),
                    this.criarFatura(
                        data?.plano?.Preco ?? 0,
                        vindiCustomerId ?? "",
                        data.userId,
                        undefined,
                        resultadoVencimento.dataVencimento // Data de vencimento baseada em CicloInicio
                    )
                ]);

                console.log('[CompraPlano] Ciclo e fatura criados com sucesso:', {
                    cicloId: primeiroCiclo.Id,
                    cicloInicio: primeiroCiclo.CicloInicio,
                    cicloFim: primeiroCiclo.CicloFim,
                    faturaId: fatura.Id,
                    dataVencimento: resultadoVencimento.dataVencimento.toISOString()
                });

                // 3) Cria o financeiro vinculando ao ciclo e fatura (depende dos dois)
                // IMPORTANTE: Financeiro.DataVencimento = data de vencimento baseada em CicloInicio
                await this.criarFinanceiro(
                    data.userId,
                    data.plano?.Id ?? "",
                    data?.plano?.Preco ?? 0,
                    resultadoVencimento.dataVencimento, // Data de vencimento baseada em CicloInicio
                    fatura.Id,
                    TipoFatura.Plano,
                    primeiroCiclo.Id // CicloPlanoId
                );

                console.log('Ciclo, fatura, financeiro e controle consulta mensal criados');
            } catch (err) {
                console.error('Erro ao criar ciclo/financeiro/fatura/controle consulta mensal:', err);
                throw err;
            }

            console.log('Processo de compra de plano finalizado com sucesso');
            return {
                message: "Plano em processamento! Você receberá uma notificação quando estiver ativado. Isso geralmente leva de 2 a 5 segundos.",
                assinaturaPlano,
                pendingActivation: true,  // Flag para UI saber que ainda está pendente
                status: "AguardandoPagamento"
            };

        } catch (error) {
            console.error('Erro ao processar compra do plano:', error);
            const errorDetails = extractVindiErrorDetails(error as Error);
            const errorMessage = formatVindiErrorMessage(
                "Erro ao processar compra do plano",
                errorDetails,
                'plano'
            );
            return { message: errorMessage, assinaturaPlano: null };
        }
    }

    // --- Métodos privados de validação e busca ---
    private async buscarUsuario(userId: string): Promise<UserWithAddress | null> {
        const result = await prisma.user.findUnique({
            where: { Id: userId.toString() },
            include: { Address: true }
        });
        return result;
    }

    private validarUsuario(user: UserWithAddress | null): string | null {
        const result = !user ? "Usuário não encontrado" : null;
        return result;
    }

    private async buscarPlanoAtivo(userId: string): Promise<AssinaturaPlanoWithPlano | null> {
        const result = await prisma.assinaturaPlano.findFirst({
            where: {
                UserId: userId.toString(),
                Status: { in: [PlanoCompraStatus.Ativo, PlanoCompraStatus.AguardandoPagamento] }
            },
            include: { PlanoAssinatura: true }
        });
        return result;
    }

    private validarPlanoAtivo(planoAtivo: AssinaturaPlanoWithPlano | null): string | null {
        const result = planoAtivo ? "Você já possui um plano ativo. Acesse a área de planos ou entre em contato com o suporte." : null;
        return result;
    }

    private async buscarPlano(planoId: string): Promise<{
        Id: string;
        Nome: string;
        Descricao: Prisma.JsonValue;
        Status: string;
        CreatedAt: Date;
        UpdatedAt: Date;
        VindiPlanId: string | null;
        ProductId: string | null;
        Preco: number;
        Duracao: number;
        Tipo: string;
        Destaque: boolean | null;
        AdminId: string | null;
    } | null> {
        if (!planoId) {
            return null;
        }
        const result = await prisma.planoAssinatura.findUnique({
            where: { Id: planoId },
            select: {
                Id: true,
                Nome: true,
                Descricao: true,
                Status: true,
                CreatedAt: true,
                UpdatedAt: true,
                VindiPlanId: true,
                ProductId: true,
                Preco: true,
                Duracao: true,
                Tipo: true,
                Destaque: true,
                AdminId: true
            }
        });
        return result;
    }

    private validarPlano(plano: {
        Id: string;
        Nome: string;
        Descricao: Prisma.JsonValue;
        Status: string;
        CreatedAt: Date;
        UpdatedAt: Date;
        VindiPlanId: string | null;
        ProductId: string | null;
        Preco: number;
        Duracao: number;
        Tipo: string;
        Destaque: boolean | null;
        AdminId: string | null;
    } | null): string | null {
        const result = (!plano || plano.Status !== "ativo") ? "Plano não encontrado ou inativo" : null;
        return result;
    }

    private async criarAssinaturaPlano(
        userId: string,
        planoId: string,
        dataAtual: Date,
        vindiSubscriptionId: string,
        duracaoPlano: number = 30, // Duração do plano em dias (default: 30 dias)
        status: PlanoCompraStatus = PlanoCompraStatus.AguardandoPagamento // Status da assinatura
    ): Promise<Prisma.AssinaturaPlanoGetPayload<{}>> {
        // Usa fuso horário de Brasília para calcular as datas
        // Garante que DataInicio está no fuso horário de Brasília (início do dia)
        const dataInicioBr = dayjs(dataAtual).tz('America/Sao_Paulo').startOf('day').toDate();

        // Calcula DataFim baseada na duração do plano no fuso horário de Brasília (fim do dia)
        const dataFim = dayjs(dataInicioBr).tz('America/Sao_Paulo').add(duracaoPlano, 'day').endOf('day').toDate();

        const result = await prisma.assinaturaPlano.create({
            data: {
                UserId: userId.toString(),
                PlanoAssinaturaId: planoId, // <-- planoId nunca deve ser undefined
                DataInicio: dataInicioBr, // Data no fuso horário de Brasília
                DataFim: dataFim, // Calculado baseado na duração do plano no fuso horário de Brasília
                Status: status,
                VindiSubscriptionId: vindiSubscriptionId, // Permanece fixo
            },
        });

        console.log(`[criarAssinaturaPlano] Assinatura criada com DataFim calculada (timezone Brasília):`, {
            userId,
            planoId,
            dataInicio: dataInicioBr,
            dataFim: dataFim,
            duracaoPlano: duracaoPlano,
            status: status,
            timezone: 'America/Sao_Paulo'
        });

        // ✅ Agenda delayed job de expiração quando DataFim é atingida (zero polling)
        try {
            const { schedulePlanSubscriptionExpiration } = await import('../utils/scheduleDelayedJobs');
            await schedulePlanSubscriptionExpiration(result.Id, dataFim);
            console.log(`✅ [criarAssinaturaPlano] Job de expiração agendado para assinatura ${result.Id} em ${dataFim}`);
        } catch (error) {
            console.error(`❌ [criarAssinaturaPlano] Erro ao agendar expiração para assinatura ${result.Id}:`, error);
            // Não falha a criação da assinatura se o agendamento falhar
        }

        return result;
    }

    private async criarFinanceiro(
        userId: string,
        planoId: string,
        valor: number | string,
        dataExpiracao: Date,
        faturaId?: string | null,
        tipo: TipoFatura = TipoFatura.Plano,
        cicloPlanoId?: string | null
    ): Promise<Prisma.FinanceiroGetPayload<{}>> {
        // Normaliza o valor para number (Float) porque o Prisma espera Float
        let valorFloat = typeof valor === 'string' ? parseFloat(valor.replace(',', '.')) : valor;
        if (typeof valorFloat !== 'number' || isNaN(valorFloat)) {
            valorFloat = 0;
        }

        // IMPORTANTE: Verifica se já existe um Financeiro para esta FaturaId antes de criar
        // Isso evita duplicação quando o webhook e o serviço tentam criar simultaneamente
        if (faturaId) {
            const financeiroExistente = await prisma.financeiro.findUnique({
                where: { FaturaId: faturaId }
            });

            if (financeiroExistente) {
                console.log(`[criarFinanceiro] Financeiro já existe para FaturaId ${faturaId}. Retornando existente.`, { financeiroId: financeiroExistente.Id });
                return financeiroExistente;
            }
        }

        // Se CicloPlanoId existe (novo financeiro de compra), usa UPSERT para evitar duplicação
        // Isso garante que mesmo que o webhook chegue antes, só terá 1 financeiro
        if (cicloPlanoId) {
            try {
                const result = await prisma.financeiro.upsert({
                    where: {
                        CicloPlanoId: cicloPlanoId // Chave de deduplicação primária
                    },
                    update: {
                        // Se já existe, apenas atualiza o FaturaId se foi informado
                        FaturaId: faturaId ? faturaId.toString() : undefined,
                        DataVencimento: dataExpiracao
                    },
                    create: {
                        UserId: userId.toString(),
                        PlanoAssinaturaId: planoId,
                        CicloPlanoId: cicloPlanoId,
                        Valor: valorFloat,
                        DataVencimento: dataExpiracao,
                        Status: ControleFinanceiroStatus.AguardandoPagamento,
                        Tipo: tipo,
                        FaturaId: faturaId ?? null
                    }
                });
                console.log(`[criarFinanceiro] Financeiro criado/atualizado via UPSERT para CicloPlanoId ${cicloPlanoId}:`, { financeiroId: result.Id, faturaId: faturaId ?? 'null' });
                return result;
            } catch (error: unknown) {
                // Se houver erro de constraint, busca o existente
                const err = error as { code?: string; message?: string };
                if (err.code === 'P2002' || err.message?.includes('Unique')) {
                    console.warn(`[criarFinanceiro] Erro de constraint ao fazer upsert. Buscando financeiro existente para CicloPlanoId ${cicloPlanoId}...`);
                    const existente = await prisma.financeiro.findUnique({
                        where: { CicloPlanoId: cicloPlanoId }
                    });
                    if (existente) {
                        // Atualiza FaturaId se foi informado e ainda não estava vinculado
                        if (faturaId && !existente.FaturaId) {
                            const atualizado = await prisma.financeiro.update({
                                where: { Id: existente.Id },
                                data: { FaturaId: faturaId.toString() }
                            });
                            console.log(`[criarFinanceiro] Financeiro existente atualizado com FaturaId:`, { financeiroId: atualizado.Id });
                            return atualizado;
                        }
                        console.log(`[criarFinanceiro] Retornando financeiro existente encontrado:`, { financeiroId: existente.Id });
                        return existente;
                    }
                }
                // Se for outro erro, trata como antes
                throw error;
            }
        }

        // Verificação adicional: mesmo sem FaturaId, verifica se já existe Financeiro recente
        // para evitar duplicação em race conditions
        if (!faturaId && !cicloPlanoId) {
            // Busca por correspondência mais ampla (últimas 24 horas para cobrir casos de renovação)
            const financeiroExistente = await prisma.financeiro.findFirst({
                where: {
                    UserId: userId.toString(),
                    PlanoAssinaturaId: planoId,
                    Tipo: tipo,
                    Valor: valorFloat, // IMPORTANTE: Valor deve ser exatamente igual ao do plano
                    Status: ControleFinanceiroStatus.AguardandoPagamento,
                    FaturaId: null,
                    CicloPlanoId: null, // Garante que não está associado a ciclo (evita duplicação)
                    CreatedAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24 horas
                    }
                },
                orderBy: { CreatedAt: 'desc' }
            });

            if (financeiroExistente) {
                console.log(`[criarFinanceiro] Financeiro recente encontrado sem FaturaId/CicloPlanoId. Retornando existente.`, { financeiroId: financeiroExistente.Id });
                // Se um faturaId foi fornecido depois, atualiza
                if (faturaId && !financeiroExistente.FaturaId) {
                    const atualizado = await prisma.financeiro.update({
                        where: { Id: financeiroExistente.Id },
                        data: { FaturaId: faturaId.toString() }
                    });
                    return atualizado;
                }
                return financeiroExistente;
            }
        }

        // Última verificação de segurança: mesmo com FaturaId, verifica se não há outro Financeiro
        // com mesmo PlanoAssinaturaId, Tipo e Valor criado recentemente (evita duplicação por valor)
        if (faturaId) {
            const financeiroDuplicado = await prisma.financeiro.findFirst({
                where: {
                    UserId: userId.toString(),
                    PlanoAssinaturaId: planoId,
                    Tipo: tipo,
                    Valor: valorFloat, // Garante que o valor é exatamente o do plano
                    Status: ControleFinanceiroStatus.AguardandoPagamento,
                    Id: { not: '' }, // Exclui vazio (busca qualquer)
                    CreatedAt: {
                        gte: new Date(Date.now() - 10 * 60 * 1000) // Últimos 10 minutos
                    }
                },
                orderBy: { CreatedAt: 'desc' }
            });

            if (financeiroDuplicado && financeiroDuplicado.FaturaId !== faturaId.toString()) {
                console.warn(`[criarFinanceiro] ATENÇÃO: Financeiro duplicado encontrado com mesmo valor mas FaturaId diferente.`, {
                    existente: { id: financeiroDuplicado.Id, faturaId: financeiroDuplicado.FaturaId, valor: financeiroDuplicado.Valor },
                    novo: { faturaId, valor: valorFloat }
                });
                // Se o existente não tem FaturaId, atualiza com o novo
                if (!financeiroDuplicado.FaturaId) {
                    const atualizado = await prisma.financeiro.update({
                        where: { Id: financeiroDuplicado.Id },
                        data: { FaturaId: faturaId.toString() }
                    });
                    return atualizado;
                }
                // Se ambos têm FaturaId diferente, retorna o existente (não cria duplicado)
                return financeiroDuplicado;
            }
        }

        // Se não existe, cria novo (apenas para casos sem CicloPlanoId e após todas as verificações)
        const result = await prisma.financeiro.create({
            data: {
                UserId: userId.toString(),
                PlanoAssinaturaId: planoId,
                CicloPlanoId: cicloPlanoId ?? null,
                Valor: valorFloat, // Valor deve ser exatamente o Preco do PlanoAssinatura
                DataVencimento: dataExpiracao,
                Status: ControleFinanceiroStatus.AguardandoPagamento,
                Tipo: tipo,
                FaturaId: faturaId ?? null
            },
        });
        console.log(`[criarFinanceiro] Novo Financeiro criado: ${result.Id} para FaturaId: ${faturaId ?? 'null'}, Valor: ${valorFloat}`);
        return result;
    }

    private async criarFatura(
        preco: number,
        customerId: string,
        userId: string,
        billId?: string,
        dataVencimento?: Date
    ): Promise<Prisma.FaturaGetPayload<{}>> {
        const valorFloat = typeof preco === 'string' ? parseFloat(preco) : preco;

        // IMPORTANTE: Se billId está disponível, verifica se já existe Fatura com esse CodigoFatura
        // Isso evita criar duplicada quando o webhook já processou o evento
        if (billId) {
            const faturaExistente = await prisma.fatura.findUnique({
                where: { CodigoFatura: String(billId) }
            });

            if (faturaExistente) {
                console.log(`[criarFatura] Fatura já existe para CodigoFatura ${billId}. Retornando existente.`, { faturaId: faturaExistente.Id });
                return faturaExistente;
            }
        }

        // Calcula DataVencimento: usa a fornecida ou padrão de 30 dias (mensal)
        const dataVencimentoCalculada = dataVencimento || dayjs().tz('America/Sao_Paulo').add(30, 'day').endOf('day').toDate();

        // Se não existe, cria nova
        const result = await prisma.fatura.create({
            data: {
                Valor: valorFloat,
                Status: 'Pending',
                Tipo: "Plano",
                CustomerId: customerId,
                UserId: userId,
                CodigoFatura: billId ? String(billId) : null,
                DataVencimento: dataVencimentoCalculada // Data de vencimento mensal da parcela
            },
        });
        console.log(`[criarFatura] Nova Fatura criada: ${result.Id} com CodigoFatura: ${billId ?? 'null'}, DataVencimento: ${dataVencimentoCalculada.toISOString()}`);
        return result;
    }

    private async criarSubscription(params: {
        plan_id: string;
        customer_id: string;
        payment_method_code: string;
        payment_profile_id: string;
        product_items: Array<{ product_id: string | number }>;
        start_at?: string; // Data futura para início da assinatura (formato ISO)
    }): Promise<{ id: number | string;[key: string]: unknown }> {

        console.log('Criando assinatura na Vindi com os parâmetros:', params);
        try {
            // Valida se payment_profile_id está presente
            if (!params.payment_profile_id) {
                throw new Error('payment_profile_id é obrigatório para criar assinatura');
            }

            // Valida se product_items está presente e não está vazio
            if (!params.product_items || params.product_items.length === 0) {
                throw new Error('product_items é obrigatório e não pode estar vazio');
            }

            // OTIMIZAÇÃO: Remove tipo any e tipa corretamente
            const subscriptionPayload: {
                plan_id: string;
                customer_id: string;
                payment_method_code: string;
                payment_profile_id: number;
                product_items: Array<{ product_id: number }>;
                start_at?: string;
            } = {
                plan_id: params.plan_id,
                customer_id: params.customer_id,
                payment_method_code: params.payment_method_code,
                payment_profile_id: Number(params.payment_profile_id),
                product_items: params.product_items.map(item => ({
                    product_id: typeof item.product_id === 'string' ? Number(item.product_id) : item.product_id
                }))
            };

            // Adiciona start_at se fornecido (para agendamento futuro)
            if (params.start_at) {
                subscriptionPayload.start_at = params.start_at;
                console.log(`[CriarSubscription] Assinatura será agendada para: ${params.start_at}`);
            }

            const subscriptionResponse = await VindiService.createSubscription(subscriptionPayload);
            return subscriptionResponse;
        } catch (error) {
            console.error('Erro detalhado ao criar assinatura na Vindi:', error);
            const errorDetails = extractVindiErrorDetails(error as Error);
            const errorMessage = formatVindiErrorMessage(
                "Erro ao criar assinatura na Vindi",
                errorDetails,
                'plano'
            );
            throw { status: 500, message: errorMessage };
        }
    }

    async cancelarPlano(
        req: Request,
        res: Response,
        userId: string
    ): Promise<Response> {
        const { assinaturaPlanoId } = req.body;

        try {
            console.log(`[CancelarPlano] Iniciando cancelamento - userId: ${userId}, assinaturaPlanoId: ${assinaturaPlanoId}`);

            // Validação: verifica se assinaturaPlanoId foi fornecido
            if (!assinaturaPlanoId) {
                console.log(`[CancelarPlano] Erro: assinaturaPlanoId não fornecido`);
                return res.status(400).json({
                    success: false,
                    message: "O ID da assinatura do plano é obrigatório para realizar o cancelamento.",
                    code: "ASSINATURA_PLANO_ID_OBRIGATORIO"
                });
            }

            // Validação: verifica se assinaturaPlanoId é uma string válida
            if (typeof assinaturaPlanoId !== 'string' || assinaturaPlanoId.trim() === '') {
                console.log(`[CancelarPlano] Erro: assinaturaPlanoId inválido - tipo: ${typeof assinaturaPlanoId}, valor: ${assinaturaPlanoId}`);
                return res.status(400).json({
                    success: false,
                    message: "O ID da assinatura do plano fornecido é inválido.",
                    code: "ASSINATURA_PLANO_ID_INVALIDO"
                });
            }

            // Busca a assinatura do plano e valida se pertence ao usuário
            // Inclui ciclos para cálculo de multa proporcional e consultas utilizadas
            const assinaturaPlano = await prisma.assinaturaPlano.findUnique({
                where: { Id: assinaturaPlanoId.trim() },
                include: {
                    PlanoAssinatura: true,
                    Ciclos: {
                        select: {
                            Id: true,
                            CicloInicio: true,
                            CicloFim: true,
                            Status: true,
                            ConsultasUsadas: true,
                            ConsultasDisponiveis: true
                        }
                    }
                },
            });

            console.log(`[CancelarPlano] Assinatura encontrada: ${assinaturaPlano ? 'Sim' : 'Não'}, Status: ${assinaturaPlano?.Status}, UserId: ${assinaturaPlano?.UserId}`);

            if (!assinaturaPlano || assinaturaPlano.UserId !== userId.toString()) {
                return res.status(404).json({
                    success: false,
                    message: "Plano não encontrado ou não pertence ao usuário",
                    code: "PLANO_NAO_ENCONTRADO"
                });
            }

            // Validação específica baseada no status do plano
            if (assinaturaPlano.Status !== "Ativo") {
                let message = "";
                let code = "";

                switch (assinaturaPlano.Status) {
                    case "Cancelado":
                        message = "Este plano já foi cancelado anteriormente. Não é possível cancelar um plano que já está cancelado.";
                        code = "PLANO_JA_CANCELADO";
                        break;
                    case "Expirado":
                        message = "Este plano já expirou. Não é possível cancelar um plano expirado.";
                        code = "PLANO_EXPIRADO";
                        break;
                    case "AguardandoPagamento":
                        message = "Este plano está aguardando pagamento. Complete o pagamento ou aguarde a confirmação antes de tentar cancelar.";
                        code = "PLANO_AGUARDANDO_PAGAMENTO";
                        break;
                    default:
                        message = `Este plano está com status "${assinaturaPlano.Status}" e não pode ser cancelado. Apenas planos ativos podem ser cancelados.`;
                        code = "PLANO_STATUS_INVALIDO";
                }

                return res.status(400).json({
                    success: false,
                    message,
                    code,
                    statusAtual: assinaturaPlano.Status
                });
            }

            // Busca o usuário para obter SubscriptionId e outros dados
            const user = await this.buscarUsuario(userId);
            if (!user) {
                return res.status(404).json({ message: "Usuário não encontrado" });
            }

            // Define data de cancelamento antes de usar
            const dataCancelamentoDate = dayjs().tz('America/Sao_Paulo').toDate();

            // Verifica se está dentro do período de arrependimento (7 dias - direito do consumidor)
            const dataInicio = new Date(assinaturaPlano.DataInicio);
            const diffMs = dataCancelamentoDate.getTime() - dataInicio.getTime();
            const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const dentroPeriodoArrependimento = diffDias <= 7;

            console.log(`[CancelarPlano] Período de arrependimento:`, {
                dataInicio: dataInicio.toISOString(),
                dataCancelamento: dataCancelamentoDate.toISOString(),
                diasDesdeInicio: diffDias,
                dentroPeriodo: dentroPeriodoArrependimento
            });

            // Calcula total de consultas utilizadas em todos os ciclos
            const totalConsultasUsadas = assinaturaPlano.Ciclos?.reduce((total, ciclo) => {
                return total + (ciclo.ConsultasUsadas || 0);
            }, 0) || 0;

            console.log(`[CancelarPlano] Total de consultas utilizadas: ${totalConsultasUsadas}`);

            let multaGerada = false;
            let valorMulta = 0;
            let valorReembolso = 0;
            let reembolsoGerado = false;

            // Se está dentro do período de arrependimento (7 dias)
            if (dentroPeriodoArrependimento) {
                if (totalConsultasUsadas > 0) {
                    // Verifica se todas as sessões do mês foram utilizadas e se é final de ciclo
                    const ciclosAtivos = assinaturaPlano.Ciclos?.filter(c => c.Status === 'Ativo') || [];
                    const cicloAtual = ciclosAtivos[0]; // Pega o ciclo atual
                    const todasSessoesUtilizadas = cicloAtual &&
                        cicloAtual.ConsultasUsadas >= 4 &&
                        cicloAtual.ConsultasDisponiveis === 0;
                    const isFinalCiclo = cicloAtual &&
                        new Date(cicloAtual.CicloFim) <= dataCancelamentoDate;

                    // Caso especial: se todas as 4 sessões do mês foram utilizadas e é final de ciclo, não estorna nada
                    if (todasSessoesUtilizadas && isFinalCiclo) {
                        console.log(`[CancelarPlano] Todas as 4 sessões do mês foram utilizadas e é final de ciclo. Não estorna nada.`);
                        // Não gera reembolso neste caso
                    } else {
                        // Houve uso dos serviços: calcula valor proporcional das consultas utilizadas
                        const valorMensalPlano = assinaturaPlano.PlanoAssinatura?.Preco || 0;
                        const tipoPlano = assinaturaPlano.PlanoAssinatura?.Tipo || "";

                        valorReembolso = this.calcularValorConsultasUtilizadas(
                            valorMensalPlano,
                            tipoPlano,
                            totalConsultasUsadas
                        );

                        // Valor do reembolso = valor total pago - valor das consultas utilizadas
                        const valorTotalPago = valorMensalPlano;
                        const valorReembolsoFinal = Math.max(0, valorTotalPago - valorReembolso);

                        console.log(`[CancelarPlano] Dentro de 7 dias com uso:`, {
                            valorTotalPago: valorTotalPago.toFixed(2),
                            valorConsultasUtilizadas: valorReembolso.toFixed(2),
                            valorReembolsoFinal: valorReembolsoFinal.toFixed(2),
                            consultasUsadas: totalConsultasUsadas,
                            todasSessoesUtilizadas,
                            isFinalCiclo
                        });

                        if (valorReembolsoFinal > 0 && user.VindiCustomerId) {
                            // Cria reembolso proporcional e aplica na próxima fatura da Vindi
                            const reembolsoId = await this.criarReembolsoProporcional({
                                userId,
                                vindiCustomerId: user.VindiCustomerId,
                                valorReembolso: valorReembolsoFinal,
                                motivo: `Reembolso proporcional: ${totalConsultasUsadas} consulta(s) utilizada(s) dentro do período de arrependimento`,
                                paymentProfileId: user.PaymentProfileId
                            });

                            if (reembolsoId) {
                                reembolsoGerado = true;
                                console.log(`[CancelarPlano] Reembolso criado: ${reembolsoId}`);
                            }
                        }
                    }
                } else {
                    // Sem uso: reembolso integral
                    const valorMensalPlano = assinaturaPlano.PlanoAssinatura?.Preco || 0;
                    if (valorMensalPlano > 0 && user.VindiCustomerId) {
                        const reembolsoId = await this.criarReembolsoProporcional({
                            userId,
                            vindiCustomerId: user.VindiCustomerId,
                            valorReembolso: valorMensalPlano,
                            motivo: "Reembolso integral: cancelamento dentro de 7 dias sem uso dos serviços",
                            paymentProfileId: user.PaymentProfileId
                        });

                        if (reembolsoId) {
                            reembolsoGerado = true;
                            console.log(`[CancelarPlano] Reembolso integral criado: ${reembolsoId}`);
                        }
                    }
                }

                // Dentro de 7 dias: não aplica multa
                console.log(`[CancelarPlano] Cancelamento dentro do período de arrependimento (7 dias). Sem multa.`);
            } else {
                // Passou 7 dias: calcula multa proporcional conforme regra existente
                const resultadoMulta = calcularMultaProporcional(
                    {
                        DataInicio: assinaturaPlano.DataInicio,
                        PlanoAssinatura: assinaturaPlano.PlanoAssinatura,
                        Ciclos: assinaturaPlano.Ciclos?.map(ciclo => ({
                            CicloInicio: ciclo.CicloInicio,
                            CicloFim: ciclo.CicloFim,
                            Status: ciclo.Status
                        }))
                    },
                    dataCancelamentoDate
                );

                multaGerada = resultadoMulta.deveAplicar;
                valorMulta = resultadoMulta.valorMulta;

                console.log(`[CancelarPlano] Cálculo de multa (após 7 dias):`, {
                    deveAplicar: resultadoMulta.deveAplicar,
                    valorMulta: resultadoMulta.valorMulta,
                    diasFaltantes: resultadoMulta.diasFaltantes,
                    ciclosRestantes: resultadoMulta.ciclosRestantes,
                    motivo: resultadoMulta.motivo
                });

                if (multaGerada && valorMulta > 0) {
                    if (user.VindiCustomerId) {
                        // Usa o product_id fixo para multa: 320985
                        const productIdMulta = "320985";

                        // Gera fatura da multa na Vindi com cobrança automática no cartão cadastrado
                        try {
                            const billData: VindiBillData = {
                                customer_id: Number(user.VindiCustomerId),
                                payment_method_code: "credit_card",
                                bill_items: [
                                    {
                                        product_id: Number(productIdMulta),
                                        amount: valorMulta
                                    }
                                ]
                            };

                            // Adiciona payment_profile_id se o usuário tiver cartão cadastrado
                            if (user.PaymentProfileId) {
                                billData.payment_profile_id = user.PaymentProfileId;
                            }

                            const bill = await VindiService.createBill(billData);

                            // Grava a multa no Financeiro com o PlanoAssinaturaId do plano cancelado
                            if (bill && bill.id) {
                                // Data de vencimento = data de pagamento (data atual)
                                const dataVencimento = new Date();

                                // Cria a Fatura para a multa com tipo correto
                                const faturaMulta = await prisma.fatura.create({
                                    data: {
                                        Valor: valorMulta,
                                        Status: 'Pending',
                                        Tipo: TipoFatura.Multa, // Tipo correto para multa
                                        CustomerId: user.VindiCustomerId ?? "",
                                        UserId: userId,
                                        CodigoFatura: String(bill.id), // Código da fatura da Vindi
                                        DataEmissao: dataVencimento,
                                        DataVencimento: dataVencimento // Data de vencimento = data de pagamento
                                    }
                                });

                                // Cria o Financeiro vinculado à Fatura com tipo Multa explicitamente
                                const financeiroMulta = await prisma.financeiro.create({
                                    data: {
                                        UserId: userId.toString(),
                                        PlanoAssinaturaId: assinaturaPlano.PlanoAssinaturaId, // PlanoAssinaturaId do plano cancelado
                                        Valor: valorMulta,
                                        DataVencimento: dataVencimento, // Data de vencimento = data de pagamento
                                        Status: ControleFinanceiroStatus.AguardandoPagamento,
                                        Tipo: TipoFatura.Multa, // Tipo explícito: Multa
                                        FaturaId: faturaMulta.Id // Vincula à Fatura criada
                                    }
                                });

                                multaGerada = true;
                                console.log(`[CancelarPlano] Multa criada: FaturaId=${faturaMulta.Id}, FinanceiroId=${financeiroMulta.Id}, Tipo=${TipoFatura.Multa}, CodigoFatura=${bill.id}`);
                            }
                        } catch (err) {
                            console.error("Erro ao gerar fatura de multa na Vindi:", err);
                        }
                    } else {
                        console.warn("Usuário não possui VindiCustomerId, não foi possível gerar fatura de multa na Vindi");
                    }
                }
            }

            // Cancela a assinatura na Vindi se houver SubscriptionId
            if (user.SubscriptionId) {
                try {
                    await VindiService.deleteSubscription(user.SubscriptionId);
                    console.log(`Subscription ${user.SubscriptionId} cancelada na Vindi`);
                } catch (err) {
                    console.error("Erro ao cancelar subscription na Vindi:", err);
                    // Continua o processo mesmo se falhar o cancelamento na Vindi
                }
            } else {
                console.warn("Usuário não possui SubscriptionId, não foi possível cancelar na Vindi");
            }

            // Cria entrada no financeiro para o plano cancelado com valor proporcional (apenas se passou 7 dias)
            // dataCancelamentoDate já foi declarado acima
            let financeiroPlanoCancelado = null;

            // Só cria financeiro proporcional se passou 7 dias (fora do período de arrependimento)
            if (!dentroPeriodoArrependimento) {
                const resultadoMulta = calcularMultaProporcional(
                    {
                        DataInicio: assinaturaPlano.DataInicio,
                        PlanoAssinatura: assinaturaPlano.PlanoAssinatura,
                        Ciclos: assinaturaPlano.Ciclos?.map(ciclo => ({
                            CicloInicio: ciclo.CicloInicio,
                            CicloFim: ciclo.CicloFim,
                            Status: ciclo.Status
                        }))
                    },
                    dataCancelamentoDate
                );

                if (resultadoMulta.valorProporcionalRestante > 0) {
                    // Cria entrada no financeiro para o plano cancelado
                    financeiroPlanoCancelado = await prisma.financeiro.create({
                        data: {
                            UserId: userId.toString(),
                            PlanoAssinaturaId: assinaturaPlano.PlanoAssinaturaId,
                            Valor: Math.round(resultadoMulta.valorProporcionalRestante * 100) / 100,
                            DataVencimento: dataCancelamentoDate,
                            Status: ControleFinanceiroStatus.Cancelado,
                            Tipo: TipoFatura.Plano,
                        }
                    });
                    console.log(`[CancelarPlano] Financeiro do plano cancelado criado: Id=${financeiroPlanoCancelado.Id}, Valor=${resultadoMulta.valorProporcionalRestante.toFixed(2)}`);
                }
            }

            // Se passou 7 dias: expira sessões agendadas em 30 dias (garantia legal)
            if (!dentroPeriodoArrependimento) {
                try {
                    // Busca todos os CicloPlano vinculados ao plano cancelado
                    const ciclosDoPlano = await prisma.cicloPlano.findMany({
                        where: {
                            AssinaturaPlanoId: assinaturaPlanoId
                        },
                        select: {
                            Id: true
                        }
                    });

                    const ciclosIds = ciclosDoPlano.map(c => c.Id);

                    if (ciclosIds.length > 0) {
                        // Busca todas as consultas agendadas do paciente vinculadas aos ciclos do plano cancelado
                        const consultasAgendadas = await prisma.consulta.findMany({
                            where: {
                                PacienteId: userId.toString(),
                                CicloPlanoId: {
                                    in: ciclosIds
                                },
                                Status: {
                                    in: ["Agendada", "Reservado"]
                                },
                                Date: {
                                    gte: dataCancelamentoDate // Apenas consultas futuras
                                }
                            },
                            select: {
                                Id: true,
                                Date: true,
                                Time: true
                            }
                        });

                        // Calcula data de expiração (30 dias a partir do cancelamento)
                        const dataExpiracao = dayjs(dataCancelamentoDate).tz('America/Sao_Paulo').add(30, 'days').toDate();

                        // Atualiza consultas agendadas: marca para expirar em 30 dias
                        // Como não há campo DataExpiracao na Consulta, vamos usar uma abordagem alternativa:
                        // 1. Criar um registro de controle de expiração ou
                        // 2. Atualizar o status para indicar que expira em 30 dias
                        // Por enquanto, vamos criar um log e atualizar a Agenda para expirar
                        if (consultasAgendadas.length > 0) {
                            // Busca as Agendas relacionadas para atualizar
                            const consultasIds = consultasAgendadas.map(c => c.Id);

                            const agendas = await prisma.agenda.findMany({
                                where: {
                                    Consultas: {
                                        some: {
                                            Id: {
                                                in: consultasIds
                                            }
                                        }
                                    }
                                },
                                select: {
                                    Id: true
                                }
                            });

                            // ✅ Agenda delayed jobs de expiração para cada consulta (30 dias após cancelamento)
                            // Zero polling - cada consulta tem seu próprio job agendado
                            const { scheduleConsultationExpirationAfterPlanCancellation } = await import('../utils/scheduleDelayedJobs');

                            for (const consulta of consultasAgendadas) {
                                try {
                                    await scheduleConsultationExpirationAfterPlanCancellation(consulta.Id, dataExpiracao);

                                    // Marca no campo TelaGatilho para referência (opcional, mantém compatibilidade)
                                    await prisma.consulta.update({
                                        where: { Id: consulta.Id },
                                        data: {
                                            TelaGatilho: `EXPIRA_${dayjs(dataExpiracao).format('YYYY-MM-DD')}`,
                                            OrigemStatus: "Sistema - Plano Cancelado"
                                        }
                                    });
                                } catch (error) {
                                    console.error(`[CancelarPlano] Erro ao agendar expiração para consulta ${consulta.Id}:`, error);
                                    // Continua processando outras consultas mesmo se uma falhar
                                }
                            }

                            console.log(`[CancelarPlano] ✅ ${consultasAgendadas.length} sessões agendadas terão jobs de expiração agendados para 30 dias (${dataExpiracao.toISOString()})`);
                            console.log(`[CancelarPlano] Consultas que expiram:`, consultasAgendadas.map(c => ({ Id: c.Id, Date: c.Date, Time: c.Time })));
                        }
                    }
                } catch (error) {
                    console.error("[CancelarPlano] Erro ao processar expiração de sessões agendadas:", error);
                    // Não falha o cancelamento se houver erro na expiração
                }
            }

            // Atualiza status da assinatura do plano e financeiro em paralelo
            await Promise.all([
                prisma.assinaturaPlano.update({
                    where: { Id: assinaturaPlanoId },
                    data: { Status: "Cancelado", DataFim: dataCancelamentoDate },
                }),
                prisma.financeiro.updateMany({
                    where: {
                        PlanoAssinaturaId: assinaturaPlano.PlanoAssinaturaId,
                        UserId: userId.toString(),
                        Tipo: {
                            not: TipoFatura.Multa // Não cancela registros de multa
                        },
                        Id: {
                            not: financeiroPlanoCancelado?.Id || "" // Não atualiza o registro que acabamos de criar
                        }
                    },
                    data: { Status: "Cancelado" },
                }),
            ]);

            // Prepara mensagem de notificação
            const nomePlano = assinaturaPlano.PlanoAssinatura?.Nome || "seu plano";
            let mensagemNotificacao = `Seu plano ${nomePlano} foi cancelado com sucesso.`;

            if (dentroPeriodoArrependimento) {
                if (reembolsoGerado) {
                    const valorMensalPlano = assinaturaPlano.PlanoAssinatura?.Preco || 0;
                    if (totalConsultasUsadas > 0) {
                        const valorConsultasUtilizadas = this.calcularValorConsultasUtilizadas(
                            valorMensalPlano,
                            assinaturaPlano.PlanoAssinatura?.Tipo || "",
                            totalConsultasUsadas
                        );
                        const valorReembolsoFinal = Math.max(0, valorMensalPlano - valorConsultasUtilizadas);
                        mensagemNotificacao += ` Como você utilizou ${totalConsultasUsadas} consulta(s) (R$ ${valorConsultasUtilizadas.toFixed(2)}), foi descontado o valor proporcional. O reembolso de R$ ${valorReembolsoFinal.toFixed(2)} será aplicado na sua próxima fatura.`;
                    } else {
                        mensagemNotificacao += ` Como não houve uso dos serviços, o reembolso integral de R$ ${valorMensalPlano.toFixed(2)} será aplicado na sua próxima fatura.`;
                    }
                }
            } else if (multaGerada) {
                mensagemNotificacao += ` Uma multa de R$ ${valorMulta.toFixed(2)} foi gerada e será debitada do seu cartão.`;
            }

            // Envia notificação via socket para o paciente
            try {
                await notificationService.sendNotification({
                    userId: userId.toString(),
                    title: "Plano Cancelado",
                    message: mensagemNotificacao,
                    type: "warning"
                });
                console.log(`[CancelarPlano] Notificação enviada via socket para o usuário ${userId}`);
            } catch (notifError) {
                console.error("[CancelarPlano] Erro ao enviar notificação via socket:", notifError);
                // Continua o processo mesmo se falhar a notificação
            }

            // Retorna resposta com informações sobre multa ou reembolso
            if (dentroPeriodoArrependimento && reembolsoGerado) {
                const valorMensalPlano = assinaturaPlano.PlanoAssinatura?.Preco || 0;
                let valorReembolsoFinal = 0;
                if (totalConsultasUsadas > 0) {
                    const valorConsultasUtilizadas = this.calcularValorConsultasUtilizadas(
                        valorMensalPlano,
                        assinaturaPlano.PlanoAssinatura?.Tipo || "",
                        totalConsultasUsadas
                    );
                    valorReembolsoFinal = Math.max(0, valorMensalPlano - valorConsultasUtilizadas);
                } else {
                    valorReembolsoFinal = valorMensalPlano;
                }

                return res.status(200).json({
                    success: true,
                    message: mensagemNotificacao,
                    reembolso: valorReembolsoFinal,
                    consultasUtilizadas: totalConsultasUsadas,
                    dentroPeriodoArrependimento: true
                });
            } else if (multaGerada) {
                const resultadoMulta = calcularMultaProporcional(
                    {
                        DataInicio: assinaturaPlano.DataInicio,
                        PlanoAssinatura: assinaturaPlano.PlanoAssinatura,
                        Ciclos: assinaturaPlano.Ciclos?.map(ciclo => ({
                            CicloInicio: ciclo.CicloInicio,
                            CicloFim: ciclo.CicloFim,
                            Status: ciclo.Status
                        }))
                    },
                    dataCancelamentoDate
                );

                return res.status(200).json({
                    success: true,
                    message: mensagemNotificacao,
                    multa: valorMulta,
                    diasFaltantes: resultadoMulta.diasFaltantes,
                    ciclosRestantes: resultadoMulta.ciclosRestantes
                });
            }

            // Busca usuário e envia e-mail em background
            prisma.user.findUnique({
                where: { Id: userId.toString() },
                include: { Address: true }
            }).then((user) => {
                if (!user) return;
                const userWithAddress = user as UserWithAddress;
                emailService.sendPlanoCancelamentoConfirmationEmail(
                    userWithAddress,
                    assinaturaPlano.PlanoAssinatura,
                    new Date()
                ).catch(console.error);
            }).catch(console.error);

            return res.status(200).json({ success: true, message: "Plano cancelado com sucesso" });
        } catch (error) {
            console.error("Erro ao cancelar plano:", error);
            return res.status(500).json({ success: false, message: "Erro ao cancelar plano" });
        }
    }

    /**
     * Calcula o valor proporcional das consultas utilizadas
     * @param valorMensalPlano Valor mensal do plano
     * @param tipoPlano Tipo do plano (mensal, trimestral, semestral)
     * @param consultasUsadas Total de consultas utilizadas
     * @returns Valor total das consultas utilizadas
     */
    private calcularValorConsultasUtilizadas(
        valorMensalPlano: number,
        tipoPlano: string,
        consultasUsadas: number
    ): number {
        if (consultasUsadas <= 0) {
            return 0;
        }

        const tipoNormalizado = (tipoPlano || "").toLowerCase();
        let consultasPorMes = 4; // Padrão: 4 consultas por mês

        // Calcula valor por consulta baseado no tipo de plano
        let valorPorConsulta = 0;
        if (tipoNormalizado === "mensal") {
            valorPorConsulta = valorMensalPlano / consultasPorMes;
        } else if (tipoNormalizado === "trimestral") {
            // Trimestral: 12 consultas em 3 meses = 4 por mês
            valorPorConsulta = valorMensalPlano / consultasPorMes;
        } else if (tipoNormalizado === "semestral") {
            // Semestral: 24 consultas em 6 meses = 4 por mês
            valorPorConsulta = valorMensalPlano / consultasPorMes;
        } else {
            // Fallback: assume 4 consultas por mês
            valorPorConsulta = valorMensalPlano / consultasPorMes;
        }

        const valorTotal = valorPorConsulta * consultasUsadas;
        const valorArredondado = Math.round(valorTotal * 100) / 100;

        console.log('[CalcularValorConsultasUtilizadas]', {
            valorMensalPlano,
            tipoPlano,
            consultasUsadas,
            valorPorConsulta: valorPorConsulta.toFixed(2),
            valorTotal: valorTotal.toFixed(2),
            valorArredondado: valorArredondado.toFixed(2)
        });

        return valorArredondado;
    }

    /**
     * Cria um crédito/reembolso e aplica na próxima fatura da Vindi
     * @param params Dados necessários para criar o reembolso
     */
    private async criarReembolsoProporcional(params: {
        userId: string;
        vindiCustomerId: string;
        valorReembolso: number;
        motivo: string;
        paymentProfileId?: string | number | null;
    }): Promise<string | null> {
        const { userId, vindiCustomerId, valorReembolso, motivo, paymentProfileId } = params;
        const PRODUCT_ID_REEMBOLSO = 363879; // ID do produto de desconto/reembolso na Vindi

        try {
            console.log(`[CriarReembolsoProporcional] Criando reembolso de R$ ${valorReembolso.toFixed(2)} - Motivo: ${motivo}`);

            if (valorReembolso <= 0) {
                console.log(`[CriarReembolsoProporcional] Valor de reembolso é zero ou negativo, pulando criação`);
                return null;
            }

            // 1. Busca a próxima fatura pendente do customer na Vindi
            let proximaFatura: any = null;
            let billIdAplicado: string | null = null;

            try {
                const billsPendentes = await VindiService.getBillsByCustomerId(Number(vindiCustomerId), 'pending');

                if (billsPendentes && billsPendentes.length > 0) {
                    // Pega a primeira fatura pendente (já ordenada por data de vencimento)
                    proximaFatura = billsPendentes[0];
                    console.log(`[CriarReembolsoProporcional] Próxima fatura encontrada: ${proximaFatura.id}, Status: ${proximaFatura.status}, Valor: R$ ${proximaFatura.amount || 0}`);

                    // 2. Aplica o desconto na próxima fatura usando o produto de desconto
                    try {
                        const billDesconto = await VindiService.aplicarDescontoEmBill(
                            Number(proximaFatura.id),
                            valorReembolso,
                            PRODUCT_ID_REEMBOLSO
                        );

                        if (billDesconto && billDesconto.id) {
                            billIdAplicado = String(billDesconto.id);
                            console.log(`[CriarReembolsoProporcional] Desconto aplicado na fatura ${proximaFatura.id}. Novo bill de desconto criado: ${billIdAplicado}`);
                        }
                    } catch (erroDesconto) {
                        console.error(`[CriarReembolsoProporcional] Erro ao aplicar desconto na fatura ${proximaFatura.id}:`, erroDesconto);
                        // Continua mesmo se falhar, cria o registro de reembolso no banco
                    }
                } else {
                    console.log(`[CriarReembolsoProporcional] Nenhuma fatura pendente encontrada para o customer ${vindiCustomerId}. O reembolso será aplicado na próxima fatura gerada.`);

                    // Se não há fatura pendente, cria um bill de desconto que será aplicado na próxima fatura
                    try {
                        const billDesconto = await VindiService.createBill({
                            customer_id: Number(vindiCustomerId),
                            payment_method_code: "credit_card",
                            payment_profile_id: paymentProfileId ? Number(paymentProfileId) : undefined,
                            bill_items: [
                                {
                                    product_id: PRODUCT_ID_REEMBOLSO,
                                    amount: valorReembolso
                                }
                            ]
                        });

                        if (billDesconto && billDesconto.id) {
                            billIdAplicado = String(billDesconto.id);
                            console.log(`[CriarReembolsoProporcional] Bill de desconto criado para aplicar na próxima fatura: ${billIdAplicado}`);
                        }
                    } catch (erroBill) {
                        console.error(`[CriarReembolsoProporcional] Erro ao criar bill de desconto:`, erroBill);
                        // Continua mesmo se falhar, cria o registro de reembolso no banco
                    }
                }
            } catch (erroBusca) {
                console.error(`[CriarReembolsoProporcional] Erro ao buscar faturas pendentes:`, erroBusca);
                // Continua mesmo se falhar, cria o registro de reembolso no banco
            }

            // 3. Cria um Financeiro negativo para representar o crédito/reembolso
            const financeiroReembolso = await prisma.financeiro.create({
                data: {
                    UserId: userId.toString(),
                    PlanoAssinaturaId: null, // Reembolso não está vinculado a um plano específico
                    Valor: -Math.abs(valorReembolso), // Valor negativo para representar crédito
                    DataVencimento: new Date(), // Data atual
                    Status: ControleFinanceiroStatus.Aprovado, // Já aprovado (é um crédito)
                    Tipo: TipoFatura.Plano, // Tipo Plano para aparecer no histórico
                    FaturaId: billIdAplicado ? billIdAplicado : null // Vincula ao bill de desconto criado na Vindi
                }
            });

            console.log(`[CriarReembolsoProporcional] Financeiro de reembolso criado: ${financeiroReembolso.Id}, Valor: R$ ${valorReembolso.toFixed(2)}, BillId: ${billIdAplicado || 'N/A'}`);

            // 4. Se foi criado um bill de desconto, cria também a Fatura correspondente
            if (billIdAplicado) {
                try {
                    const faturaReembolso = await prisma.fatura.findFirst({
                        where: { CodigoFatura: billIdAplicado }
                    });

                    if (!faturaReembolso) {
                        await prisma.fatura.create({
                            data: {
                                CodigoFatura: billIdAplicado,
                                Valor: valorReembolso,
                                Status: FaturaStatus.Pending,
                                Tipo: TipoFatura.Plano,
                                CustomerId: vindiCustomerId,
                                UserId: userId,
                                DataEmissao: new Date(),
                                DataVencimento: new Date()
                            }
                        });
                        console.log(`[CriarReembolsoProporcional] Fatura de reembolso criada: ${billIdAplicado}`);
                    }
                } catch (erroFatura) {
                    console.error(`[CriarReembolsoProporcional] Erro ao criar fatura de reembolso:`, erroFatura);
                    // Não bloqueia o processo se falhar
                }
            }

            return financeiroReembolso.Id;
        } catch (error) {
            console.error(`[CriarReembolsoProporcional] Erro ao criar reembolso:`, error);
            return null;
        }
    }

    /**
     * Calcula o desconto proporcional baseado nos dias restantes do ciclo atual
     * @param valorMensalPlano Valor mensal do plano atual
     * @param cicloAtivo Ciclo ativo do plano atual
     * @returns Valor do desconto proporcional calculado
     */
    private calcularDescontoProporcionalCiclo(
        valorMensalPlano: number,
        cicloAtivo: { CicloInicio: Date; CicloFim: Date } | null
    ): number {
        if (!cicloAtivo) {
            console.log('[CalcularDescontoProporcionalCiclo] Nenhum ciclo ativo encontrado, desconto = 0');
            return 0;
        }

        const dataAtual = dayjs().tz('America/Sao_Paulo').startOf('day');
        const cicloFim = dayjs(cicloAtivo.CicloFim).tz('America/Sao_Paulo').startOf('day');

        // Calcula dias restantes do ciclo
        const diasRestantes = Math.max(0, cicloFim.diff(dataAtual, 'day'));

        if (diasRestantes <= 0) {
            console.log('[CalcularDescontoProporcionalCiclo] Ciclo já venceu ou não há dias restantes, desconto = 0');
            return 0;
        }

        // Calcula valor diário do plano (assumindo 30 dias por ciclo)
        const diasPorCiclo = 30;
        const valorDiario = valorMensalPlano / diasPorCiclo;

        // Calcula valor proporcional dos dias restantes
        const valorProporcional = valorDiario * diasRestantes;

        // Arredonda para 2 casas decimais
        const desconto = Math.round(valorProporcional * 100) / 100;

        console.log('[CalcularDescontoProporcionalCiclo]', {
            valorMensalPlano,
            diasRestantes,
            valorDiario: valorDiario.toFixed(2),
            valorProporcional: valorProporcional.toFixed(2),
            desconto: desconto.toFixed(2)
        });

        return desconto;
    }

    /**
     * Cria uma compra (bill) do produto de desconto para upgrade/downgrade
     * @param params Dados necessários para criar a compra do desconto
     */
    private async criarCompraProdutoDesconto(params: {
        vindiCustomerId: string;
        paymentProfileId: string;
        valorDesconto: number;
    }): Promise<string | null> {
        const { vindiCustomerId, paymentProfileId, valorDesconto } = params;
        const PRODUCT_ID_DESCONTO = "363879"; // ID do produto de desconto na Vindi

        try {
            console.log(`[CriarCompraProdutoDesconto] Criando bill do produto de desconto (${PRODUCT_ID_DESCONTO}) com valor: R$ ${valorDesconto.toFixed(2)}`);

            if (valorDesconto <= 0) {
                console.log(`[CriarCompraProdutoDesconto] Valor de desconto é zero ou negativo, pulando criação do bill`);
                return null;
            }

            const billData: VindiBillData = {
                customer_id: Number(vindiCustomerId),
                payment_method_code: "credit_card",
                payment_profile_id: Number(paymentProfileId),
                bill_items: [
                    {
                        product_id: Number(PRODUCT_ID_DESCONTO),
                        amount: valorDesconto
                    }
                ]
            };

            const bill = await VindiService.createBill(billData);

            if (bill && bill.id) {
                console.log(`[CriarCompraProdutoDesconto] Bill criado com sucesso: ${bill.id}`);
                return String(bill.id);
            }

            return null;
        } catch (error) {
            console.error(`[CriarCompraProdutoDesconto] Erro ao criar bill do produto de desconto:`, error);
            // Não lança erro para não bloquear o processo de upgrade/downgrade
            return null;
        }
    }

    /**
     * Cria uma nova assinatura para troca de plano (downgrade/upgrade)
     * Cria tudo como "Ativo" imediatamente, usando o cartão já cadastrado na Vindi
     * @param params.startAt Data futura para início da assinatura (opcional, formato ISO)
     */
    private async criarNovaAssinaturaParaTroca(params: {
        userId: string;
        novoPlano: NovoPlanoParaTroca;
        user: UserParaTroca;
        vindiCustomerId: string;
        paymentProfileId: string;
        gatewayToken: string;
        paymentCompanyCode: string;
        startAt?: string; // Data futura para início da assinatura (formato ISO)
        dataInicioFutura?: Date; // Data futura para início da assinatura no banco
    }): Promise<Prisma.AssinaturaPlanoGetPayload<{}>> {
        const { userId, novoPlano, user, vindiCustomerId, paymentProfileId, gatewayToken } = params;

        if (!vindiCustomerId) {
            throw new Error("VindiCustomerId é obrigatório para criar assinatura");
        }

        if (!paymentProfileId) {
            throw new Error("PaymentProfileId é obrigatório para criar assinatura na troca de plano");
        }

        if (!novoPlano.VindiPlanId || !novoPlano.ProductId || novoPlano.VindiPlanId === null || novoPlano.ProductId === null) {
            throw new Error("VindiPlanId e ProductId são obrigatórios");
        }

        // 1. Cria assinatura na Vindi usando PaymentProfileId já cadastrado
        console.log(`[CriarNovaAssinaturaParaTroca] Criando assinatura na Vindi com PaymentProfileId: ${paymentProfileId}`);
        const subscriptionPayload: any = {
            plan_id: novoPlano.VindiPlanId,
            customer_id: vindiCustomerId,
            payment_method_code: "credit_card",
            payment_profile_id: String(paymentProfileId),
            product_items: [{ product_id: novoPlano.ProductId }]
        };

        // Adiciona start_at se fornecido (para agendamento futuro)
        if (params.startAt) {
            subscriptionPayload.start_at = params.startAt;
            console.log(`[CriarNovaAssinaturaParaTroca] Assinatura será agendada para: ${params.startAt}`);
        }

        const subscriptionResponse = await this.criarSubscription(subscriptionPayload);

        if (!subscriptionResponse || !subscriptionResponse.id) {
            throw new Error("Falha ao criar assinatura na Vindi");
        }

        const subscriptionId = subscriptionResponse.id;
        console.log(`[CriarNovaAssinaturaParaTroca] Assinatura criada na Vindi: ${subscriptionId}`);

        // 2. Busca o bill da assinatura (a Vindi cria automaticamente ao criar a subscription)
        let billId: string | undefined;
        try {
            // Aguarda um pouco para a Vindi processar
            await new Promise(resolve => setTimeout(resolve, 1000));
            const bills = await VindiService.getBillsBySubscriptionId(String(subscriptionId));
            if (bills && bills.length > 0) {
                // Pega o bill mais recente
                const latestBill = bills.sort((a: VindiBill, b: VindiBill) =>
                    new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
                )[0];
                billId = String(latestBill.id);
                console.log(`[CriarNovaAssinaturaParaTroca] Bill encontrado: ${billId}`);
            }
        } catch (err) {
            console.warn(`[CriarNovaAssinaturaParaTroca] Erro ao buscar bills da assinatura:`, err);
            // Continua mesmo sem o billId
        }

        // 3. Atualiza usuário com novo SubscriptionId
        await prisma.user.update({
            where: { Id: userId },
            data: {
                SubscriptionId: String(subscriptionId),
                PaymentProfileId: String(paymentProfileId),
                PaymentToken: gatewayToken || user.PaymentToken || ""
            }
        });

        // 4. Cria AssinaturaPlano com Status "Ativo" (não AguardandoPagamento)
        // Usa dataInicioFutura se fornecida, senão usa data atual
        const dataInicio = params.dataInicioFutura
            ? dayjs(params.dataInicioFutura).tz('America/Sao_Paulo').startOf('day').toDate()
            : dayjs().tz('America/Sao_Paulo').startOf('day').toDate();
        const duracaoPlano = novoPlano.Duracao ?? 30;
        const assinaturaPlano = await this.criarAssinaturaPlano(
            userId,
            novoPlano.Id,
            dataInicio,
            String(subscriptionId),
            duracaoPlano,
            PlanoCompraStatus.Ativo // Status Ativo imediatamente
        );

        console.log(`[CriarNovaAssinaturaParaTroca] AssinaturaPlano criada: ${assinaturaPlano.Id} com Status: ${assinaturaPlano.Status} (esperado: ${PlanoCompraStatus.Ativo})`);

        // Verifica se o status foi criado corretamente
        if (assinaturaPlano.Status !== PlanoCompraStatus.Ativo) {
            console.error(`[CriarNovaAssinaturaParaTroca] ERRO: AssinaturaPlano foi criada com status incorreto: ${assinaturaPlano.Status}. Corrigindo...`);
            await prisma.assinaturaPlano.update({
                where: { Id: assinaturaPlano.Id },
                data: { Status: PlanoCompraStatus.Ativo }
            });
            // Busca novamente para retornar o status correto
            const assinaturaPlanoAtualizada = await prisma.assinaturaPlano.findUnique({
                where: { Id: assinaturaPlano.Id }
            });
            if (assinaturaPlanoAtualizada) {
                return assinaturaPlanoAtualizada;
            }
        }

        // 5. Cria ciclo com Status "Ativo" (não Pendente)
        const cicloFim = new Date(dataInicio);
        cicloFim.setDate(cicloFim.getDate() + 30);

        const primeiroCiclo = await cicloPlanoService.criarCiclo({
            assinaturaPlanoId: assinaturaPlano.Id,
            userId: userId,
            cicloInicio: dataInicio,
            cicloFim: cicloFim,
            consultasDisponiveis: 4,
            status: "Ativo" // Status Ativo imediatamente
        });

        console.log(`[CriarNovaAssinaturaParaTroca] Ciclo criado: ${primeiroCiclo.Id} com Status: Ativo`);

        // 6. Cria fatura e financeiro já ativos
        const fatura = await this.criarFatura(
            novoPlano.Preco || 0,
            vindiCustomerId,
            userId,
            billId
        );

        // Atualiza fatura para Paid se a assinatura foi criada com sucesso
        if (fatura) {
            await prisma.fatura.update({
                where: { Id: fatura.Id },
                data: { Status: FaturaStatus.Paid }
            });
        }

        // Cria financeiro já como Pago
        await this.criarFinanceiro(
            userId,
            novoPlano.Id,
            novoPlano.Preco || 0,
            dataInicio,
            fatura?.Id ?? null,
            TipoFatura.Plano,
            primeiroCiclo.Id
        );

        // Atualiza financeiro para Aprovado (pagamento confirmado)
        await prisma.financeiro.updateMany({
            where: {
                UserId: userId,
                PlanoAssinaturaId: novoPlano.Id,
                CicloPlanoId: primeiroCiclo.Id,
                Status: ControleFinanceiroStatus.AguardandoPagamento
            },
            data: { Status: ControleFinanceiroStatus.Aprovado }
        });

        // 6. Cria ou atualiza ControleConsultaMensal já ativo (usa upsert para evitar constraint única)
        const validade = new Date(dataInicio);
        validade.setDate(validade.getDate() + 30);
        const mesReferencia = dataInicio.getMonth() + 1;
        const anoReferencia = dataInicio.getFullYear();

        await prisma.controleConsultaMensal.upsert({
            where: {
                UserId_AssinaturaPlanoId_MesReferencia_AnoReferencia: {
                    UserId: userId.toString(),
                    AssinaturaPlanoId: assinaturaPlano.Id,
                    MesReferencia: mesReferencia,
                    AnoReferencia: anoReferencia
                }
            },
            update: {
                Status: ControleConsultaMensalStatus.Ativo,
                Validade: validade,
                ConsultasDisponiveis: 4,
                Used: 0,
                Available: 4
            },
            create: {
                UserId: userId.toString(),
                AssinaturaPlanoId: assinaturaPlano.Id,
                MesReferencia: mesReferencia,
                AnoReferencia: anoReferencia,
                Status: ControleConsultaMensalStatus.Ativo,
                Validade: validade,
                ConsultasDisponiveis: 4,
                Used: 0,
                Available: 4
            },
        });

        console.log(`[CriarNovaAssinaturaParaTroca] Nova assinatura criada completamente ativa: ${assinaturaPlano.Id}`);

        return assinaturaPlano;
    }

    async downgradePlano(
        req: Request,
        res: Response,
        userId: string
    ): Promise<Response> {
        const { assinaturaPlanoAtualId, novoPlanoId } = req.body;

        try {
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const assinaturaPlanoAtual = await prisma.assinaturaPlano.findUnique({
                where: { Id: assinaturaPlanoAtualId },
                include: { PlanoAssinatura: true },
            });

            if (!assinaturaPlanoAtual || assinaturaPlanoAtual.UserId !== userId.toString()) {
                return res.status(404).json({ message: "Plano atual não encontrado ou não pertence ao usuário" });
            }

            if (assinaturaPlanoAtual.Status !== "Ativo") {
                return res.status(400).json({ message: "Plano atual não está ativo" });
            }

            // Regra de permanência mínima e cálculo de multa para downgrade
            const tipoRecorrencia = (assinaturaPlanoAtual.PlanoAssinatura?.Tipo || "").toLowerCase();
            let diasMinimos = 0;
            if (tipoRecorrencia === "semestral") diasMinimos = 180;
            if (tipoRecorrencia === "trimestral") diasMinimos = 90;

            const dataCompra = new Date(assinaturaPlanoAtual.DataInicio);
            const dataAtual = new Date();
            const diffMs = dataAtual.getTime() - dataCompra.getTime();
            const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            let multaGerada = false;
            let valorMulta = 0;

            if (diasMinimos > 0 && diffDias < diasMinimos) {
                // Calcula multa de 20% do valor do plano
                const precoPlano = assinaturaPlanoAtual.PlanoAssinatura?.Preco || 0;
                valorMulta = Math.round((precoPlano * 0.2) * 100) / 100;

                // Busca o usuário para obter o VindiCustomerId e PaymentProfileId
                const user = await this.buscarUsuario(userId);
                if (user && user.VindiCustomerId) {
                    // Usa o product_id fixo para multa: 320985
                    const productIdMulta = "320985";

                    // Gera fatura da multa na Vindi com cobrança automática no cartão cadastrado
                    try {
                        const billData: VindiBillData = {
                            customer_id: Number(user.VindiCustomerId),
                            payment_method_code: "credit_card",
                            bill_items: [
                                {
                                    product_id: Number(productIdMulta),
                                    amount: valorMulta
                                }
                            ]
                        };

                        // Adiciona payment_profile_id se o usuário tiver cartão cadastrado
                        if (user.PaymentProfileId) {
                            billData.payment_profile_id = user.PaymentProfileId;
                        }

                        const bill = await VindiService.createBill(billData);

                        // Grava a multa no Financeiro com o PlanoAssinaturaId do plano cancelado
                        if (bill && bill.id) {
                            // Data de vencimento = data de pagamento (data atual)
                            const dataVencimento = new Date();

                            // Cria a Fatura para a multa com tipo correto
                            const faturaMulta = await prisma.fatura.create({
                                data: {
                                    Valor: valorMulta,
                                    Status: 'Pending',
                                    Tipo: TipoFatura.Multa, // Tipo correto para multa
                                    CustomerId: user.VindiCustomerId ?? "",
                                    UserId: userId,
                                    CodigoFatura: String(bill.id), // Código da fatura da Vindi
                                    DataEmissao: dataVencimento,
                                    DataVencimento: dataVencimento // Data de vencimento = data de pagamento
                                }
                            });

                            // Cria o Financeiro vinculado à Fatura com tipo Multa explicitamente
                            await prisma.financeiro.create({
                                data: {
                                    UserId: userId.toString(),
                                    PlanoAssinaturaId: assinaturaPlanoAtual.PlanoAssinaturaId,
                                    Valor: valorMulta,
                                    DataVencimento: dataVencimento, // Data de vencimento = data de pagamento
                                    Status: ControleFinanceiroStatus.AguardandoPagamento,
                                    Tipo: TipoFatura.Multa, // Tipo explícito: Multa
                                    FaturaId: faturaMulta.Id // Vincula à Fatura criada
                                }
                            });

                            multaGerada = true;
                            console.log(`[DowngradePlano] Multa criada: FaturaId=${faturaMulta.Id}, Tipo=${TipoFatura.Multa}, CodigoFatura=${bill.id}`);
                        }
                    } catch (err) {
                        console.error("Erro ao gerar fatura de multa na Vindi:", err);
                    }
                } else {
                    console.warn("Usuário não possui VindiCustomerId, não foi possível gerar fatura de multa na Vindi");
                }

                console.log(`[DowngradePlano] Multa de R$ ${valorMulta.toFixed(2)} gerada. Prosseguindo com downgrade...`);
                // ✅ NÃO retorna aqui - continua com o downgrade!
            }

            // Busca o novo plano
            const novoPlano = await this.buscarPlano(novoPlanoId);
            if (!novoPlano || novoPlano.Status !== "ativo") {
                return res.status(404).json({ message: "Novo plano não encontrado ou inativo" });
            }

            // Busca o usuário para obter os dados necessários
            const user = await this.buscarUsuario(userId);
            if (!user) {
                return res.status(404).json({ message: "Usuário não encontrado" });
            }

            // Zera e cancela todos os ciclos ativos do plano atual antes de cancelar
            await prisma.cicloPlano.updateMany({
                where: {
                    AssinaturaPlanoId: assinaturaPlanoAtualId,
                    Status: "Ativo"
                },
                data: {
                    Status: "Cancelado",
                    ConsultasDisponiveis: 0,
                    ConsultasUsadas: 0
                }
            });

            console.log(`[DowngradePlano] Ciclos antigos zerados e cancelados para assinatura ${assinaturaPlanoAtualId}`);

            // Cancela a assinatura na Vindi ANTES de cancelar no banco
            const vindiSubscriptionId = assinaturaPlanoAtual.VindiSubscriptionId;
            if (vindiSubscriptionId) {
                try {
                    console.log(`[DowngradePlano] Cancelando assinatura na Vindi: ${vindiSubscriptionId}`);
                    await VindiService.deleteSubscription(vindiSubscriptionId);
                    console.log(`[DowngradePlano] Assinatura ${vindiSubscriptionId} cancelada com sucesso na Vindi`);
                } catch (err) {
                    console.error(`[DowngradePlano] Erro ao cancelar assinatura na Vindi:`, err);
                    // Continua o processo mesmo se falhar o cancelamento na Vindi
                    // Mas loga o erro para investigação
                }
            } else {
                console.warn(`[DowngradePlano] Assinatura não possui VindiSubscriptionId, pulando cancelamento na Vindi`);
            }

            // Cancela a assinatura atual no banco de dados
            await prisma.assinaturaPlano.update({
                where: { Id: assinaturaPlanoAtualId },
                data: { Status: "Cancelado", DataFim: new Date() },
            });

            console.log(`[DowngradePlano] Criando nova assinatura na Vindi com plano: ${novoPlano.Id} (${novoPlano.Nome})`);
            console.log(`[DowngradePlano] VindiPlanId: ${novoPlano.VindiPlanId}, ProductId: ${novoPlano.ProductId}`);
            console.log(`[DowngradePlano] User PaymentProfileId: ${user.PaymentProfileId}, VindiCustomerId: ${user.VindiCustomerId}`);

            // Calcula a data futura para início da nova assinatura (1 mês após a data de contratação atual)
            const dataContratacao = dayjs(assinaturaPlanoAtual.DataInicio).tz('America/Sao_Paulo');
            const dataInicioFutura = dataContratacao.add(1, 'month').startOf('day').toDate();
            const startAtISO = dayjs(dataInicioFutura).tz('America/Sao_Paulo').toISOString();

            console.log(`[DowngradePlano] Data de contratação atual: ${dataContratacao.format('YYYY-MM-DD')}`);
            console.log(`[DowngradePlano] Nova assinatura será agendada para: ${dayjs(dataInicioFutura).format('YYYY-MM-DD')}`);

            // Para downgrade, não aplica desconto (apenas multa se aplicável)
            // O desconto proporcional só é aplicado em upgrade
            console.log(`[DowngradePlano] Downgrade não aplica desconto proporcional, apenas multa se aplicável`);

            // Cria nova assinatura para troca de plano (agendada para data futura)
            // Usa o cartão já cadastrado na Vindi (PaymentProfileId)
            let novaAssinatura;
            try {
                novaAssinatura = await this.criarNovaAssinaturaParaTroca({
                    userId,
                    novoPlano,
                    user,
                    vindiCustomerId: user.VindiCustomerId || "",
                    paymentProfileId: user.PaymentProfileId || "",
                    gatewayToken: user.PaymentToken || "",
                    paymentCompanyCode: "",
                    startAt: startAtISO, // Data futura para início da assinatura na Vindi
                    dataInicioFutura: dataInicioFutura // Data futura para início da assinatura no banco
                });
            } catch (error: unknown) {
                console.error(`[DowngradePlano] Erro ao criar nova assinatura para troca:`, error);
                // Se for erro de conexão do Prisma, tenta novamente após um delay
                const err = error as { message?: string };
                if (err.message?.includes('Connection terminated') || err.message?.includes('Connection terminated unexpectedly')) {
                    console.log(`[DowngradePlano] Tentando novamente após erro de conexão...`);
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Aguarda 2 segundos
                    try {
                        novaAssinatura = await this.criarNovaAssinaturaParaTroca({
                            userId,
                            novoPlano,
                            user,
                            vindiCustomerId: user.VindiCustomerId || "",
                            paymentProfileId: user.PaymentProfileId || "",
                            gatewayToken: user.PaymentToken || "",
                            paymentCompanyCode: "",
                            startAt: startAtISO,
                            dataInicioFutura: dataInicioFutura
                        });
                    } catch (retryError: any) {
                        console.error(`[DowngradePlano] Erro na segunda tentativa:`, retryError);
                        return res.status(500).json({
                            message: "Erro de conexão com o banco de dados. Por favor, tente novamente em alguns instantes."
                        });
                    }
                } else {
                    const err = error as { message?: string };
                    return res.status(500).json({
                        message: err.message || "Erro ao criar nova assinatura. Verifique os logs para mais detalhes."
                    });
                }
            }

            if (!novaAssinatura) {
                console.error(`[DowngradePlano] Falha ao criar nova assinatura para troca`);
                return res.status(500).json({
                    message: "Erro ao criar nova assinatura na Vindi. Verifique os logs para mais detalhes."
                });
            }

            console.log(`[DowngradePlano] Nova assinatura criada com sucesso: ${novaAssinatura.Id}, VindiSubscriptionId: ${novaAssinatura.VindiSubscriptionId}`);

            // Grava a movimentação de downgrade no Financeiro
            if (novaAssinatura) {
                const dataVencimento = new Date();
                dataVencimento.setDate(dataVencimento.getDate() + 7);

                try {
                    await this.criarFinanceiro(
                        userId,
                        novoPlano.Id,
                        novoPlano.Preco || 0,
                        dataVencimento,
                        null,
                        TipoFatura.Downgrade
                    );
                } catch (err) {
                    console.error("Erro ao gravar downgrade no Financeiro:", err);
                }
            }

            // Monta resposta melhorada para downgrade
            const respostaMelhorada = {
                assinaturaPlano: novaAssinatura,
                message: multaGerada
                    ? `Plano alterado com sucesso! Uma multa de R$ ${valorMulta.toFixed(2)} foi cobrada automaticamente. Seu novo plano já está ativo.`
                    : `Plano alterado com sucesso! Seu novo plano já está ativo. Verifique em "Meus Planos" para confirmar.`
            };

            return CompraPlanoService.responseFromPayload(res, respostaMelhorada);

        } catch (error) {
            console.error("Erro ao realizar downgrade de plano:", error);
            return res.status(500).json({ message: "Erro ao realizar downgrade de plano" });
        }
    }

    async upgradePlano(
        req: Request,
        res: Response,
        userId: string
    ): Promise<Response> {
        const { assinaturaPlanoAtualId, novoPlanoId } = req.body;

        try {
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const assinaturaPlanoAtual = await prisma.assinaturaPlano.findUnique({
                where: { Id: assinaturaPlanoAtualId },
                include: {
                    PlanoAssinatura: true,
                    Ciclos: {
                        where: { Status: "Ativo" },
                        orderBy: { CreatedAt: 'desc' },
                        take: 1
                    }
                },
            });

            if (!assinaturaPlanoAtual || assinaturaPlanoAtual.UserId !== userId.toString()) {
                return res.status(404).json({ message: "Plano atual não encontrado ou não pertence ao usuário" });
            }

            if (assinaturaPlanoAtual.Status !== "Ativo") {
                return res.status(400).json({ message: "Plano atual não está ativo" });
            }

            // Regra de permanência mínima e cálculo de multa para upgrade
            const tipoRecorrencia = (assinaturaPlanoAtual.PlanoAssinatura?.Tipo || "").toLowerCase();
            let diasMinimos = 0;
            if (tipoRecorrencia === "semestral") diasMinimos = 180;
            if (tipoRecorrencia === "trimestral") diasMinimos = 90;

            const dataCompra = new Date(assinaturaPlanoAtual.DataInicio);
            const dataAtual = new Date();
            const diffMs = dataAtual.getTime() - dataCompra.getTime();
            const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            let multaGerada = false;
            let valorMulta = 0;

            if (diasMinimos > 0 && diffDias < diasMinimos) {
                // Calcula multa de 20% do valor do plano
                const precoPlano = assinaturaPlanoAtual.PlanoAssinatura?.Preco || 0;
                valorMulta = Math.round((precoPlano * 0.2) * 100) / 100;

                // Busca o usuário para obter o VindiCustomerId e PaymentProfileId
                const user = await this.buscarUsuario(userId);
                if (user && user.VindiCustomerId) {
                    // Usa o product_id fixo para multa: 320985
                    const productIdMulta = "320985";

                    // Gera fatura da multa na Vindi com cobrança automática no cartão cadastrado
                    try {
                        const billData: VindiBillData = {
                            customer_id: Number(user.VindiCustomerId),
                            payment_method_code: "credit_card",
                            bill_items: [
                                {
                                    product_id: Number(productIdMulta),
                                    amount: valorMulta
                                }
                            ]
                        };

                        // Adiciona payment_profile_id se o usuário tiver cartão cadastrado
                        if (user.PaymentProfileId) {
                            billData.payment_profile_id = user.PaymentProfileId;
                        }

                        const bill = await VindiService.createBill(billData);

                        // Grava a multa no Financeiro com o PlanoAssinaturaId do plano cancelado
                        if (bill && bill.id) {
                            // Data de vencimento = data de pagamento (data atual)
                            const dataVencimento = new Date();

                            // Cria a Fatura para a multa com tipo correto
                            const faturaMulta = await prisma.fatura.create({
                                data: {
                                    Valor: valorMulta,
                                    Status: 'Pending',
                                    Tipo: TipoFatura.Multa, // Tipo correto para multa
                                    CustomerId: user.VindiCustomerId ?? "",
                                    UserId: userId,
                                    CodigoFatura: String(bill.id), // Código da fatura da Vindi
                                    DataEmissao: dataVencimento,
                                    DataVencimento: dataVencimento // Data de vencimento = data de pagamento
                                }
                            });

                            // Cria o Financeiro vinculado à Fatura com tipo Multa explicitamente
                            await prisma.financeiro.create({
                                data: {
                                    UserId: userId.toString(),
                                    PlanoAssinaturaId: assinaturaPlanoAtual.PlanoAssinaturaId,
                                    Valor: valorMulta,
                                    DataVencimento: dataVencimento, // Data de vencimento = data de pagamento
                                    Status: ControleFinanceiroStatus.AguardandoPagamento,
                                    Tipo: TipoFatura.Multa, // Tipo explícito: Multa
                                    FaturaId: faturaMulta.Id // Vincula à Fatura criada
                                }
                            });

                            multaGerada = true;
                            console.log(`[UpgradePlano] Multa criada: FaturaId=${faturaMulta.Id}, Tipo=${TipoFatura.Multa}, CodigoFatura=${bill.id}`);
                        }
                    } catch (err) {
                        console.error("Erro ao gerar fatura de multa na Vindi:", err);
                    }
                } else {
                    console.warn("Usuário não possui VindiCustomerId, não foi possível gerar fatura de multa na Vindi");
                }

                console.log(`[UpgradePlano] Multa de R$ ${valorMulta.toFixed(2)} gerada. Prosseguindo com upgrade...`);
                // ✅ NÃO retorna aqui - continua com o upgrade!
            }

            // Busca o novo plano
            const novoPlanoId = req.body.novoPlanoId || req.body.planoId;
            if (!novoPlanoId) {
                return res.status(400).json({ message: "Novo plano não informado" });
            }

            const novoPlano = await this.buscarPlano(novoPlanoId);
            if (!novoPlano || novoPlano.Status !== "ativo") {
                return res.status(404).json({ message: "Novo plano não encontrado ou inativo" });
            }

            // Busca o usuário para obter os dados necessários
            const user = await this.buscarUsuario(userId);
            if (!user) {
                return res.status(404).json({ message: "Usuário não encontrado" });
            }

            // Zera e cancela todos os ciclos ativos do plano atual antes de cancelar
            await prisma.cicloPlano.updateMany({
                where: {
                    AssinaturaPlanoId: assinaturaPlanoAtualId,
                    Status: "Ativo"
                },
                data: {
                    Status: "Cancelado",
                    ConsultasDisponiveis: 0,
                    ConsultasUsadas: 0
                }
            });

            console.log(`[UpgradePlano] Ciclos antigos zerados e cancelados para assinatura ${assinaturaPlanoAtualId}`);

            // Cancela a assinatura na Vindi ANTES de cancelar no banco
            const vindiSubscriptionId = assinaturaPlanoAtual.VindiSubscriptionId;
            if (vindiSubscriptionId) {
                try {
                    console.log(`[UpgradePlano] Cancelando assinatura na Vindi: ${vindiSubscriptionId}`);
                    await VindiService.deleteSubscription(vindiSubscriptionId);
                    console.log(`[UpgradePlano] Assinatura ${vindiSubscriptionId} cancelada com sucesso na Vindi`);
                } catch (err) {
                    console.error(`[UpgradePlano] Erro ao cancelar assinatura na Vindi:`, err);
                    // Continua o processo mesmo se falhar o cancelamento na Vindi
                    // Mas loga o erro para investigação
                }
            } else {
                console.warn(`[UpgradePlano] Assinatura não possui VindiSubscriptionId, pulando cancelamento na Vindi`);
            }

            // Cancela a assinatura atual no banco de dados
            await prisma.assinaturaPlano.update({
                where: { Id: assinaturaPlanoAtualId },
                data: { Status: "Cancelado", DataFim: new Date() },
            });

            console.log(`[UpgradePlano] Criando nova assinatura na Vindi com plano: ${novoPlano.Id} (${novoPlano.Nome})`);
            console.log(`[UpgradePlano] VindiPlanId: ${novoPlano.VindiPlanId}, ProductId: ${novoPlano.ProductId}`);
            console.log(`[UpgradePlano] User PaymentProfileId: ${user.PaymentProfileId}, VindiCustomerId: ${user.VindiCustomerId}`);

            // Calcula a data futura para início da nova assinatura (1 mês após a data de contratação atual)
            const dataContratacao = dayjs(assinaturaPlanoAtual.DataInicio).tz('America/Sao_Paulo');
            const dataInicioFutura = dataContratacao.add(1, 'month').startOf('day').toDate();
            const startAtISO = dayjs(dataInicioFutura).tz('America/Sao_Paulo').toISOString();

            console.log(`[UpgradePlano] Data de contratação atual: ${dataContratacao.format('YYYY-MM-DD')}`);
            console.log(`[UpgradePlano] Nova assinatura será agendada para: ${dayjs(dataInicioFutura).format('YYYY-MM-DD')}`);

            // Calcula o desconto proporcional baseado nos dias restantes do ciclo atual
            const valorPlanoAtual = assinaturaPlanoAtual.PlanoAssinatura?.Preco || 0;
            const valorNovoPlano = novoPlano.Preco || 0;

            // Busca o ciclo ativo mais recente
            const cicloAtivo = assinaturaPlanoAtual.Ciclos && assinaturaPlanoAtual.Ciclos.length > 0
                ? assinaturaPlanoAtual.Ciclos[0]
                : null;

            // Calcula desconto proporcional apenas se for upgrade (novo plano > plano atual)
            let valorDesconto = 0;
            if (valorNovoPlano > valorPlanoAtual && cicloAtivo) {
                // Calcula o valor proporcional dos dias restantes do ciclo atual
                valorDesconto = this.calcularDescontoProporcionalCiclo(valorPlanoAtual, {
                    CicloInicio: cicloAtivo.CicloInicio,
                    CicloFim: cicloAtivo.CicloFim
                });
            }

            console.log(`[UpgradePlano] Valor do plano atual: R$ ${valorPlanoAtual.toFixed(2)}`);
            console.log(`[UpgradePlano] Valor do novo plano: R$ ${valorNovoPlano.toFixed(2)}`);
            console.log(`[UpgradePlano] Valor do desconto proporcional: R$ ${valorDesconto.toFixed(2)}`);

            // Cria a compra do produto de desconto antes de criar a assinatura (apenas se houver desconto)
            let billDescontoId: string | null = null;
            if (valorDesconto > 0 && user.VindiCustomerId && user.PaymentProfileId) {
                try {
                    billDescontoId = await this.criarCompraProdutoDesconto({
                        vindiCustomerId: user.VindiCustomerId,
                        paymentProfileId: user.PaymentProfileId,
                        valorDesconto: valorDesconto
                    });
                    if (billDescontoId) {
                        console.log(`[UpgradePlano] Bill de desconto criado: ${billDescontoId}`);

                        // Cria um registro Financeiro para o desconto (para aparecer no histórico)
                        try {
                            const faturaDesconto = await this.criarFatura(
                                valorDesconto,
                                user.VindiCustomerId,
                                userId,
                                billDescontoId
                            );

                            await this.criarFinanceiro(
                                userId,
                                novoPlano.Id,
                                valorDesconto,
                                new Date(),
                                faturaDesconto?.Id ?? null,
                                TipoFatura.Plano // Usa tipo Plano para desconto aparecer junto
                            );

                            console.log(`[UpgradePlano] Financeiro de desconto criado para histórico`);
                        } catch (err) {
                            console.error(`[UpgradePlano] Erro ao criar financeiro de desconto:`, err);
                            // Continua mesmo se falhar
                        }
                    }
                } catch (err) {
                    console.error(`[UpgradePlano] Erro ao criar bill de desconto:`, err);
                    // Continua mesmo se falhar a criação do bill de desconto
                }
            } else if (valorDesconto === 0) {
                console.log(`[UpgradePlano] Nenhum desconto aplicável (não é upgrade ou não há ciclo ativo)`);
            }

            // Cria nova assinatura para troca de plano (agendada para data futura)
            // Usa o cartão já cadastrado na Vindi (PaymentProfileId)
            let novaAssinatura;
            try {
                novaAssinatura = await this.criarNovaAssinaturaParaTroca({
                    userId,
                    novoPlano,
                    user,
                    vindiCustomerId: user.VindiCustomerId || "",
                    paymentProfileId: user.PaymentProfileId || "",
                    gatewayToken: user.PaymentToken || "",
                    paymentCompanyCode: "",
                    startAt: startAtISO, // Data futura para início da assinatura na Vindi
                    dataInicioFutura: dataInicioFutura // Data futura para início da assinatura no banco
                });
            } catch (error: unknown) {
                console.error(`[UpgradePlano] Erro ao criar nova assinatura para troca:`, error);
                // Se for erro de conexão do Prisma, tenta novamente após um delay
                const err = error as { message?: string };
                if (err.message?.includes('Connection terminated') || err.message?.includes('Connection terminated unexpectedly')) {
                    console.log(`[UpgradePlano] Tentando novamente após erro de conexão...`);
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Aguarda 2 segundos
                    try {
                        novaAssinatura = await this.criarNovaAssinaturaParaTroca({
                            userId,
                            novoPlano,
                            user,
                            vindiCustomerId: user.VindiCustomerId || "",
                            paymentProfileId: user.PaymentProfileId || "",
                            gatewayToken: user.PaymentToken || "",
                            paymentCompanyCode: "",
                            startAt: startAtISO,
                            dataInicioFutura: dataInicioFutura
                        });
                    } catch (retryError: any) {
                        console.error(`[UpgradePlano] Erro na segunda tentativa:`, retryError);
                        return res.status(500).json({
                            message: "Erro de conexão com o banco de dados. Por favor, tente novamente em alguns instantes."
                        });
                    }
                } else {
                    const err = error as { message?: string };
                    return res.status(500).json({
                        message: err.message || "Erro ao criar nova assinatura. Verifique os logs para mais detalhes."
                    });
                }
            }

            if (!novaAssinatura) {
                console.error(`[UpgradePlano] Falha ao criar nova assinatura para troca`);
                return res.status(500).json({
                    message: "Erro ao criar nova assinatura na Vindi. Verifique os logs para mais detalhes."
                });
            }

            console.log(`[UpgradePlano] Nova assinatura criada com sucesso: ${novaAssinatura.Id}, VindiSubscriptionId: ${novaAssinatura.VindiSubscriptionId}`);

            // Grava a movimentação de upgrade no Financeiro
            if (novaAssinatura) {
                const dataVencimento = new Date();
                dataVencimento.setDate(dataVencimento.getDate() + 7);

                try {
                    await this.criarFinanceiro(
                        userId,
                        novoPlano.Id,
                        novoPlano.Preco || 0,
                        dataVencimento,
                        null,
                        TipoFatura.Upgrade
                    );
                } catch (err) {
                    console.error("Erro ao gravar upgrade no Financeiro:", err);
                }
            }

            // Monta resposta melhorada para upgrade
            const respostaMelhorada = {
                assinaturaPlano: novaAssinatura,
                valorDesconto: valorDesconto > 0 ? valorDesconto : undefined, // Inclui valor do desconto se aplicável
                message: multaGerada
                    ? `Plano atualizado com sucesso! Uma multa de R$ ${valorMulta.toFixed(2)} foi cobrada automaticamente. Seu novo plano já está ativo.`
                    : valorDesconto > 0
                        ? `Plano atualizado com sucesso! Um desconto de R$ ${valorDesconto.toFixed(2)} foi aplicado. Seu novo plano já está ativo.`
                        : `Plano atualizado com sucesso! Seu novo plano já está ativo. Verifique em "Meus Planos" para confirmar.`
            };

            return CompraPlanoService.responseFromPayload(res, respostaMelhorada);

        } catch (error) {
            console.error("Erro ao realizar upgrade de plano:", error);
            return res.status(500).json({ message: "Erro ao realizar upgrade de plano" });
        }
    }

    async getPlanosPaciente(
        req: Request,
        res: Response
    ): Promise<Response> {
        try {
            const order = ["mensal", "trimestral", "semestral"];

            const planos = await prisma.planoAssinatura.findMany({
                where: { Status: "ativo" },
            });

            planos.sort((a, b) => {
                const tipoA = (a.Tipo || "").toLowerCase();
                const tipoB = (b.Tipo || "").toLowerCase();
                const idxA = order.indexOf(tipoA);
                const idxB = order.indexOf(tipoB);
                return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
            });

            return res.status(200).json(planos);
        } catch (error) {
            console.error("Erro ao buscar planos do paciente:", error);
            return res.status(500).json({ message: "Erro interno no servidor", error: (error as Error).message });
        }
    }

    // Método para avisar sobre renovação automática e atualizar ultimaRenovacao
    async avisoRenovacao(): Promise<void> {
        const hoje = new Date();
        const dezDiasDepois = new Date();
        dezDiasDepois.setDate(hoje.getDate() + 10);

        // Busca planos que vão expirar em 10 dias
        const planosParaAviso = await prisma.assinaturaPlano.findMany({
            where: {
                Status: "Ativo",
                DataFim: {
                    gte: hoje,
                    lte: dezDiasDepois
                }
            },
            include: {
                PlanoAssinatura: true,
                User: true
            }
        });

        for (const planoCompra of planosParaAviso) {
            try {
                await emailService.sendPlanoRenovacaoAvisoEmail(
                    planoCompra.User,
                    planoCompra.PlanoAssinatura,
                    planoCompra.DataFim ?? new Date()
                );
            } catch (err) {
                console.error("Erro ao enviar aviso de renovação:", err);
            }
        }

        // Busca planos que expiram hoje para renovar
        const planosParaRenovar = await prisma.assinaturaPlano.findMany({
            where: {
                Status: "Ativo",
                DataFim: {
                    gte: new Date(hoje.setHours(0, 0, 0, 0)),
                    lte: new Date(hoje.setHours(23, 59, 59, 999))
                }
            },
            include: {
                PlanoAssinatura: true
            }
        });

        for (const planoCompra of planosParaRenovar) {
            try {
                // Marca o plano atual como Expirado
                await prisma.assinaturaPlano.update({
                    where: { Id: planoCompra.Id },
                    data: { Status: "Expirado" }
                });

                // Cria novo registro de assinatura com datas atualizadas no fuso horário de Brasília
                const novaDataInicio = dayjs().tz('America/Sao_Paulo').startOf('day').toDate();
                const duracaoRenovacao = planoCompra.PlanoAssinatura?.Duracao || 30;
                const novaDataFim = dayjs(novaDataInicio).tz('America/Sao_Paulo').add(duracaoRenovacao, 'day').endOf('day').toDate();

                await prisma.assinaturaPlano.create({
                    data: {
                        UserId: planoCompra.UserId,
                        PlanoAssinaturaId: planoCompra.PlanoAssinaturaId,
                        DataInicio: novaDataInicio,
                        DataFim: novaDataFim,
                        Status: ControleFinanceiroStatus.AguardandoPagamento,
                    }
                });
            } catch (err) {
                console.error("Erro ao renovar assinatura de plano:", err);
            }
        }
    }

    private montarVindiAddress(address: EnderecoInput | Prisma.AddressGetPayload<{}> | null | undefined): VindiAddress | undefined {
        if (!address) return undefined;

        // Aceita tanto payload quanto objeto do banco
        const rua = 'Rua' in address ? (address.Rua ?? '') : '';
        const numero = 'Numero' in address ? (address.Numero ?? '') : '';
        const complemento = 'Complemento' in address ? (address.Complemento ?? null) : null;
        const cep = 'Cep' in address ? (address.Cep ?? '') : '';
        const bairro = 'Bairro' in address ? (address.Bairro ?? '') : '';
        const cidade = 'Cidade' in address ? (address.Cidade ?? '') : '';
        const estado = 'Estado' in address ? (address.Estado ?? '') : '';

        const result: VindiAddress = {
            street: rua,
            number: numero,
            zipcode: cep,
            neighborhood: bairro,
            city: cidade,
            state: estado,
            country: 'BR'
        };

        if (complemento) {
            result.additional_details = complemento;
        }

        return result;
    }

    private montarPhonesVindi(user: { Telefone?: string | null }): VindiPhone[] {
        return [
            {
                phone_type: 'mobile',
                number: user?.Telefone ?? '',
            }
        ];
    }

    private async atualizarEnderecoCustomerVindi(user: UserWithAddress): Promise<unknown> {
        const vindiAddress = this.montarVindiAddress(user.Address.length > 0 ? user.Address[0] : null);
        const phones = this.montarPhonesVindi(user);

        return await VindiService.updateCustomer(
            user.VindiCustomerId ?? '',
            {
                name: user.Nome,
                email: user.Email,
                registry_code: user.Cpf,
                code: String(user.Id),
                notes: '',
                metadata: {},
                address: vindiAddress,
                phones: phones
            }
        );
    }

    static responseFromPayload(res: Response, payload: CompraPlanoResponse): Response {
        if ('error' in payload && payload.error) {
            const status = payload.message?.toLowerCase().includes('não encontrado') ? 404 : 400;
            return res.status(status).json(payload);
        }
        return res.status(201).json(payload);
    }

    private normalizarEndereco(enderecoInput?: EnderecoInput | EnderecoInputArray | Prisma.AddressGetPayload<{}>[]): EnderecoNormalizado {
        // Se for array do Prisma, pega o primeiro
        if (Array.isArray(enderecoInput) && enderecoInput.length > 0) {
            const first = enderecoInput[0];
            // Se for do tipo Prisma Address
            if ('Rua' in first && typeof first.Rua === 'string') {
                return {
                    Rua: first.Rua ?? '',
                    Numero: first.Numero ?? '',
                    Complemento: first.Complemento ?? '',
                    Cep: first.Cep ?? '',
                    Bairro: first.Bairro ?? '',
                    Cidade: first.Cidade ?? '',
                    Estado: first.Estado ?? ''
                };
            }
            // Se for EnderecoInput
            return {
                Rua: first.Rua ?? '',
                Numero: first.Numero ?? '',
                Complemento: first.Complemento ?? '',
                Cep: first.Cep ?? '',
                Bairro: first.Bairro ?? '',
                Cidade: first.Cidade ?? '',
                Estado: first.Estado ?? ''
            };
        }
        // Se for EnderecoInput único
        if (enderecoInput && !Array.isArray(enderecoInput)) {
            return {
                Rua: enderecoInput.Rua ?? '',
                Numero: enderecoInput.Numero ?? '',
                Complemento: enderecoInput.Complemento ?? '',
                Cep: enderecoInput.Cep ?? '',
                Bairro: enderecoInput.Bairro ?? '',
                Cidade: enderecoInput.Cidade ?? '',
                Estado: enderecoInput.Estado ?? ''
            };
        }
        return {
            Rua: '',
            Numero: '',
            Complemento: '',
            Cep: '',
            Bairro: '',
            Cidade: '',
            Estado: ''
        };
    }

    private async sincronizarCustomerVindi(user: UserWithAddress, endereco: EnderecoNormalizado): Promise<string> {
        let vindiCustomerId = user.VindiCustomerId;
        if (!vindiCustomerId) {
            try {
                const novoCustomer = await VindiService.createCustomer({
                    name: user.Nome,
                    email: user.Email,
                    registry_code: user.Cpf,
                    code: String(user.Id),
                    notes: '',
                    metadata: {},
                    address: {
                        street: endereco.Rua,
                        number: endereco.Numero,
                        additional_details: endereco.Complemento,
                        zipcode: endereco.Cep,
                        neighborhood: endereco.Bairro,
                        city: endereco.Cidade,
                        state: endereco.Estado,
                        country: 'BR'
                    },
                    phones: user.Telefone
                        ? [{
                            phone_type: "mobile",
                            number: user.Telefone.replace(/\D/g, '').length === 11
                                ? `55${user.Telefone.replace(/\D/g, '')}`
                                : user.Telefone.replace(/\D/g, ''),
                            extension: ""
                        }]
                        : []
                });
                vindiCustomerId = String(novoCustomer.id);
                await prisma.user.update({
                    where: { Id: user.Id },
                    data: { VindiCustomerId: vindiCustomerId }
                });
            } catch (err) {
                console.error('Erro ao criar customer na Vindi:', err);
                throw err;
            }
        } else {
            try {
                await VindiService.updateCustomer(vindiCustomerId, {
                    name: user.Nome,
                    email: user.Email,
                    registry_code: user.Cpf,
                    code: String(user.Id),
                    notes: '',
                    metadata: {},
                    address: {
                        street: endereco.Rua,
                        number: endereco.Numero,
                        additional_details: endereco.Complemento,
                        zipcode: endereco.Cep,
                        neighborhood: endereco.Bairro,
                        city: endereco.Cidade,
                        state: endereco.Estado,
                        country: 'BR'
                    },
                    phones: user.Telefone
                        ? [{
                            phone_type: "mobile",
                            number: user.Telefone.replace(/\D/g, '').length === 11
                                ? `55${user.Telefone.replace(/\D/g, '')}`
                                : user.Telefone.replace(/\D/g, ''),
                            extension: ""
                        }]
                        : []
                });
            } catch (err) {
                console.error('Erro ao atualizar customer na Vindi:', err);
                throw err;
            }
        }
        try {
            // Atualiza usando o endereço do user (já está no banco)
            await this.atualizarEnderecoCustomerVindi(user);
        } catch (err) {
            console.error('Erro ao atualizar endereço/telefone na Vindi:', err);
            throw err;
        }
        return vindiCustomerId;
    }
}