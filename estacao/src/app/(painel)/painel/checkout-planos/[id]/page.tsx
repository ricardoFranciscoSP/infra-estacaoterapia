"use client";

import ResumoCompraModal from "@/components/ResumoCompraModal";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUserMe, useUpdateUser, usePreviaContrato, useEnvioContrato, useGetUserPlano } from '@/hooks/user/userHook';
import { useCreateOrUpdateAddress } from '@/hooks/user/addressHook';
import { usePlanoById } from '@/hooks/planosHook';
import AddressModal from '@/components/AddressModal';
import AddressForm from '@/components/AddressForm';
import CartaoExemplo from "@/components/CartaoExemplo";
import BreadcrumbsVoltar from "@/components/BreadcrumbsVoltar";
import Image from "next/image";
import toast from 'react-hot-toast';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useComprarPlano } from "@/hooks/paciente/planoPaciente";

// Importa toda regra de negócio do novo arquivo
import {maskCreditCard, checkoutSchema, CheckoutFormType, isAddressComplete,  gerarObjetoPagamento } from "./checkoutBusiness";
import { maskCardExpiry } from "@/utils/validation";
import { handleCepBlur } from "@/utils/cepUtils";
import { getCardLogo} from "@/utils/checkoutUtils";
import { Plano } from "@/store/planoStore";
import { clearSensitiveForm } from "@/utils/securePayment";
import ModalContrato from "@/components/ModalContrato"; 

export default function CheckoutPlanosPage() {
    const { user } = useUserMe();
    const { mutate: updateUser, isPending: isUpdatingUser } = useUpdateUser();
    const { mutate: salvarEndereco } = useCreateOrUpdateAddress();
    const params = useParams();
    const router = useRouter();
    const rawId = params?.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const { planos, isLoading: loading } = usePlanoById(id ?? "");
    const plano = planos as Plano | undefined;
    const { plano: userPlano } = useGetUserPlano();
    const [modalContratoOpen, setModalContratoOpen] = useState(false);
    const [showResumoModal, setShowResumoModal] = useState<boolean>(false);
    
    // Verifica se o usuário já tem um plano ativo
    const planoAtivo = Array.isArray(userPlano) 
        ? userPlano.find((p: { Status: string }) => p.Status === 'Ativo' || p.Status === 'AguardandoPagamento')
        : null;

    // react-hook-form
    const {
        register,
        handleSubmit,
        setValue,
        getValues,
        watch,
        trigger, // ADICIONADO
        formState: { errors, isValid },
    } = useForm<CheckoutFormType>({
        resolver: zodResolver(checkoutSchema),
        mode: "all",
        defaultValues: {
            numeroCartao: "",
            nomeTitular: "",
            validade: "",
            cvv: "",
            cep: "",
            endereco: "",
            numero: "",
            complemento: "",
            bairro: "",
            cidade: "",
            estado: "",
        }
    });

    // Atualização em tempo real do cartão de exemplo
    const watchedFields = watch();
    const [isCardFlipped, setIsCardFlipped] = useState(false);
    const [addressCheckboxChecked, setAddressCheckboxChecked] = useState(false);
    const [contractAccepted, setContractAccepted] = useState(false);
    const [quantity, setQuantity] = useState(1);
   
    type Address = {
        cep: string;
        endereco: string;
        numero: string;
        complemento: string; 
        bairro: string;
        cidade: string;
        estado: string;
    };

    const [userAddress, setUserAddress] = useState<Address>({
        cep: "",
        endereco: "",
        numero: "",
        complemento: "", // sempre string
        bairro: "",
        cidade: "",
        estado: "",
    });
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [addressTouched, setAddressTouched] = useState(false);

    // Hook para obter a prévia do contrato (sempre chamado)
    const { data: previaContratoData, isLoading: isLoadingPrevContrato, refetch } = usePreviaContrato(planos as Plano);

    // Função para submeter os dados do pagamento e contrato usando o fluxo do checkoutBusiness
    const comprarPlanoMutation = useComprarPlano();
    const { mutate: enviarContrato } = useEnvioContrato();

    // Estado para rastrear campos que foram tocados
    const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

    // Register para campos que precisam de handlers customizados
    const numeroCartaoRegister = register("numeroCartao", {
        onBlur: () => {
            setTouchedFields((prev) => ({ ...prev, numeroCartao: true }));
            trigger("numeroCartao");
        }
    });
    
    const nomeTitularRegister = register("nomeTitular", {
        onBlur: () => {
            setTouchedFields((prev) => ({ ...prev, nomeTitular: true }));
            trigger("nomeTitular");
        }
    });
    
    const validadeRegister = register("validade", {
        onBlur: () => {
            setTouchedFields((prev) => ({ ...prev, validade: true }));
            trigger("validade");
        }
    });

    // Handlers
    const handleMainFormChangeLocal = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        let newValue = value;
        
        // Aplica máscaras e chama o onChange do register correspondente
        if (name === "numeroCartao") {
            newValue = maskCreditCard(value);
            // Cria evento sintético com valor mascarado
            const syntheticEvent = {
                ...e,
                target: { ...e.target, value: newValue }
            } as React.ChangeEvent<HTMLInputElement>;
            // O onChange do register já atualiza o formulário
            if (numeroCartaoRegister.onChange) {
                numeroCartaoRegister.onChange(syntheticEvent);
            }
        } else if (name === "validade") {
            newValue = maskCardExpiry(value);
            // Cria evento sintético com valor mascarado
            const syntheticEvent = {
                ...e,
                target: { ...e.target, value: newValue }
            } as React.ChangeEvent<HTMLInputElement>;
            // O onChange do register já atualiza o formulário
            if (validadeRegister.onChange) {
                validadeRegister.onChange(syntheticEvent);
            }
        } else if (name === "nomeTitular") {
            // O onChange do register já atualiza o formulário
            if (nomeTitularRegister.onChange) {
                nomeTitularRegister.onChange(e);
            }
        }
        
        // Se o campo já foi tocado, valida em tempo real durante a digitação
        if (touchedFields[name]) {
            await trigger(name as keyof CheckoutFormType);
        }
    };

    // Handler para marcar campo como tocado quando ganha foco
    const handleFieldFocus = (fieldName: string) => {
        setTouchedFields((prev) => ({ ...prev, [fieldName]: true }));
    };

    const handleCvvFocusLocal = () => {
        setIsCardFlipped(true);
        handleFieldFocus("cvv");
    };
    
    const cvvRegisterBase = register("cvv");
    
    const handleCvvBlurLocal = async (e: React.FocusEvent<HTMLInputElement>) => {
        setIsCardFlipped(false);
        setTouchedFields((prev) => ({ ...prev, cvv: true }));
        // Chama o onBlur do register
        if (cvvRegisterBase.onBlur) {
            cvvRegisterBase.onBlur(e);
        }
        await trigger("cvv");
    };
    
    const handleCvvChangeLocal = async (e: React.ChangeEvent<HTMLInputElement>) => {
        // Remove caracteres não numéricos e limita a 4 dígitos
        const newValue = e.target.value.replace(/\D/g, '').slice(0, 4);
        
        // Cria um novo evento com o valor limpo
        const syntheticEvent = {
            ...e,
            target: {
                ...e.target,
                value: newValue
            }
        } as React.ChangeEvent<HTMLInputElement>;
        
        // O onChange do register já atualiza o formulário
        if (cvvRegisterBase.onChange) {
            cvvRegisterBase.onChange(syntheticEvent);
        }
        
        // Valida em tempo real se o campo já foi tocado
        if (touchedFields.cvv) {
            await trigger("cvv");
        }
    };

    const handleAddressCheckboxLocal = (e?: React.ChangeEvent<HTMLInputElement>) => {
        if (e && !e.target.checked) {
            setValue("cep", "");
            setValue("endereco", "");
            setValue("numero", "");
            setValue("complemento", "");
            setValue("bairro", "");
            setValue("cidade", "");
            setValue("estado", "");
            setAddressCheckboxChecked(false);
            return;
        }

        if (Array.isArray(user?.Address) && user.Address.length > 0) {
            const addr = user.Address[0];
            const formattedAddr: Address = {
                cep: addr.Cep || "",
                endereco: addr.Rua || "",
                numero: addr.Numero || "",
                complemento: addr.Complemento || "",
                bairro: addr.Bairro || "",
                cidade: addr.Cidade || "",
                estado: addr.Estado || "",
            };
            setValue("cep", formattedAddr.cep);
            setValue("endereco", formattedAddr.endereco);
            setValue("numero", formattedAddr.numero);
            setValue("complemento", formattedAddr.complemento);
            setValue("bairro", formattedAddr.bairro);
            setValue("cidade", formattedAddr.cidade);
            setValue("estado", formattedAddr.estado);
            setUserAddress(formattedAddr);
            setAddressCheckboxChecked(true);
        } else if (isAddressComplete(userAddress)) {
            setValue("cep", userAddress.cep);
            setValue("endereco", userAddress.endereco);
            setValue("numero", userAddress.numero);
            setValue("complemento", userAddress.complemento);
            setValue("bairro", userAddress.bairro);
            setValue("cidade", userAddress.cidade);
            setValue("estado", userAddress.estado);
            setAddressCheckboxChecked(true);
        } else {
            setShowAddressModal(true);
            setAddressCheckboxChecked(true);
        }
    };

    const handleCloseAddressModalLocal = () => {
        setShowAddressModal(false);
        setAddressCheckboxChecked(false);
    };

    const handleConcluirCadastroLocal = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setAddressTouched(true);
        if (isAddressComplete(userAddress) && user?.Id) {
            updateUser(
                {
                    id: user.Id,
                    nome: user.Nome,
                    email: user.Email,
                    cpf: user.Cpf || "",
                    telefone: user.Telefone ||  "",
                    status: user.Status,
                    role: user.Role,
                    address: [
                        {
                            cep: userAddress.cep,
                            rua: userAddress.endereco,
                            numero: userAddress.numero,
                            complemento: userAddress.complemento,
                            bairro: userAddress.bairro,
                            cidade: userAddress.cidade,
                            estado: userAddress.estado,
                        }
                    ]
                },
                {
                    onSuccess: () => {
                        setValue("cep", userAddress.cep);
                        setValue("endereco", userAddress.endereco);
                        setValue("numero", userAddress.numero);
                        setValue("complemento", userAddress.complemento);
                        setValue("bairro", userAddress.bairro);
                        setValue("cidade", userAddress.cidade);
                        setValue("estado", userAddress.estado);
                        setShowAddressModal(false);
                        setAddressCheckboxChecked(true);
                    }
                }
            );
        }
    };

    const planDetails = plano
        ? { plan: plano.Nome, price: plano.Preco?.toFixed(2) ?? "0.00" }
        : { plan: "", price: "0.00" };

    // Handler para abrir modal do contrato e buscar prévia
    // Sempre força a abertura do contrato e reseta o aceite
    const handleOpenContratoModal = async () => {
        // Limpa o cache antes de abrir o modal
        sessionStorage.removeItem('contratoAceito');
        sessionStorage.removeItem('contratoAssinaturaImg');
        sessionStorage.removeItem('contratoHtmlAssinado');
        setContractAccepted(false);
        
        if (refetch) await refetch(); 
        setModalContratoOpen(true);
    };

    useEffect(() => {
        if (showAddressModal) {
            document.body.classList.add("overflow-hidden");
        } else {
            document.body.classList.remove("overflow-hidden");
        }
        return () => {
            document.body.classList.remove("overflow-hidden");
        };
    }, [showAddressModal]);

    // Exibe toast para cada erro de validação
    useEffect(() => {
        if (errors && Object.keys(errors).length > 0) {
            Object.values(errors).forEach((err) => {
                if (typeof err === "object" && err && "message" in err && err.message) {
                    toast.error(err.message);
                }
            });
        }
    }, [errors]);

    // Carrega automaticamente o endereço do usuário se existir
    useEffect(() => {
        if (user && Array.isArray(user.Address) && user.Address.length > 0) {
            const addr = user.Address[0];
            const formattedAddr: Address = {
                cep: addr.Cep || "",
                endereco: addr.Rua || "",
                numero: addr.Numero || "",
                complemento: addr.Complemento || "",
                bairro: addr.Bairro || "",
                cidade: addr.Cidade || "",
                estado: addr.Estado || "",
            };
            
            // Preenche o formulário com o endereço do usuário
            setValue("cep", formattedAddr.cep);
            setValue("endereco", formattedAddr.endereco);
            setValue("numero", formattedAddr.numero);
            setValue("complemento", formattedAddr.complemento);
            setValue("bairro", formattedAddr.bairro);
            setValue("cidade", formattedAddr.cidade);
            setValue("estado", formattedAddr.estado);
            
            // Atualiza o estado local do endereço
            setUserAddress(formattedAddr);
            setAddressCheckboxChecked(true);
        }
    }, [user, setValue]);

    // Adicione esta função antes do return do componente
    const handleAddressChangeLocal = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUserAddress(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    // Função para bloquear caracteres especiais
    function blockSpecialChars(e: React.KeyboardEvent<HTMLInputElement>) {
        const allowed = /[0-9]/;
        if (!allowed.test(e.key) && e.key.length === 1) {
            e.preventDefault();
        }
    }

    // Ao montar, limpa o cache do contrato e força novo aceite
    useEffect(() => {
        // Limpa sempre o cache do contrato ao carregar a página
        // Isso garante que o usuário sempre precisa aceitar e assinar novamente
        sessionStorage.removeItem('contratoAceito');
        sessionStorage.removeItem('contratoAssinaturaImg');
        sessionStorage.removeItem('contratoHtmlAssinado');
        setContractAccepted(false);
    }, []);

    // Função para obter IP público do cliente (com fallback)
    const fetchClientIp = async (): Promise<string | null> => {
        try {
            const res = await fetch("https://api.ipify.org?format=json", { cache: "no-store" });
            if (!res.ok) return null;
            const data = await res.json();
            return data.ip ?? null;
        } catch {
            return null;
        }
    };

    // Função para processar a compra (chamada dentro do modal)
    const processarCompra = async (formData: CheckoutFormType) => {
        if (!plano) {
            toast.error("Plano não encontrado.");
            const checkoutUrl = window.location.pathname;
            sessionStorage.setItem('checkoutErrorOrigin', checkoutUrl);
            setTimeout(() => router.push("/painel/error"), 1000);
            return;
        }

        // Verifica se o usuário já tem um plano ativo
        if (planoAtivo) {
            toast.error("Você já possui um plano ativo. Para alterar seu plano, acesse a área de planos.", {
                duration: 5000,
            });
            setTimeout(() => router.push("/painel/minha-conta/meus-planos"), 2000);
            return;
        }

        // Verifica se o endereço está completo
        if (!isAddressComplete({
            cep: formData.cep,
            endereco: formData.endereco,
            numero: formData.numero ?? "",
            complemento: formData.complemento,
            bairro: formData.bairro,
            cidade: formData.cidade,
            estado: formData.estado,
        })) {
            toast.error("Por favor, preencha todos os campos obrigatórios do endereço.");
            return;
        }

        // Salvar/atualizar endereço antes de prosseguir (usa type: 'billing' para salvar na tabela Address quando não houver)
        salvarEndereco(
            {
                userId: user?.Id ?? "",
                street: formData.endereco,
                number: formData.numero ?? "",
                complement: formData.complemento ?? undefined,
                neighborhood: formData.bairro,
                city: formData.cidade,
                state: formData.estado,
                zipCode: formData.cep,
                type: 'billing', // Garante que salva na tabela Address quando não houver endereço
            },
            {
                onSuccess: async () => {
                    try {
                        const contratoAssinaturaImg = sessionStorage.getItem('contratoAssinaturaImg') || "";
                        const planoObj = {
                            ...plano,
                            Preco: typeof plano.Preco === "number" ? plano.Preco.toString() : plano.Preco
                        };

                        const userObj = user
                            ? {
                                VindiCustomerId: user.VindiCustomerId,
                                Address: Array.isArray(user.Address)
                                    ? user.Address.map(addr => ({
                                        cep: addr.Cep,
                                        endereco: addr.Rua,
                                        numero: addr.Numero,
                                        complemento: addr.Complemento ?? "",
                                        bairro: addr.Bairro,
                                        cidade: addr.Cidade,
                                        estado: addr.Estado,
                                    }))
                                    : [],
                            }
                            : { VindiCustomerId: "", Address: [] };

                        const pagamentoObj = await gerarObjetoPagamento({
                            formData,
                            plano: planoObj,
                            user: userObj,
                            getValues
                        });

                        // Gera código de fatura único baseado em timestamp
                        const codigoFatura = `PLANO-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
                        const dataAtual = new Date();
                        const dataVencimento = new Date(dataAtual);
                        dataVencimento.setDate(dataVencimento.getDate() + 3); // 3 dias para vencer
                        
                        // Monta o payload completo com todos os campos obrigatórios
                        // O backend espera um CompraPlanoPayload, mas o serviço aceita Plano
                        // Vamos enviar como Plano estendido com os campos adicionais necessários
                        const payloadCompleto: Plano & {
                            email?: string;
                            telefone?: string;
                            cpf?: string;
                            userId?: string;
                            plano?: {
                                Id: string;
                                Nome: string;
                                Preco: number;
                                Tipo: string;
                                Descricao: string;
                                Duracao: string;
                                VindiPlanId: string;
                                ProductId: string;
                                Status: string;
                            };
                            tokenObj?: { gateway_token: string; payment_company_code: string };
                            companyInfo?: { payment_company_code: string; payment_company_id: number };
                            endereco?: {
                                Rua: string;
                                Numero: string;
                                Complemento: string | null;
                                Cep: string;
                                Bairro: string;
                                Cidade: string;
                                Estado: string;
                            };
                            controleFatura?: {
                                CodigoFatura: string;
                                Valor: number;
                                Status: string;
                                DataEmissao: Date;
                                DataVencimento: Date;
                                Tipo: string;
                                vindiProductId: string;
                            };
                        } = {
                            // Campos obrigatórios do Plano
                            Id: plano.Id,
                            Nome: plano.Nome,
                            Preco: (typeof plano.Preco === "number" ? plano.Preco : parseFloat(String(plano.Preco || 0))) * quantity,
                            Type: plano.Type || plano.Tipo || "",
                            Descricao: Array.isArray(plano.Descricao) ? plano.Descricao : (typeof plano.Descricao === "string" ? [plano.Descricao] : []),
                            Duracao: typeof plano.Duracao === "number" ? plano.Duracao : (typeof plano.Duracao === "string" ? parseInt(String(plano.Duracao || 0), 10) : 0),
                            VindiPlanId: plano.VindiPlanId || "",
                            ProductId: plano.ProductId || "",
                            Status: plano.Status || "ativo",
                            // Campos adicionais para o backend
                            email: user?.Email || "",
                            telefone: user?.Telefone || "",
                            cpf: user?.Cpf || "",
                            userId: user?.Id || "",
                            plano: {
                                Id: plano.Id,
                                Nome: plano.Nome,
                                Preco: (typeof plano.Preco === "number" ? plano.Preco : parseFloat(String(plano.Preco || 0))) * quantity,
                                Tipo: plano.Type || plano.Tipo || "",
                                Descricao: Array.isArray(plano.Descricao) ? plano.Descricao.join(" ") : (typeof plano.Descricao === "string" ? plano.Descricao : ""),
                                Duracao: typeof plano.Duracao === "number" ? String(plano.Duracao) : (typeof plano.Duracao === "string" ? plano.Duracao : "0"),
                                VindiPlanId: plano.VindiPlanId || "",
                                ProductId: plano.ProductId || "",
                                Status: plano.Status || "ativo"
                            },
                            tokenObj: {
                                gateway_token: pagamentoObj.tokenObj?.gateway_token || "",
                                payment_company_code: pagamentoObj.companyInfo?.payment_company_code || ""
                            },
                            companyInfo: {
                                payment_company_code: pagamentoObj.companyInfo?.payment_company_code || "",
                                payment_company_id: pagamentoObj.companyInfo?.payment_company_id ?? 0
                            },
                            endereco: formData.cep ? {
                                Rua: formData.endereco,
                                Numero: formData.numero || "",
                                Complemento: formData.complemento || null,
                                Cep: formData.cep,
                                Bairro: formData.bairro,
                                Cidade: formData.cidade,
                                Estado: formData.estado
                            } : undefined,
                            controleFatura: {
                                CodigoFatura: codigoFatura,
                                Valor: (typeof plano.Preco === "number" ? plano.Preco : parseFloat(String(plano.Preco || 0))) * quantity,
                                Status: "Pending" as const, // FaturaStatus.Pending
                                DataEmissao: dataAtual,
                                DataVencimento: dataVencimento,
                                Tipo: "Plano" as const, // TipoFatura.Plano (enum value as string)
                                vindiProductId: plano.ProductId || ""
                            }
                        };
                        
                        comprarPlanoMutation.mutate(payloadCompleto as Plano, {
                            onSuccess: (data: { sucesso?: boolean; plano?: Plano; mensagem?: string }) => {
                                toast.success(data?.mensagem || "Pagamento realizado com sucesso! Aguarde a ativação de seu saldo.");
                                clearSensitiveForm(setValue);
                                setTimeout(() => router.push("/painel/success"), 3000);
                                if (user?.Id && plano?.Id) {
                                    (async () => {
                                        const ip = await fetchClientIp();
                                        enviarContrato({ 
                                            plano: plano,
                                            assinaturaBase64: contratoAssinaturaImg,
                                            IpNavegador: ip ?? ("" + window.navigator.userAgent)
                                        }, {
                                            onSuccess: () => {
                                                sessionStorage.removeItem('contratoAceito');
                                                sessionStorage.removeItem('contratoAssinaturaImg');
                                                sessionStorage.removeItem('contratoHtmlAssinado');
                                            },
                                            onError: () => {
                                                sessionStorage.removeItem('contratoAceito');
                                                sessionStorage.removeItem('contratoAssinaturaImg');
                                                sessionStorage.removeItem('contratoHtmlAssinado');
                                            }
                                        });
                                    })();
                                }
                            },
                            onError: (error: unknown) => {
                                // Log detalhado do erro para debug
                                console.error('Erro na mutation comprarPlano:', {
                                    error,
                                    errorType: typeof error,
                                    errorString: String(error),
                                    errorMessage: error instanceof Error ? error.message : undefined,
                                    errorStack: error instanceof Error ? error.stack : undefined,
                                    errorJSON: JSON.stringify(error, Object.getOwnPropertyNames(error)),
                                });
                                
                                // Tenta extrair mensagem de erro de várias fontes
                                let errMsg = "Erro ao processar pagamento.";
                                let shouldRedirect = false;
                                let redirectPath = "/painel/error";
                                
                                if (error instanceof Error) {
                                    errMsg = error.message || errMsg;
                                    
                                    // Verifica se é erro de plano ativo
                                    if (errMsg.includes("já possui um plano ativo") || errMsg.includes("plano ativo")) {
                                        errMsg = "Você já possui um plano ativo. Para alterar seu plano, acesse a área de planos.";
                                        shouldRedirect = true;
                                        redirectPath = "/painel/minha-conta/meus-planos";
                                    }
                                } else if (error && typeof error === 'object') {
                                    type ApiErrorResponse = {
                                        response?: {
                                            data?: {
                                                message?: string;
                                                error?: string;
                                            } | string;
                                        };
                                        message?: string;
                                        error?: string;
                                    };
                                    const errorObj = error as ApiErrorResponse;
                                    const apiError = errorObj?.response?.data;
                                    
                                    // Tenta extrair mensagem do erro da API
                                    if (apiError) {
                                        if (typeof apiError === 'string') {
                                            errMsg = apiError;
                                        } else if (apiError?.message) {
                                            errMsg = apiError.message;
                                        } else if (apiError?.error) {
                                            errMsg = apiError.error;
                                        }
                                        
                                        // Verifica se é erro de plano ativo
                                        if (errMsg.includes("já possui um plano ativo") || errMsg.includes("plano ativo")) {
                                            errMsg = "Você já possui um plano ativo. Para alterar seu plano, acesse a área de planos.";
                                            shouldRedirect = true;
                                            redirectPath = "/painel/minha-conta/meus-planos";
                                        }
                                    } else {
                                        errMsg = errorObj?.message || errorObj?.error || errMsg;
                                    }
                                }
                                
                                toast.error(errMsg, {
                                    duration: shouldRedirect ? 5000 : 4000,
                                });
                                clearSensitiveForm(setValue);
                                
                                // Limpa o cache do contrato quando há erro
                                sessionStorage.removeItem('contratoAceito');
                                sessionStorage.removeItem('contratoAssinaturaImg');
                                sessionStorage.removeItem('contratoHtmlAssinado');
                                setContractAccepted(false);
                                
                                // Salva a URL de origem antes de redirecionar
                                const checkoutUrl = window.location.pathname;
                                sessionStorage.setItem('checkoutErrorOrigin', checkoutUrl);
                                
                                // Redireciona após um delay
                                setTimeout(() => {
                                    router.push(redirectPath);
                                }, shouldRedirect ? 2000 : 1000);
                            },
                        });
                    } catch (err: unknown) {
                        if (err instanceof Error) {
                            toast.error(err.message || "Erro ao gerar pagamento.");
                        } else {
                            toast.error("Erro ao gerar pagamento.");
                        }
                        
                        // Limpa o cache do contrato quando há erro
                        sessionStorage.removeItem('contratoAceito');
                        sessionStorage.removeItem('contratoAssinaturaImg');
                        sessionStorage.removeItem('contratoHtmlAssinado');
                        setContractAccepted(false);
                        
                        // Salva a URL de origem antes de redirecionar
                        const checkoutUrl = window.location.pathname;
                        sessionStorage.setItem('checkoutErrorOrigin', checkoutUrl);
                        setTimeout(() => router.push("/painel/error"), 1000);
                    }
                },
                onError: () => {
                    toast.error("Erro ao salvar endereço. Verifique os dados e tente novamente.");
                    // Limpa o cache do contrato quando há erro
                    sessionStorage.removeItem('contratoAceito');
                    sessionStorage.removeItem('contratoAssinaturaImg');
                    sessionStorage.removeItem('contratoHtmlAssinado');
                    setContractAccepted(false);
                }
            }
        );
    };

    // Função para validar e abrir modal (comportamento igual ao comprar-consulta)
    const handleConfirmarPagamento = () => {
        // Valida o formulário antes de abrir o modal
        handleSubmit(() => {
            setShowResumoModal(true);
        }, (errors) => {
            // Se houver erros, mostra toast com o primeiro erro
            const firstError = Object.values(errors)[0];
            if (firstError?.message) {
                toast.error(firstError.message);
            } else {
                toast.error("Por favor, preencha todos os campos corretamente.");
            }
        })();
    };

    // Função para confirmar dentro do modal (chama processarCompra)
    const handleConfirmarModal = async () => {
        setShowResumoModal(false);
        const formData = getValues();
        await processarCompra(formData);
    };


    // Layout: tudo dentro do mesmo <form>
    return (
        <div className="min-h-screen w-full mb-20 relative">
            <div className="max-w-7xl mx-auto w-full px-4 md:px-8">
                <form className="flex flex-col md:flex-row md:gap-8 mt-12 space-y-8 md:space-y-0" onSubmit={e => { e.preventDefault(); handleConfirmarPagamento(); }}>
                    <div className="flex-1">
                        <BreadcrumbsVoltar />
                        <h1 className="text-2xl font-semibold mb-6">Pagamento</h1>
                        <h2 className="font-medium text-xs leading-4 mt-6 mb-2">
                            Adicionar cartão de crédito
                        </h2>
                        <div className="mb-4">
                            <label htmlFor="numeroCartao" className="block text-sm font-medium text-gray-700 mb-1">
                                Número do cartão*
                            </label>
                            <input
                                id="numeroCartao"
                                {...numeroCartaoRegister}
                                className={`w-full border p-2 rounded ${
                                    errors.numeroCartao
                                        ? "border-red-500"
                                        : watchedFields.numeroCartao && !errors.numeroCartao && touchedFields.numeroCartao
                                            ? "border-green-500"
                                            : "border-gray-300"
                                }`}
                                placeholder="0000 0000 0000 0000"
                                maxLength={19}
                                inputMode="numeric"
                                title="Digite 16 dígitos no formato 5555 5555 5555 5557 ou 5555555555555557"
                                onChange={handleMainFormChangeLocal}
                                onFocus={() => handleFieldFocus("numeroCartao")}
                                onKeyDown={blockSpecialChars}
                            />
                            {errors.numeroCartao && touchedFields.numeroCartao && (
                                <span className="text-red-500 text-xs mt-1 block min-h-[20px]">
                                    {errors.numeroCartao.message}
                                </span>
                            )}
                        </div>

                        <div className="mb-4">
                            <label htmlFor="nomeTitular" className="block text-sm font-medium text-gray-700 mb-1">
                                Nome do Titular*
                            </label>
                            <input
                                id="nomeTitular"
                                {...nomeTitularRegister}
                                className={`w-full border p-2 rounded ${
                                    errors.nomeTitular
                                        ? "border-red-500"
                                        : watchedFields.nomeTitular && !errors.nomeTitular && touchedFields.nomeTitular
                                            ? "border-green-500"
                                            : "border-gray-300"
                                }`}
                                placeholder="Nome como está no cartão"
                                maxLength={30}
                                onChange={handleMainFormChangeLocal}
                                onFocus={() => handleFieldFocus("nomeTitular")}
                            />
                            {errors.nomeTitular && touchedFields.nomeTitular && (
                                <span className="text-red-500 text-xs mt-1 block min-h-[20px]">
                                    {errors.nomeTitular.message}
                                </span>
                            )}
                        </div>

                        <div className="flex gap-4 mb-4">
                            <div className="w-1/2">
                                <label htmlFor="validade" className="block text-sm font-medium text-gray-700 mb-1">
                                    Validade*
                                </label>
                                <input
                                    id="validade"
                                    {...validadeRegister}
                                    className={`w-full border p-2 rounded ${
                                        errors.validade
                                            ? "border-red-500"
                                            : watchedFields.validade && !errors.validade && touchedFields.validade
                                                ? "border-green-500"
                                                : "border-gray-300"
                                    }`}
                                    placeholder="MM/AA"
                                    maxLength={5}
                                    inputMode="numeric"
                                    autoComplete="off"
                                    title="Informe no formato MM/AA (mês 01-12)"
                                    onChange={handleMainFormChangeLocal}
                                    onFocus={() => handleFieldFocus("validade")}
                                    onKeyDown={blockSpecialChars}
                                />
                                {errors.validade && touchedFields.validade && (
                                    <span className="text-red-500 text-xs mt-1 block min-h-[20px]">
                                        {errors.validade.message}
                                    </span>
                                )}
                            </div>
                            <div className="w-1/2">
                                <label htmlFor="cvv" className="block text-sm font-medium text-gray-700 mb-1">
                                    CVV*
                                </label>
                                <div className="relative">
                                    <input
                                        id="cvv"
                                        {...cvvRegisterBase}
                                        className={`w-full border p-2 rounded pr-10 ${
                                            errors.cvv
                                                ? "border-red-500"
                                                : watchedFields.cvv && !errors.cvv && touchedFields.cvv
                                                    ? "border-green-500"
                                                    : "border-gray-300"
                                        }`}
                                        placeholder="000"
                                        maxLength={4}
                                        inputMode="numeric"
                                        autoComplete="off"
                                        title="3 ou 4 dígitos"
                                        onFocus={handleCvvFocusLocal}
                                        onBlur={handleCvvBlurLocal}
                                        onChange={handleCvvChangeLocal}
                                        onKeyDown={blockSpecialChars}
                                    />
                                    {/* Ícone de tooltip */}
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 group cursor-pointer pointer-events-auto">
                                        <Image
                                            src="/icons/info-azul.svg"
                                            alt="Info CVV"
                                            width={18}
                                            height={18}
                                            className="w-[18px] h-[18px]"
                                        />
                                        {/* Tooltip */}
                                        <div className="absolute right-0 top-full mt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                                            <div className="bg-gray-800 text-white text-xs rounded shadow-lg px-3 py-2"
                                                style={{ minWidth: '220px', maxWidth: '280px', whiteSpace: 'normal' }}>
                                                O CVV é o código de 3 ou 4 dígitos localizado no verso do seu cartão, próximo à assinatura.
                                            </div>
                                            {/* Seta do tooltip */}
                                            <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-800 transform rotate-45"></div>
                                        </div>
                                    </div>
                                </div>
                                {errors.cvv && touchedFields.cvv && (
                                    <span className="text-red-500 text-xs mt-1 block min-h-[20px]">
                                        {errors.cvv.message}
                                    </span>
                                )}
                            </div>
                        </div>

                        <AddressForm
                            register={register}
                            setValue={setValue}
                            watch={watch}
                            errors={errors}
                            getValues={getValues}
                            user={user}
                            addressCheckboxChecked={addressCheckboxChecked}
                            onAddressCheckboxChange={handleAddressCheckboxLocal}
                        />
                    </div>
                    <div className="md:w-[420px] flex flex-col gap-6 mt-8 md:mt-0">
                        <div className="bg-white rounded-md shadow p-4">
                            <h3 className="font-semibold text-lg mb-2">Detalhes do pedido</h3>
                            {loading ? (
                                <div>Carregando plano...</div>
                            ) : plano ? (
                                <>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>Plano:</span>
                                        <span>{planDetails.plan}</span>
                                    </div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>Valor:</span>
                                        <span>R$ {parseFloat(planDetails.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-4 mb-4">
                                        <label className="text-sm font-medium text-gray-700">
                                            Quantas consultas deseja comprar?
                                        </label>
                                        <div className="flex items-center space-x-2">
                                            <button
                                                type="button"
                                                onClick={() => setQuantity((prev) => Math.max(prev - 1, 1))}
                                                className="w-8 h-8 rounded-full bg-gray-200 text-lg flex items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={quantity <= 1}
                                            >
                                                -
                                            </button>
                                            <span className="text-lg font-medium min-w-[30px] text-center">{quantity}</span>
                                            <button
                                                type="button"
                                                onClick={() => setQuantity((prev) => prev + 1)}
                                                className="w-8 h-8 rounded-full bg-gray-200 text-lg flex items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-base font-bold mt-2 border-t pt-2">
                                        <span>Total:</span>
                                        <span>R$ {(parseFloat(planDetails.price) * quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </>
                            ) : (
                                <div>Plano não encontrado.</div>
                            )}
                        </div>
                        <div className="mb-6">
                            <CartaoExemplo
                                numeroCartao={watchedFields.numeroCartao}
                                nomeTitular={watchedFields.nomeTitular}
                                validade={watchedFields.validade}
                                cvv={watchedFields.cvv}
                                isCardFlipped={isCardFlipped}
                                getCardLogo={() => getCardLogo({
                                    descricao: "",
                                    numeroCartao: watchedFields.numeroCartao,
                                    nomeTitular: watchedFields.nomeTitular,
                                    validade: watchedFields.validade,
                                    cvv: watchedFields.cvv,
                                    cep: watchedFields.cep,
                                    endereco: watchedFields.endereco,
                                    numero: watchedFields.numero,
                                    complemento: watchedFields.complemento || "",
                                    bairro: watchedFields.bairro,
                                    cidade: watchedFields.cidade,
                                    estado: watchedFields.estado,
                                })}
                            />
                            {/* Checkbox sempre visível abaixo do cartão */}
                            {/* Sempre começa desmarcado e força abertura do contrato */}
                            <div className="flex items-center gap-2 mb-4">
                                <input
                                    type="checkbox"
                                    className="accent-indigo-600 w-4 h-4"
                                    checked={contractAccepted}
                                    onChange={() => {
                                        // Sempre abre o modal do contrato quando clica no checkbox
                                        // Não permite marcar sem abrir o contrato
                                        handleOpenContratoModal();
                                    }}
                                    id="aceite-contrato"
                                    readOnly
                                />
                                <label 
                                    htmlFor="aceite-contrato" 
                                    className="font-normal text-xs leading-4 cursor-pointer"
                                    onClick={() => {
                                        // Ao clicar no label, também abre o modal
                                        if (!contractAccepted) {
                                            handleOpenContratoModal();
                                        }
                                    }}
                                >
                                    Li e aceito o contrato <span className="text-indigo-600 underline">(clique para abrir e assinar)</span>
                                </label>
                            </div>
                        </div>
                        <button
                            type="button"
                            disabled={!isValid || comprarPlanoMutation.isPending || !contractAccepted}
                            className={`relative overflow-hidden flex items-center justify-center w-full h-12 px-3 gap-2 rounded font-medium text-sm leading-6 transition mx-auto ${
                                !isValid || comprarPlanoMutation.isPending || !contractAccepted
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-indigo-400 text-white hover:bg-indigo-600 cursor-pointer'
                            }`}
                            onClick={handleConfirmarPagamento}
                        >
                            <span className="relative z-10">
                                {comprarPlanoMutation.isPending ? 'Processando...' : 'Confirmar pagamento'}
                            </span>
                            {comprarPlanoMutation.isPending && (
                                <div 
                                    className="absolute inset-0"
                                    style={{
                                        background: 'linear-gradient(90deg, transparent 0%, rgba(109, 40, 217, 0.8) 50%, transparent 100%)',
                                        backgroundSize: '200% 100%',
                                        animation: 'shimmerLoading 1.2s ease-in-out infinite',
                                    }}
                                />
                            )}
                        </button>
                    </div>
                </form>
                {/* Modais */}
                                {/* Modal de Resumo da Compra */}
                                <ResumoCompraModal
                                    showModal={showResumoModal}
                                    onClose={() => setShowResumoModal(false)}
                                    loading={comprarPlanoMutation.isPending}
                                    quantity={quantity}
                                    unitValue={plano?.Preco ?? 0}
                                    activeTab={"credito"}
                                    mainForm={getValues()}
                                    getCardLogo={() => getCardLogo({
                                        descricao: "",
                                        numeroCartao: watchedFields.numeroCartao,
                                        nomeTitular: watchedFields.nomeTitular,
                                        validade: watchedFields.validade,
                                        cvv: watchedFields.cvv,
                                        cep: watchedFields.cep,
                                        endereco: watchedFields.endereco,
                                        numero: watchedFields.numero,
                                        complemento: watchedFields.complemento || "",
                                        bairro: watchedFields.bairro,
                                        cidade: watchedFields.cidade,
                                        estado: watchedFields.estado,
                                    })}
                                    getLast4Digits={(num: string) => num?.slice(-4) ?? ""}
                                    handleConfirmarModal={handleConfirmarModal}
                                    isPlano={true}
                                    planoNome={plano?.Nome}
                                />
                <AddressModal
                    show={showAddressModal}
                    onClose={handleCloseAddressModalLocal}
                    userAddress={userAddress} // não precisa de spread/complemento
                    onChange={handleAddressChangeLocal}
                    onCepBlur={() => handleCepBlur(userAddress, (addr) => setUserAddress({
                        cep: addr.cep ?? "",
                        endereco: addr.endereco ?? "",
                        numero: addr.numero ?? "",
                        complemento: addr.complemento ?? "",
                        bairro: addr.bairro ?? "",
                        cidade: addr.cidade ?? "",
                        estado: addr.estado ?? "",
                    }))}
                    onConcluirCadastro={handleConcluirCadastroLocal}
                    addressTouched={addressTouched}
                    userId={user?.Id}
                    isLoading={isUpdatingUser}
                />


                {/* Modal de prévia do contrato usando hook */}
                <ModalContrato
                    show={modalContratoOpen}
                    onClose={() => setModalContratoOpen(false)}
                    contratoUrl={previaContratoData}
                    isLoading={isLoadingPrevContrato}
                    emitirLoading={false}
                    onConfirm={async (assinaturaImg, contratoHtml) => {
                        // Valida se o contrato foi realmente assinado
                        if (!assinaturaImg || assinaturaImg.trim() === '') {
                            toast.error("Por favor, assine o contrato antes de continuar.");
                            return;
                        }
                        
                        setModalContratoOpen(false);
                        sessionStorage.setItem('contratoAceito', 'true');
                        sessionStorage.setItem('contratoAssinaturaImg', assinaturaImg ?? "");
                        sessionStorage.setItem('contratoHtmlAssinado', contratoHtml ?? "");
                        // Valida todos os campos do formulário ao aceitar o contrato
                        await trigger(); // <-- força validação dos campos
                        setContractAccepted(true); // <-- só libera após validação e assinatura
                        toast.success("Contrato assinado com sucesso!");
                    }}
                />
            </div>
            <style jsx global>{`
                @keyframes shimmerLoading {
                    0% {
                        transform: translateX(-100%);
                    }
                    100% {
                        transform: translateX(100%);
                    }
                }
            `}</style>
        </div>
    );
}