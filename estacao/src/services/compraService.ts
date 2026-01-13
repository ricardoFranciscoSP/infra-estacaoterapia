import { toast } from 'react-hot-toast';
import { clearSensitiveState } from '@/utils/securePayment';
import { marcarCompraEfetivada } from '@/utils/primeiraCompraStorage';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type React from 'react';
import type { CardFormType } from '@/app/(painel)/painel/comprar-consulta/[id]/comprarConsultaBusiness';
import type { Planos } from '@/types/planosVendaTypes';
import type { UserDetails } from '@/hooks/user/userHook';
import type { PrimeiraCompraDTO } from '@/hooks/primeiraConsultaHook';
import type { AddressData } from '@/store/api/addressStore';

type PaymentCompanyInfo = {
    payment_company_code: string;
    payment_company_id: number | string;
};

type MutationCallbacks<TData = unknown, TError = unknown> = {
    onSuccess?: (data?: TData) => void;
    onError?: (error: TError) => void;
};

type AddressMutation = (
    data: AddressData,
    callbacks?: MutationCallbacks<unknown, ApiError>
) => void;

type PrimeiraCompraMutation = (
    data: PrimeiraCompraDTO,
    callbacks?: MutationCallbacks<unknown, ApiError>
) => void;

type SetMainFormType = React.Dispatch<React.SetStateAction<CardFormType>>;

type ApiError = {
    response?: {
        data?: {
            errors?: Array<{
                parameter?: string;
                message: string;
            }>;
            message?: string;
            error?: string;
        } | string;
    };
    message?: string;
};

type ErrorData = {
    message?: string;
    error?: string;
    errors?: Array<{
        parameter?: string;
        message: string;
    }>;
};

type TipoFaturaValue = 'Plano' | 'ConsultaAvulsa' | 'PrimeiraConsulta';

export interface CompraParams {
    user: UserDetails | null | undefined;
    mainForm: CardFormType;
    planosTyped: Planos | undefined;
    isPrimeiraCompra: boolean;
    quantity: number;
    getValorTotal: () => number;
    getCardLogo: () => string;
    getLast4Digits: (numero: string) => string;
    getPaymentCompanyInfo: (numeroCartao: string) => PaymentCompanyInfo;
    salvarEndereco: AddressMutation;
    realizarPrimeiraCompra: PrimeiraCompraMutation;
    setLoading: (b: boolean) => void;
    setShowModal: (b: boolean) => void;
    setMainForm: SetMainFormType;
    router: AppRouterInstance;
    rua: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
    isAddressValid: boolean;
}

export function processarCompraCartao(params: CompraParams) {
    const {
        user,
        mainForm,
        planosTyped,
        isPrimeiraCompra,
        quantity,
        getValorTotal,
        getCardLogo,
        getLast4Digits,
        getPaymentCompanyInfo,
        salvarEndereco,
        realizarPrimeiraCompra,
        setLoading,
        setShowModal,
        setMainForm,
        router,
        rua,
        numero,
        complemento,
        bairro,
        cidade,
        estado,
        cep,
        isAddressValid,
    } = params;

    if (!user?.Id) {
        toast.error('Usuário não carregado. Faça login novamente ou recarregue a página.');
        setLoading(false);
        setTimeout(() => setShowModal(false), 1500);
        return;
    }

    if (!isAddressValid) {
        toast.error('Por favor, preencha todos os campos obrigatórios do endereço.');
        setLoading(false);
        setTimeout(() => setShowModal(false), 1500);
        return;
    }

    // Validação rigorosa dos campos do cartão antes de processar
    if (!mainForm.numeroCartao || !mainForm.numeroCartao.trim()) {
        toast.error('Número do cartão é obrigatório.');
        setLoading(false);
        setTimeout(() => setShowModal(false), 1500);
        return;
    }
    if (!mainForm.nomeTitular || !mainForm.nomeTitular.trim()) {
        toast.error('Nome do titular é obrigatório.');
        setLoading(false);
        setTimeout(() => setShowModal(false), 1500);
        return;
    }
    if (!mainForm.validade || !mainForm.validade.trim()) {
        toast.error('Validade do cartão é obrigatória.');
        setLoading(false);
        setTimeout(() => setShowModal(false), 1500);
        return;
    }
    if (!mainForm.cvv || !mainForm.cvv.trim()) {
        toast.error('CVV do cartão é obrigatório.');
        setLoading(false);
        setTimeout(() => setShowModal(false), 1500);
        return;
    }

    setLoading(true);
    salvarEndereco(
        {
            userId: String(user.Id),
            street: rua,
            number: numero,
            complement: complemento ?? undefined,
            neighborhood: bairro,
            city: cidade,
            state: estado,
            zipCode: cep,
            type: 'billing',
        },
        {
            onSuccess: () => {
                const paymentInfo = getPaymentCompanyInfo(mainForm.numeroCartao);
                const quantidadeFinal = isPrimeiraCompra ? 1 : (quantity === 0 ? 1 : quantity);
                const valorTotal = getValorTotal();

                // Gera código de fatura único baseado em timestamp
                const codigoFatura = `CONS-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
                const dataAtual = new Date();
                const dataVencimento = new Date(dataAtual);
                dataVencimento.setDate(dataVencimento.getDate() + 3); // 3 dias para vencer

                // CORREÇÃO: Determina o tipo correto baseado no Tipo do plano
                // Mapeia: Unica -> PrimeiraConsulta, Avulsa -> ConsultaAvulsa
                let tipoFatura: TipoFaturaValue = 'ConsultaAvulsa';
                const tipoPlano = planosTyped?.Tipo?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

                if (tipoPlano === 'unica' || tipoPlano === 'primeiraconsulta') {
                    tipoFatura = 'PrimeiraConsulta';
                } else if (tipoPlano === 'avulsa' || tipoPlano === 'consultaavulsa') {
                    tipoFatura = 'ConsultaAvulsa';
                } else if (tipoPlano === 'plano' || tipoPlano === 'mensal' || tipoPlano === 'trimestral' || tipoPlano === 'semestral') {
                    tipoFatura = 'Plano';
                }

                console.log('[CompraService] Tipo determinado para fatura:', {
                    tipoPlano: planosTyped?.Tipo,
                    tipoFatura,
                    isPrimeiraCompra,
                    planoId: planosTyped?.ProductId
                });

                realizarPrimeiraCompra(
                    {
                        userId: user.Id,
                        planoId: planosTyped?.ProductId ?? '',
                        vindiProductId: planosTyped?.VindiPlanId ?? '',
                        quantidade: quantidadeFinal,
                        valor: valorTotal,
                        endereco: {
                            cep,
                            rua,
                            numero,
                            complemento: complemento ?? undefined,
                            bairro,
                            cidade,
                            estado,
                        },
                        cartao: {
                            numeroCartao: mainForm.numeroCartao,
                            nomeTitular: mainForm.nomeTitular,
                            validade: mainForm.validade,
                            cvv: mainForm.cvv,
                            bandeira: getCardLogo(),
                            last4: getLast4Digits(mainForm.numeroCartao),
                            payment_company_code: paymentInfo.payment_company_code,
                            payment_company_id: typeof paymentInfo.payment_company_id === 'number' ? paymentInfo.payment_company_id : null,
                            payment_method_code: 'credit_card',
                        },
                        controleFatura: {
                            CodigoFatura: codigoFatura,
                            Valor: valorTotal,
                            Status: 'Pending' as const, // FaturaStatus.Pending
                            DataEmissao: dataAtual,
                            DataVencimento: dataVencimento,
                            Tipo: tipoFatura, // Usa tipo correto determinado acima
                            vindiProductId: planosTyped?.ProductId ?? '' // ProductId é o ID do produto na Vindi
                        }
                    },
                    {
                        onSuccess: (response: unknown) => {
                            setLoading(false);
                            clearSensitiveState(setMainForm);

                            // Marca compra como efetivada e limpa dados temporários
                            if (isPrimeiraCompra) {
                                marcarCompraEfetivada();
                            }

                            // Extrair transactionId da resposta
                            const transactionId = (response as { transactionId?: string })?.transactionId;
                            const successMessage = transactionId
                                ? 'Pagamento realizado com sucesso! Aguarde a ativação de seu saldo.'
                                : 'Pagamento realizado com sucesso! Aguarde a ativação de seu saldo.';

                            toast.success(successMessage);
                            setTimeout(() => {
                                setShowModal(false);
                                // Se temos transactionId, redirecionar com polling
                                if (transactionId) {
                                    router.push(`/painel/success?transactionId=${transactionId}`);
                                } else {
                                    // Fallback para caso antigo (sem transactionId)
                                    router.push('/painel/success');
                                }
                            }, 1200);
                        },
                        onError: (error: ApiError) => {
                            setLoading(false);

                            // Tenta extrair mensagem de erro de várias fontes
                            let msg = 'Ocorreu um erro ao processar sua compra.';

                            // Tenta pegar do response.data primeiro
                            if (error?.response?.data) {
                                const data = error.response.data;

                                // Se for string, usa diretamente
                                if (typeof data === 'string') {
                                    msg = data;
                                }
                                // Se for objeto, tenta várias propriedades
                                else if (typeof data === 'object' && data !== null) {
                                    const errorData = data as ErrorData;
                                    msg = errorData.message
                                        || errorData.error
                                        || errorData.errors?.[0]?.message
                                        || (Array.isArray(errorData.errors) && errorData.errors.length > 0
                                            ? errorData.errors.map((e) => `${e.parameter ? e.parameter + ': ' : ''}${e.message}`).join(' | ')
                                            : null)
                                        || msg;
                                }
                            }

                            // Fallback para error.message
                            if (msg === 'Ocorreu um erro ao processar sua compra.' && error?.message) {
                                msg = error.message;
                            }

                            toast.error(msg || 'Erro ao processar o pagamento. Verifique os dados e tente novamente.', {
                                duration: 5000,
                            });
                            clearSensitiveState(setMainForm);

                            // Salva a URL de origem antes de redirecionar
                            const checkoutUrl = window.location.pathname;
                            sessionStorage.setItem('checkoutErrorOrigin', checkoutUrl);

                            setTimeout(() => {
                                setShowModal(false);
                                router.push('/painel/error');
                            }, 2200);
                        },
                    }
                );
            },
            onError: (error: ApiError) => {
                setLoading(false);

                // Tenta extrair mensagem de erro de várias fontes
                let errorMsg = 'Erro ao salvar endereço. Verifique os dados e tente novamente.';

                if (error?.response?.data) {
                    const data = error.response.data;

                    if (typeof data === 'string') {
                        errorMsg = data;
                    } else if (typeof data === 'object' && data !== null) {
                        const errorData = data as ErrorData;
                        errorMsg = errorData.message
                            || errorData.error
                            || (Array.isArray(errorData.errors) && errorData.errors.length > 0
                                ? errorData.errors.map((e) => `${e.parameter ? e.parameter + ': ' : ''}${e.message}`).join(' | ')
                                : null)
                            || errorMsg;
                    }
                }

                if (errorMsg === 'Erro ao salvar endereço. Verifique os dados e tente novamente.' && error?.message) {
                    errorMsg = error.message;
                }

                toast.error(errorMsg, {
                    duration: 4000,
                });
                setTimeout(() => setShowModal(false), 1800);
            },
        }
    );
}

export function processarCompraPix({ setShowModal, router, valor }: { setShowModal: (b: boolean) => void; router: AppRouterInstance; valor?: number }) {
    toast.success('Pagamento via Pix iniciado! Redirecionando...');
    setTimeout(() => {
        setShowModal(false);
        const valorParam = valor ? `?valor=${valor.toFixed(2).replace('.', ',')}` : '';
        router.push(`/painel/pix${valorParam}`);
    }, 1800);
}
