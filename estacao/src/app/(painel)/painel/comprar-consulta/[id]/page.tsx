"use client";
import React, { useState, useEffect, useMemo } from "react";
import { usePathname, useParams, useRouter } from "next/navigation";
import { processarCompraCartao, processarCompraPix } from '@/services/compraService';
import BreadcrumbsVoltar from "@/components/BreadcrumbsVoltar";
import { useUserMe } from '@/hooks/user/userHook';
import { useCreateOrUpdateAddress } from '@/hooks/user/addressHook';
import { usePlanoById } from '@/hooks/planosHook';
import type { Planos } from '@/types/planosVendaTypes';
import { useRealizarPrimeiraCompra } from '@/hooks/primeiraConsultaHook';
import { fetchAddressByCep } from "@/services/viaCepService";
import { maskCep, handleMaskedBackspace } from "@/utils/masks";
import toast from 'react-hot-toast';
import { maskCardNumber, maskCardExpiry } from '@/config/checkoutConfig';
import CartaoExemplo from "@/components/CartaoExemplo";
import ResumoCompraModal from "@/components/ResumoCompraModal";
import { LoadingButton } from "@/components/LoadingButton";
import Image from "next/image";
import { ComprarConsultaSkeleton } from "@/components/PainelLoadingSkeleton";
import {
  validateCardForm,
  validateCardField,
  isAddressValid,
  isPrimeiraCompra,
  shouldBlockPromocionalCompra,
  isProdutoUnico,
  hasPrimeiraConsulta,
  PRIMEIRA_CONSULTA_PRECO,
  CONSULTA_AVULSA_PRECO,
  formatCurrency,
  getCardLogo,
  getLast4Digits,
  getPaymentCompanyInfo,
  getUserAddress,
  fillAddressFromUser,
  clearAddressForm,
  normalizeTipo,
  type CardFormType,
  type AddressFormType,
} from './comprarConsultaBusiness';
import { recuperarDadosPrimeiraCompra, atualizarEnderecoTemp } from '@/utils/primeiraCompraStorage'; 

export default function ComprarConsultaPage() {
  const pathname = usePathname(); 
  const params = useParams();
  const productId = params?.id;
  const router = useRouter();
  
  // Todos os hooks devem ser chamados antes de qualquer early return
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, isLoading: isLoadingUser } = useUserMe();
  const { realizarPrimeiraCompra } = useRealizarPrimeiraCompra();
  const { planos, isLoading: isLoadingPlanos } = usePlanoById(productId?.toString() || "");
  const planosTyped = planos as Planos | undefined;
  
  // Novo hook de endereço (genérico)
  const { mutate: salvarEndereco } = useCreateOrUpdateAddress();

  const [activeTab, setActiveTab] = useState<"credito" | "pix">("credito");
  const [quantity, setQuantity] = useState(1);
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  // Estados do formulário de endereço
  const [addressForm, setAddressForm] = useState<AddressFormType>(clearAddressForm());

  // Endereço cadastrado do usuário (precisa ser antes do early return)
  const userAddress = useMemo(() => getUserAddress(user), [user]);
  const [useUserAddress, setUseUserAddress] = useState(false);
  
  // Regras de negócio calculadas (precisa ser antes do early return)
  const isProdutoUnicoValue = useMemo(() => isProdutoUnico(planosTyped), [planosTyped]);
  const isPrimeiraCompraValue = useMemo(() => isPrimeiraCompra(pathname || "", user, planosTyped), [pathname, user, planosTyped]);
  const blockCompraPromocional = useMemo(() => shouldBlockPromocionalCompra(pathname || "", user), [pathname, user]);
  
  // Validação do tipo do plano (precisa ser antes do early return)
  const tipoPlano = useMemo(() => normalizeTipo(planosTyped?.Tipo), [planosTyped]);
  const isPlanoUnica = useMemo(() => tipoPlano === "Unica", [tipoPlano]);
  const isPlanoAvulsa = useMemo(() => tipoPlano === "Avulsa", [tipoPlano]);
  
  // Validação de endereço (precisa ser antes do early return)
  const addressValid = useMemo(() => isAddressValid(addressForm), [addressForm]);
  
  // Validação: garante que o plano está carregado antes de permitir compra (precisa ser antes do early return)
  const planoCarregado = useMemo(() => {
    return planosTyped !== undefined && planosTyped !== null && planosTyped.Preco !== undefined;
  }, [planosTyped]);
  
  // Validação: verifica se o tipo do plano é válido (Unica ou Avulsa) (precisa ser antes do early return)
  const tipoPlanoValido = useMemo(() => {
    if (!planosTyped) return false;
    const tipoNormalizado = normalizeTipo(planosTyped.Tipo);
    return tipoNormalizado === "Unica" || tipoNormalizado === "Avulsa";
  }, [planosTyped]);

  // Estados para o cartão visual (precisa ser antes do early return)
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Formulário de cartão (precisa ser antes do early return)
  const [mainForm, setMainForm] = useState<CardFormType>({
    numeroCartao: "",
    nomeTitular: "",
    validade: "",
    cvv: "",
  });
  
  // Atualiza useUserAddress baseado no userAddress quando disponível (precisa ser antes do early return)
  useEffect(() => {
    if (userAddress) {
      setUseUserAddress(true);
    }
  }, [userAddress]);

  // Ajusta quantidade baseado nas regras de negócio (precisa ser antes do early return)
  // Para primeira compra (tipo Unica), sempre mantém quantidade = 1
  // Para consultas avulsas (tipo Avulsa), permite múltiplas quantidades (mínimo 1)
  useEffect(() => {
    if (isPrimeiraCompraValue || isPlanoUnica) {
      // Primeira compra: sempre 1 consulta (não pode comprar mais de 1x)
      setQuantity(1);
    } else if (isPlanoAvulsa) {
      // Consultas avulsas: garante mínimo de 1 (já vem como padrão)
      // Não precisa fazer nada, quantity já está em 1 por padrão
    }
  }, [isPrimeiraCompraValue, isPlanoUnica, isPlanoAvulsa]);

  // Preenche o endereço do usuário quando useUserAddress é true (precisa ser antes do early return)
  useEffect(() => {
    if (useUserAddress && userAddress) {
      const filledAddress = fillAddressFromUser(userAddress);
      setAddressForm(filledAddress);
    } else if (!useUserAddress) {
      setAddressForm(clearAddressForm());
    }
  }, [useUserAddress, userAddress]);

  // Restaura dados temporários da primeira compra ao carregar a página
  useEffect(() => {
    if (isPrimeiraCompraValue && planosTyped) {
      recuperarDadosPrimeiraCompra().then((dadosTemp) => {
        if (dadosTemp) {
        // Restaura endereço se existir nos dados temporários
        if (dadosTemp.endereco && !useUserAddress) {
          setAddressForm({
            cep: dadosTemp.endereco.cep,
            rua: dadosTemp.endereco.rua,
            numero: dadosTemp.endereco.numero,
            complemento: dadosTemp.endereco.complemento || '',
            bairro: dadosTemp.endereco.bairro,
            cidade: dadosTemp.endereco.cidade,
            estado: dadosTemp.endereco.estado,
          });
        }
        }
      }).catch(console.error);
    }
  }, [isPrimeiraCompraValue, planosTyped, useUserAddress]);

  // Salva endereço nos dados temporários quando o usuário preenche
  useEffect(() => {
    if (isPrimeiraCompraValue && addressValid && !useUserAddress) {
      atualizarEnderecoTemp({
        cep: addressForm.cep,
        rua: addressForm.rua,
        numero: addressForm.numero,
        complemento: addressForm.complemento || undefined,
        bairro: addressForm.bairro,
        cidade: addressForm.cidade,
        estado: addressForm.estado,
      });
    }
  }, [isPrimeiraCompraValue, addressForm, addressValid, useUserAddress]);

  // ⚡ OTIMIZAÇÃO: Mostra skeleton enquanto carrega dados essenciais
  if (isLoadingUser || isLoadingPlanos || !planosTyped) {
    return <ComprarConsultaSkeleton />;
  }

  // Busca endereço pelo CEP (ViaCepService)
  const handleCepChange = async (value: string) => {
    const masked = maskCep(value);
    setAddressForm(prev => ({ ...prev, cep: masked }));
    const cleanCep = masked.replace(/\D/g, "");
    
    if (!useUserAddress && cleanCep.length === 8) {
      try {
        const data = await fetchAddressByCep(cleanCep);
        if (!data || !data.logradouro) {
          toast.error("CEP não encontrado. Verifique o CEP digitado e tente novamente.");
          return;
        }
        setAddressForm(prev => ({
          ...prev,
          rua: data.logradouro || "",
          bairro: data.bairro || "",
          cidade: data.localidade || "",
          estado: data.uf || "",
          complemento: data.complemento || "",
        }));
      } catch (error) {
        toast.error("CEP não encontrado. Verifique o CEP digitado e tente novamente.");
        console.error("Erro ao buscar CEP:", error);
      }
    }
  };

  // Máscaras e handlers
  const handleMainFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let newValue = value;
    if (name === "numeroCartao") newValue = maskCardNumber(value);
    if (name === "validade") newValue = maskCardExpiry(value);
    setMainForm((prev) => ({ ...prev, [name]: newValue }));
    
    // Validação em tempo real - só valida se o campo já foi tocado (touched)
    if (touchedFields[name]) {
      const validation = validateCardField(name as keyof CardFormType, newValue);
      if (!validation.isValid && validation.error) {
        setCardErrors((prev) => ({ ...prev, [name]: validation.error! }));
      } else {
        setCardErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    } else {
      // Se não foi tocado ainda, apenas limpa o erro se existir
      if (cardErrors[name]) {
        setCardErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    }
  };

  const handleCvvFocus = () => setIsCardFlipped(true);
  
  const handleCvvBlur = () => {
    setIsCardFlipped(false);
    // Marca o campo CVV como tocado
    setTouchedFields((prev) => ({ ...prev, cvv: true }));
    
    // Valida sempre, mesmo quando vazio, para mostrar "CVV é obrigatório"
    const validation = validateCardField("cvv", mainForm.cvv || "");
    if (!validation.isValid && validation.error) {
      setCardErrors((prev) => ({ ...prev, cvv: validation.error! }));
    } else {
      setCardErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.cvv;
        return newErrors;
      });
    }
  };

  // Handler para onBlur - valida campo individual sempre, mesmo quando vazio
  const handleFieldBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name in mainForm) {
      // Marca o campo como tocado
      setTouchedFields((prev) => ({ ...prev, [name]: true }));
      
      // Valida sempre, mesmo quando vazio, para mostrar mensagens como "é obrigatório"
      const validation = validateCardField(name as keyof CardFormType, value || "");
      if (!validation.isValid && validation.error) {
        setCardErrors((prev) => ({ ...prev, [name]: validation.error! }));
      } else {
        setCardErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    }
  };

  // Função para abrir o modal ao confirmar pagamento
  const handleConfirmarPagamento = (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) {
      e.preventDefault();
    }
    
    if (activeTab === 'credito') {
      const validation = validateCardForm(mainForm);
      setCardErrors(validation.errors);
      if (!validation.isValid) {
        const firstError = Object.values(validation.errors)[0];
        toast.error(firstError || "Por favor, preencha todos os campos do cartão corretamente.");
        return;
      }
    } else if (activeTab === 'pix') {
      if (!isAddressValid(addressForm)) {
        toast.error('Por favor, preencha todos os campos obrigatórios do endereço.');
        return;
      }
    }
    
    setShowModal(true);
  };

  const handleCloseModal = () => setShowModal(false);

  // Função para confirmar dentro do modal
  
  // Cálculos de preço - SEMPRE usa o valor da API do plano quando disponível
  // Cálculo direto do preço unitário (sem useMemo) para evitar problemas de cache
  const precoUnitario = (() => {
    // Validação: se o plano não está carregado, retorna 0
    if (!planosTyped) {
      return 0;
    }
    
    // Se o plano tem preço na API, SEMPRE usa esse valor (vem da API)
    if (planosTyped.Preco !== undefined && planosTyped.Preco !== null && typeof planosTyped.Preco === 'number') {
      // Validação para tipo "Unica" (primeira consulta promocional)
      if (isPlanoUnica) {
        // Se usuário já comprou primeira consulta, não deve permitir (mas usa o preço da API mesmo assim)
        // O bloqueio é feito em blockCompraPromocional
        return planosTyped.Preco; // Preço promocional da API (ex: 49.99)
      }
      
      // Validação para tipo "Avulsa" (consulta avulsa)
      if (isPlanoAvulsa) {
        return planosTyped.Preco; // Preço da consulta avulsa da API (ex: 74.90)
      }
      
      // Para outros tipos de plano, usa o preço da API
      return planosTyped.Preco;
    }
    
    // Fallback para valores hardcoded APENAS se não houver preço na API
    // (caso de erro/plano não encontrado - não deveria acontecer em produção)
    console.warn('[ComprarConsulta] Plano sem preço na API, usando valores hardcoded como fallback');
    if (isPlanoUnica && !hasPrimeiraConsulta(user)) {
      return PRIMEIRA_CONSULTA_PRECO;
    }
    return CONSULTA_AVULSA_PRECO;
  })();
  
  // Cálculo direto do valor total (sem useMemo) para garantir atualização em tempo real
  const valorTotal = (() => {
    // Para primeira compra (tipo "Unica"), sempre 1 consulta
    if (isPrimeiraCompraValue || isPlanoUnica) {
      return precoUnitario; // Usa o preço unitário (já vem da API)
    }
    // Para consulta avulsa, multiplica pela quantidade selecionada
    if (isPlanoAvulsa) {
      return precoUnitario * quantity;
    }
    // Fallback: retorna preço unitário
    return precoUnitario;
  })();

  const handleConfirmarModal = () => {
    // Validação: verifica se o plano está carregado
    if (!planoCarregado || !planosTyped) {
      toast.error('Plano não carregado. Por favor, recarregue a página.');
      setShowModal(false);
      return;
    }
    
    // Validação: verifica se o tipo do plano é válido (Unica ou Avulsa)
    if (!tipoPlanoValido) {
      toast.error('Tipo de plano inválido. Por favor, recarregue a página.');
      setShowModal(false);
      return;
    }
    
    // Validação: verifica se o preço está disponível e é válido
    if (!planosTyped.Preco || planosTyped.Preco <= 0 || typeof planosTyped.Preco !== 'number') {
      toast.error('Preço do plano inválido. Por favor, recarregue a página.');
      setShowModal(false);
      return;
    }
    
    // Validação específica para tipo "Unica" (promocional)
    if (isPlanoUnica && hasPrimeiraConsulta(user)) {
      toast.error('Você já efetuou a compra promocional da primeira consulta. Não é possível comprar novamente.');
      setShowModal(false);
      return;
    }
    
    // Fecha o modal imediatamente
    setShowModal(false);
    
    if (activeTab === "pix") {
      if (!addressValid) {
        toast.error('Por favor, preencha todos os campos obrigatórios do endereço.');
        return;
      }
      processarCompraPix({ setShowModal, router, valor: valorTotal });
      return;
    }
    
    // Validação rigorosa dos campos do cartão antes de processar
    if (activeTab === "credito") {
      // Verifica se os campos não estão vazios
      if (!mainForm.numeroCartao || !mainForm.numeroCartao.trim()) {
        toast.error('Número do cartão é obrigatório.');
        return;
      }
      if (!mainForm.nomeTitular || !mainForm.nomeTitular.trim()) {
        toast.error('Nome do titular é obrigatório.');
        return;
      }
      if (!mainForm.validade || !mainForm.validade.trim()) {
        toast.error('Validade do cartão é obrigatória.');
        return;
      }
      if (!mainForm.cvv || !mainForm.cvv.trim()) {
        toast.error('CVV do cartão é obrigatório.');
        return;
      }
      
      // Validação completa do formulário
      const validation = validateCardForm(mainForm);
      if (!validation.isValid) {
        setCardErrors(validation.errors);
        const firstError = Object.values(validation.errors)[0];
        toast.error(firstError || "Por favor, preencha todos os campos do cartão corretamente.");
        return;
      }
      
      // Validação do endereço
      if (!addressValid) {
        toast.error('Por favor, preencha todos os campos obrigatórios do endereço.');
        return;
      }
    }
    
    processarCompraCartao({
      user,
      mainForm,
      planosTyped,
      isPrimeiraCompra: isPrimeiraCompraValue,
      quantity,
      getValorTotal: () => valorTotal,
      getCardLogo: () => getCardLogo(mainForm.numeroCartao),
      getLast4Digits,
      getPaymentCompanyInfo,
      salvarEndereco,
      realizarPrimeiraCompra,
      setLoading,
      setShowModal,
      setMainForm,
      router,
      rua: addressForm.rua,
      numero: addressForm.numero,
      complemento: addressForm.complemento,
      bairro: addressForm.bairro,
      cidade: addressForm.cidade,
      estado: addressForm.estado,
      cep: addressForm.cep,
      isAddressValid: addressValid,
    });
  };


  return (
    <div className="w-full bg-[#FCFBF6] p-4 lg:p-8 text-gray max-w-[1280px] mx-auto min-h-screen">
      <BreadcrumbsVoltar />
      <h1 className="text-[24px] fira-sans font-semibold mb-6 text-gray leading-[24px]">
        {isPlanoAvulsa ? "Comprar consultas avulsas" : "Comprar consulta promocional"}
      </h1>
      {/* ALERTA FIXO APÓS O TÍTULO */}
      {blockCompraPromocional && isProdutoUnicoValue && (

        <div className="w-full mb-4 px-4 py-3 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded z-50 relative">
          Você já efetuou a compra promocional da primeira consulta. Não é possível comprar novamente.
        </div>
      )}
      {/* Modal */}
      <ResumoCompraModal
        showModal={showModal}
        onClose={handleCloseModal}
        loading={loading}
        quantity={isPrimeiraCompraValue || isPlanoUnica ? 1 : quantity}
        unitValue={precoUnitario}
        activeTab={activeTab}
        mainForm={mainForm}
        getCardLogo={() => getCardLogo(mainForm.numeroCartao)}
        getLast4Digits={getLast4Digits}
        handleConfirmarModal={handleConfirmarModal}
        isConsultaPromocional={isPrimeiraCompraValue || isPlanoUnica}
      />

      <div className="lg:grid lg:grid-cols-[3fr_2fr] gap-6">
        {/* Coluna Esquerda: Formulário de Pagamento */}
        <div className="space-y-4">
          {/* Mobile: Quantidade no topo - apenas para consultas avulsas */}
          {isPlanoAvulsa && (
            <div className="lg:hidden border border-gray-200 rounded-xl p-4 space-y-4">
              <div className="flex justify-between items-center">
                <label className="fira-sans text-[16px] font-medium text-gray">
                  Quantas consultas deseja comprar?
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setQuantity((prev) => Math.max(prev - 1, 1))}
                    className="w-8 h-8 rounded-full bg-gray-200 text-lg flex items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors"
                    disabled={quantity <= 1}
                  >
                    -
                  </button>
                  <span className="text-lg font-medium min-w-[30px] text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity((prev) => prev + 1)}
                    className="w-8 h-8 rounded-full bg-gray-200 text-lg flex items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="text-right text-lg font-semibold">
                Valor total: {formatCurrency(valorTotal)}
              </div>
            </div>
          )}

          {/* Pagamento */}
          <h2 className="text-[18px] fira-sans font-medium text-gray leading-[24px] mt-4">Pagamento</h2>
          
          {/* Tabs pagamento */}
          <div className="flex flex-col lg:flex-row gap-4 my-4 justify-end">
            <button
              onClick={() => setActiveTab('credito')}
              className={`flex items-center justify-center w-full lg:w-[150px] h-[32px] rounded-[4px] gap-[8px] fira-sans font-medium text-[14px] leading-[24px] ${
                activeTab === 'credito' ? 'bg-[#CFD6F7] text-blue-600' : 'bg-[rgba(242,244,253,1)] text-gray-600'
              }`}
            >
              <Image src="/assets/icons/creditcard.svg" alt="Cartão Crédito" className="w-[16px] h-[16px]" width={16} height={16} unoptimized />
              Cartão Crédito
            </button>
            <button
              onClick={() => setActiveTab('pix')}
              className={`flex items-center justify-center w-full lg:w-[150px] h-[32px] rounded-[4px] gap-[8px] fira-sans font-medium text-[14px] leading-[24px] ${
                activeTab === 'pix' ? 'bg-[#CFD6F7] text-blue-600' : 'bg-[rgba(242,244,253,1)] text-gray-600'
              }`}
            >
              <Image src="/assets/icons/pix.svg" alt="Pix" className="w-[16px] h-[16px]" width={16} height={16} unoptimized />
              Pix
            </button>
          </div>

          {/* Formulários por tab */}
          {activeTab === 'credito' && (
            <>
              <form className="space-y-4" onSubmit={handleConfirmarPagamento}>
                <div>
                  <label htmlFor="numeroCartao-consulta" className="block text-sm font-medium text-gray-700 mb-1">
                    Número do cartão*
                  </label>
                  <input
                    id="numeroCartao-consulta"
                    className={`w-full border p-2 rounded ${
                      cardErrors.numeroCartao
                        ? "border-red-500"
                        : mainForm.numeroCartao && !cardErrors.numeroCartao
                        ? "border-green-500"
                        : "border-gray-300"
                    }`}
                    placeholder="0000 0000 0000 0000"
                    name="numeroCartao"
                    value={mainForm.numeroCartao}
                    onChange={handleMainFormChange}
                    onBlur={handleFieldBlur}
                    maxLength={19}
                    inputMode="numeric"
                    autoComplete="off"
                    pattern="\\d{4} \\d{4} \\d{4} \\d{4}"
                  />
                  {cardErrors.numeroCartao && (
                    <span className="text-red-500 text-xs mt-1 block min-h-[20px]">{cardErrors.numeroCartao}</span>
                  )}
                </div>
                <div>
                  <label htmlFor="nomeTitular-consulta" className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Titular*
                  </label>
                  <input
                    id="nomeTitular-consulta"
                    className={`w-full border p-2 rounded ${
                      cardErrors.nomeTitular
                        ? "border-red-500"
                        : mainForm.nomeTitular && !cardErrors.nomeTitular
                        ? "border-green-500"
                        : "border-gray-300"
                    }`}
                    placeholder="Nome como está no cartão"
                    name="nomeTitular"
                    value={mainForm.nomeTitular}
                    onChange={handleMainFormChange}
                    onBlur={handleFieldBlur}
                    maxLength={30}
                  />
                  {cardErrors.nomeTitular && (
                    <span className="text-red-500 text-xs mt-1 block min-h-[20px]">{cardErrors.nomeTitular}</span>
                  )}
                </div>
                <div className="flex gap-4">
                  <div className="w-1/2">
                    <label htmlFor="validade-consulta" className="block text-sm font-medium text-gray-700 mb-1">
                      Validade*
                    </label>
                    <input
                      id="validade-consulta"
                      className={`w-full border p-2 rounded ${
                        cardErrors.validade
                          ? "border-red-500"
                          : mainForm.validade && !cardErrors.validade
                          ? "border-green-500"
                          : "border-gray-300"
                      }`}
                      placeholder="MM/AA"
                      name="validade"
                      value={mainForm.validade}
                      onChange={handleMainFormChange}
                      onBlur={handleFieldBlur}
                      maxLength={5}
                      inputMode="numeric"
                      autoComplete="off"
                      pattern="\\d{2}/\\d{2}"
                    />
                    {cardErrors.validade && (
                      <span className="text-red-500 text-xs mt-1 block min-h-[20px]">{cardErrors.validade}</span>
                    )}
                  </div>
                  <div className="w-1/2 relative">
                    <label htmlFor="cvv-consulta" className="block text-sm font-medium text-gray-700 mb-1">
                      CVV*
                    </label>
                    <input
                      id="cvv-consulta"
                      className={`w-full border p-2 rounded pr-10 ${
                        cardErrors.cvv
                          ? "border-red-500"
                          : mainForm.cvv && !cardErrors.cvv
                          ? "border-green-500"
                          : "border-gray-300"
                      }`}
                      placeholder="000"
                      name="cvv"
                      value={mainForm.cvv}
                      onChange={handleMainFormChange}
                      onFocus={() => {
                        handleCvvFocus();
                        // Marca como tocado quando foca (para validar em tempo real)
                        if (!touchedFields.cvv) {
                          setTouchedFields((prev) => ({ ...prev, cvv: true }));
                        }
                      }}
                      onBlur={handleCvvBlur}
                      maxLength={4}
                      inputMode="numeric"
                      autoComplete="off"
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
                    {cardErrors.cvv && (
                      <span className="text-red-500 text-xs mt-1 block min-h-[20px]">{cardErrors.cvv}</span>
                    )}
                  </div>
                </div>
                {/* Campos de endereço SEMPRE visíveis na tab crédito */}
                <div className="mt-6">
                  <h3 className="text-[16px] font-semibold mb-2">Endereço de cobrança</h3>
                  {userAddress && (
                    <label className="flex items-center space-x-2 cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        checked={useUserAddress}
                        onChange={e => setUseUserAddress(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-gray-700">Usar endereço cadastrado</span>
                    </label>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                    <div>
                      <label htmlFor="cep-card" className="block text-sm font-medium text-gray-700 mb-1">
                        CEP*
                      </label>
                      <input
                        id="cep-card"
                        type="text"
                        placeholder="00000-000"
                        className={`border rounded-lg px-4 py-2 w-full ${addressForm.cep ? 'border-green-500' : 'border-gray-300'}`}
                        value={addressForm.cep}
                        onChange={e => handleCepChange(e.target.value)}
                        onKeyDown={e => {
                          handleMaskedBackspace(
                            e,
                            addressForm.cep || '',
                            maskCep,
                            (newValue) => {
                              handleCepChange(newValue);
                            }
                          );
                        }}
                        disabled={useUserAddress}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="numero-card" className="block text-sm font-medium text-gray-700 mb-1">
                        Número
                      </label>
                      <input
                        id="numero-card"
                        type="text"
                        placeholder="Ex: 123 ou s/n"
                        className={`border rounded-lg px-4 py-2 w-full ${addressForm.numero ? 'border-green-500' : 'border-gray-300'}`}
                        value={addressForm.numero}
                        onChange={e => setAddressForm(prev => ({ ...prev, numero: e.target.value }))}
                        disabled={useUserAddress}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                    <div>
                      <label htmlFor="rua-card" className="block text-sm font-medium text-gray-700 mb-1">
                        Rua*
                      </label>
                      <input
                        id="rua-card"
                        type="text"
                        placeholder="Rua, Avenida, etc."
                        className={`border rounded-lg px-4 py-2 w-full ${addressForm.rua ? 'border-green-500' : 'border-gray-300'}`}
                        value={addressForm.rua}
                        onChange={e => setAddressForm(prev => ({ ...prev, rua: e.target.value }))}
                        disabled={useUserAddress}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="complemento-card" className="block text-sm font-medium text-gray-700 mb-1">
                        Complemento
                      </label>
                      <input
                        id="complemento-card"
                        type="text"
                        placeholder="Apto, Bloco, etc."
                        className={`border rounded-lg px-4 py-2 w-full ${addressForm.complemento ? 'border-green-500' : 'border-gray-300'}`}
                        value={addressForm.complemento}
                        onChange={e => setAddressForm(prev => ({ ...prev, complemento: e.target.value }))}
                        disabled={useUserAddress}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                    <div>
                      <label htmlFor="bairro-card" className="block text-sm font-medium text-gray-700 mb-1">
                        Bairro*
                      </label>
                      <input
                        id="bairro-card"
                        type="text"
                        placeholder="Nome do bairro"
                        className={`border rounded-lg px-4 py-2 w-full ${addressForm.bairro ? 'border-green-500' : 'border-gray-300'}`}
                        value={addressForm.bairro}
                        onChange={e => setAddressForm(prev => ({ ...prev, bairro: e.target.value }))}
                        disabled={useUserAddress}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="cidade-card" className="block text-sm font-medium text-gray-700 mb-1">
                        Cidade*
                      </label>
                      <input
                        id="cidade-card"
                        type="text"
                        placeholder="Nome da cidade"
                        className={`border rounded-lg px-4 py-2 w-full ${addressForm.cidade ? 'border-green-500' : 'border-gray-300'}`}
                        value={addressForm.cidade}
                        onChange={e => setAddressForm(prev => ({ ...prev, cidade: e.target.value }))}
                        disabled={useUserAddress}
                        required
                      />
                    </div>
                  </div>
                  <div className="w-full mb-2">
                    <label htmlFor="estado-card" className="block text-sm font-medium text-gray-700 mb-1">
                      Estado*
                    </label>
                    <input
                      id="estado-card"
                      type="text"
                      placeholder="UF"
                      className={`border rounded-lg px-4 py-2 w-full ${addressForm.estado ? 'border-green-500' : 'border-gray-300'}`}
                      value={addressForm.estado}
                      onChange={e => setAddressForm(prev => ({ ...prev, estado: e.target.value }))}
                      disabled={useUserAddress}
                      required
                    />
                  </div>
                  {!addressValid && (
                    <div className="text-red-500 text-sm mt-1">Preencha todos os campos obrigatórios do endereço.</div>
                  )}
                </div>
              </form>
            </>
          )}
          {activeTab === 'pix' && (
            <div className="mt-6">
              <h3 className="text-[16px] font-semibold mb-2">Endereço de cobrança</h3>
              {userAddress && (
                <label className="flex items-center space-x-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={useUserAddress}
                    onChange={e => setUseUserAddress(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-700">Usar endereço cadastrado</span>
                </label>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                <div>
                  <label htmlFor="cep-pix" className="block text-sm font-medium text-gray-700 mb-1">
                    CEP*
                  </label>
                  <input
                    id="cep-pix"
                    type="text"
                    placeholder="00000-000"
                    className={`border rounded-lg px-4 py-2 w-full ${addressForm.cep ? 'border-green-500' : 'border-gray-300'}`}
                    value={addressForm.cep}
                    onChange={e => handleCepChange(e.target.value)}
                    onKeyDown={e => {
                      handleMaskedBackspace(
                        e,
                        addressForm.cep || '',
                        maskCep,
                        (newValue) => {
                          handleCepChange(newValue);
                        }
                      );
                    }}
                    disabled={useUserAddress}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="numero-pix" className="block text-sm font-medium text-gray-700 mb-1">
                    Número
                  </label>
                  <input
                    id="numero-pix"
                    type="text"
                    placeholder="Ex: 123 ou s/n"
                    className={`border rounded-lg px-4 py-2 w-full ${addressForm.numero ? 'border-green-500' : 'border-gray-300'}`}
                    value={addressForm.numero}
                    onChange={e => setAddressForm(prev => ({ ...prev, numero: e.target.value }))}
                    disabled={useUserAddress}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                <div>
                  <label htmlFor="rua-pix" className="block text-sm font-medium text-gray-700 mb-1">
                    Rua*
                  </label>
                  <input
                    id="rua-pix"
                    type="text"
                    placeholder="Rua, Avenida, etc."
                    className={`border rounded-lg px-4 py-2 w-full ${addressForm.rua ? 'border-green-500' : 'border-gray-300'}`}
                    value={addressForm.rua}
                    onChange={e => setAddressForm(prev => ({ ...prev, rua: e.target.value }))}
                    disabled={useUserAddress}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="complemento-pix" className="block text-sm font-medium text-gray-700 mb-1">
                    Complemento
                  </label>
                  <input
                    id="complemento-pix"
                    type="text"
                    placeholder="Apto, Bloco, etc."
                    className={`border rounded-lg px-4 py-2 w-full ${addressForm.complemento ? 'border-green-500' : 'border-gray-300'}`}
                    value={addressForm.complemento}
                    onChange={e => setAddressForm(prev => ({ ...prev, complemento: e.target.value }))}
                    disabled={useUserAddress}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                <div>
                  <label htmlFor="bairro-pix" className="block text-sm font-medium text-gray-700 mb-1">
                    Bairro*
                  </label>
                  <input
                    id="bairro-pix"
                    type="text"
                    placeholder="Nome do bairro"
                    className={`border rounded-lg px-4 py-2 w-full ${addressForm.bairro ? 'border-green-500' : 'border-gray-300'}`}
                    value={addressForm.bairro}
                    onChange={e => setAddressForm(prev => ({ ...prev, bairro: e.target.value }))}
                    disabled={useUserAddress}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="cidade-pix" className="block text-sm font-medium text-gray-700 mb-1">
                    Cidade*
                  </label>
                  <input
                    id="cidade-pix"
                    type="text"
                    placeholder="Nome da cidade"
                    className={`border rounded-lg px-4 py-2 w-full ${addressForm.cidade ? 'border-green-500' : 'border-gray-300'}`}
                    value={addressForm.cidade}
                    onChange={e => setAddressForm(prev => ({ ...prev, cidade: e.target.value }))}
                    disabled={useUserAddress}
                    required
                  />
                </div>
              </div>
              <div className="w-full mb-2">
                <label htmlFor="estado-pix" className="block text-sm font-medium text-gray-700 mb-1">
                  Estado*
                </label>
                <input
                  id="estado-pix"
                  type="text"
                  placeholder="UF"
                  className={`border rounded-lg px-4 py-2 w-full ${addressForm.estado ? 'border-green-500' : 'border-gray-300'}`}
                  value={addressForm.estado}
                  onChange={e => setAddressForm(prev => ({ ...prev, estado: e.target.value }))}
                  disabled={useUserAddress}
                  required
                />
              </div>
              {!addressValid && (
                <div className="text-red-500 text-sm mt-1">Preencha todos os campos obrigatórios do endereço.</div>
              )}
            </div>
          )}
          
          {/* Botões Mobile */}
          <div className="lg:hidden space-y-2 mt-6">
            <LoadingButton
              loading={loading}
              disabled={blockCompraPromocional || loading}
              onClick={() => handleConfirmarPagamento()}
              className="w-full bg-[#8494E9] text-white py-2 rounded-lg font-medium"
            >
              Confirmar pagamento
            </LoadingButton>
            <button
              type="button"
              disabled={loading}
              className={`w-full h-[40px] rounded-[4px] border border-[#6D75C0] pr-[18px] pl-[18px] gap-[12px] text-gray py-2 font-medium ${
                loading ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-100'
              }`}
            >
              Cancelar compra
            </button>
          </div>
        </div>

        {/* Coluna Direita: Quantidade e total (Desktop) */}
        <div className="hidden lg:block border border-gray-200 rounded-xl p-4 space-y-4">
          {activeTab === 'credito' && (
            <CartaoExemplo
              numeroCartao={mainForm.numeroCartao}
              nomeTitular={mainForm.nomeTitular}
              validade={mainForm.validade}
              cvv={mainForm.cvv}
              isCardFlipped={isCardFlipped}
              getCardLogo={() => getCardLogo(mainForm.numeroCartao)}
            />
          )}
          {/* Desktop: Quantidade - apenas para consultas avulsas */}
          {isPlanoAvulsa && (
            <div className="flex justify-between items-center">
              <label className="fira-sans text-[16px] font-medium text-gray">
                Quantas consultas deseja comprar?
              </label>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setQuantity((prev) => Math.max(prev - 1, 1))}
                  className="w-8 h-8 rounded-full bg-gray-200 text-lg flex items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors"
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <span className="text-lg font-medium min-w-[30px] text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity((prev) => prev + 1)}
                  className="w-8 h-8 rounded-full bg-gray-200 text-lg flex items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          )}
          <div className="text-right text-lg font-semibold">
            Valor total: {formatCurrency(valorTotal)}
          </div>
          {/* Botões desktop */}
          <div className="space-y-2 mt-4">
            <LoadingButton
              loading={loading}
              disabled={blockCompraPromocional || loading}
              onClick={() => handleConfirmarPagamento()}
              className="w-full bg-[#8494E9] text-white py-2 rounded-lg font-medium"
            >
              Confirmar pagamento
            </LoadingButton>
            <button
              type="button"
              disabled={loading}
              className={`w-full h-[40px] rounded-[4px] border border-[#6D75C0] pr-[18px] pl-[18px] gap-[12px] text-gray py-2 font-medium ${
                loading ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-100'
              }`}
            >
              Cancelar compra
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}