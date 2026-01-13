"use client";
import PainelSidebar from "@/components/PainelSidebar";
import Image from "next/image";
import React, { useState } from "react";
import BreadcrumbsVoltar from "@/components/BreadcrumbsVoltar";
import { clearSensitiveState } from "@/utils/securePayment";
import { 
    maskCreditCard, 
    maskCardExpiry, 
    getCardLogo,
    validateCardForm
} from "@/utils/cardValidation";
import { generateGatewayToken } from "@/lib/vindiGateway";
import { getPaymentCompanyInfo } from "@/utils/checkoutUtils";
import { api } from "@/lib/axios";
import CvvModal from "@/components/CvvModal";

// Cartão de exemplo dinâmico
function CartaoExemplo({
    numeroCartao,
    nomeTitular,
    validade,
    cvv,
    isCardFlipped,
}: {
    numeroCartao: string;
    nomeTitular: string;
    validade: string;
    cvv: string;
    isCardFlipped: boolean;
}) {
    return (
        <div className="relative w-full max-w-[320px] md:w-[320px] h-[180px] md:h-[200px] perspective">
            <div className={`transition-transform duration-500 ${isCardFlipped ? "rotate-y-180" : ""} w-full h-full`}>
                {/* Frente do cartão */}
                <div className={`absolute w-full h-full bg-gradient-to-br from-[#8494E9] to-[#23272F] rounded-xl shadow-lg text-white backface-hidden flex flex-col justify-between p-6 ${isCardFlipped ? "hidden" : ""}`}>
                    <div className="flex justify-between items-center">
                        <Image 
                            src={getCardLogo(numeroCartao)} 
                            alt="Bandeira" 
                            className="h-8 w-auto object-contain" 
                            width={50} 
                            height={32} 
                        />
                        <span className="text-xs">Crédito</span>
                    </div>
                    <div>
                        <div className="text-base md:text-lg tracking-widest font-mono mb-2">{numeroCartao || "0000 0000 0000 0000"}</div>
                        <div className="flex justify-between items-end">
                            <div>
                                <div className="text-[10px]">Nome</div>
                                <div className="text-sm font-semibold">{nomeTitular || "NOME DO TITULAR"}</div>
                            </div>
                            <div>
                                <div className="text-[10px]">Validade</div>
                                <div className="text-sm font-semibold">{validade || "MM/AA"}</div>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Verso do cartão */}
                <div className={`absolute w-full h-full bg-gradient-to-br from-[#23272F] to-[#8494E9] rounded-xl shadow-lg text-white backface-hidden flex flex-col justify-end p-6 rotate-y-180 ${isCardFlipped ? "" : "hidden"}`}>
                    <div className="mb-2">
                        <div className="bg-black h-6 w-full rounded mb-4"></div>
                        <div className="flex justify-end items-center">
                            <span className="bg-white text-black px-4 py-1 rounded font-mono text-sm">{cvv || "***"}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function TrocaCartaoPage() {
    const [numero, setNumero] = useState("");
    const [nome, setNome] = useState("");
    const [validade, setValidade] = useState("");
    const [cvv, setCvv] = useState("");
    const [isCardFlipped, setIsCardFlipped] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [showCvvModal, setShowCvvModal] = useState(false);

    // Função para bloquear caracteres especiais (igual ao checkout)
    function blockSpecialChars(e: React.KeyboardEvent<HTMLInputElement>) {
        const allowed = /[0-9]/;
        if (!allowed.test(e.key) && e.key.length === 1) {
            e.preventDefault();
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        
        // Limpar mensagens anteriores
        setSuccessMessage("");
        setErrorMessage("");
        
        // Validação usando o novo sistema
        const validation = validateCardForm({
            numero,
            nome,
            validade,
            cvv
        });

        if (!validation.isValid) {
            setErrors(validation.errors);
            return;
        }

        setErrors({});
        setLoading(true);

        try {
            // 1. Gerar gateway_token usando a mesma lógica do checkout (tokenização)
            const tokenObj = await generateGatewayToken({
                nomeTitular: nome,
                numeroCartao: numero,
                validade: validade,
                cvv: cvv,
                getPaymentCompanyInfo: getPaymentCompanyInfo
            });

            if (!tokenObj.gateway_token) {
                throw new Error("Erro ao gerar token de pagamento.");
            }

            // 2. Obter payment_company_code
            const paymentInfo = getPaymentCompanyInfo(numero);
            if (!paymentInfo.payment_company_code) {
                throw new Error("Bandeira do cartão não suportada.");
            }

            // 3. Chamar API de troca de cartão
            const response = await api.post('/troca-cartao', {
                nomeTitular: nome,
                numeroCartao: numero.replace(/\D/g, ""),
                validade: validade,
                cvv: cvv,
                gateway_token: tokenObj.gateway_token,
                payment_company_code: paymentInfo.payment_company_code
            });

            if (response.data.success) {
                setSuccessMessage("Cartão atualizado com sucesso!");
                
                // Após enviar, limpe dados sensíveis
                clearSensitiveState((updater) => {
                    setNumero("");
                    setValidade("");
                    setCvv("");
                    setNome("");
                    return updater;
                });

                // Redirecionar após 2 segundos
                setTimeout(() => {
                    window.location.href = '/painel/';
                }, 2000);
            } else {
                setErrorMessage(response.data.message || "Erro ao atualizar cartão.");
            }
        } catch (error) {
            console.error('Erro ao trocar cartão:', error);
            let errorMsg = "Erro ao processar troca de cartão. Tente novamente.";
            
            if (error && typeof error === 'object') {
                const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
                errorMsg = axiosError.response?.data?.message || axiosError.message || errorMsg;
            } else if (error instanceof Error) {
                errorMsg = error.message || errorMsg;
            }
            
            setErrorMessage(errorMsg);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#FCFBF6] max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8 flex flex-col md:flex-row gap-8">
            {/* Sidebar apenas no desktop */}
            <div className="hidden md:block">
                <PainelSidebar active="/painel/minha-conta/trocar-cartao" />
            </div>
            
            <main className="flex-1">
                {/* Navegação para mobile */}
                <div className="md:hidden mb-4">
                    <BreadcrumbsVoltar />
                </div>
                
                <h1 className="text-xl md:text-2xl font-bold mb-6 text-[#23272F]">Troca de Cartão de Crédito</h1>
                <div className="mb-8">
                    <div className="flex justify-center md:justify-start">
                        <CartaoExemplo
                            numeroCartao={numero}
                            nomeTitular={nome}
                            validade={validade}
                            cvv={cvv}
                            isCardFlipped={isCardFlipped}
                        />
                    </div>
                </div>
                <form className="bg-[#F1F2F4] rounded-lg p-6 shadow" onSubmit={handleSubmit}>
                    <h2 className="text-lg font-semibold mb-4 text-[#23272F]">Novo cartão</h2>
                    
                    {/* Mensagens de feedback */}
                    {successMessage && (
                        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
                            {successMessage}
                        </div>
                    )}
                    {errorMessage && (
                        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                            {errorMessage}
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Número do cartão</label>
                            <input
                                type="text"
                                className={`border ${errors.numero ? 'border-red-500' : 'border-gray-300'} rounded px-3 py-2 w-full`}
                                placeholder="0000 0000 0000 0000"
                                value={numero}
                                onChange={e => setNumero(maskCreditCard(e.target.value))}
                                onKeyDown={blockSpecialChars}
                                required
                                maxLength={19}
                                inputMode="numeric"
                                autoComplete="off"
                                title="Digite 16 dígitos no formato 5555 5555 5555 5557 ou 5555555555555557"
                            />
                            {errors.numero && <p className="text-red-500 text-xs mt-1">{errors.numero}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome impresso no cartão</label>
                            <input
                                type="text"
                                className={`border ${errors.nome ? 'border-red-500' : 'border-gray-300'} rounded px-3 py-2 w-full`}
                                placeholder="Nome Completo"
                                value={nome}
                                onChange={e => setNome(e.target.value.toUpperCase())}
                                required
                            />
                            {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Validade</label>
                            <input
                                type="text"
                                className={`border ${errors.validade ? 'border-red-500' : 'border-gray-300'} rounded px-3 py-2 w-full`}
                                placeholder="MM/AA"
                                value={validade}
                                onChange={e => setValidade(maskCardExpiry(e.target.value))}
                                onKeyDown={blockSpecialChars}
                                required
                                maxLength={5}
                                inputMode="numeric"
                                autoComplete="off"
                                title="Informe no formato MM/AA (mês 01-12)"
                            />
                            {errors.validade && <p className="text-red-500 text-xs mt-1">{errors.validade}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                CVV
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCardFlipped(true);
                                        setShowCvvModal(true);
                                    }}
                                    className="inline-flex items-center justify-center"
                                    tabIndex={-1}
                                >
                                    <Image 
                                        src="/assets/icons/duvida.svg" 
                                        alt="Dúvida CVV" 
                                        width={16} 
                                        height={16}
                                        className="cursor-pointer"
                                    />
                                </button>
                            </label>
                            <div className="relative">
                                <input
                                    type="password"
                                    className={`border ${errors.cvv ? 'border-red-500' : 'border-gray-300'} rounded px-3 py-2 w-full`}
                                    placeholder="CVV"
                                    value={cvv}
                                    onChange={e => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        if (value.length <= 4) {
                                            setCvv(value);
                                        }
                                    }}
                                    onKeyDown={blockSpecialChars}
                                    required
                                    maxLength={4}
                                    onFocus={() => setIsCardFlipped(true)}
                                    onBlur={() => setIsCardFlipped(false)}
                                    inputMode="numeric"
                                    autoComplete="off"
                                    title="3 ou 4 dígitos"
                                />
                            </div>
                            {errors.cvv && <p className="text-red-500 text-xs mt-1">{errors.cvv}</p>}
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full bg-[#8494E9] text-white px-6 py-3 rounded-lg font-semibold transition duration-200 ${
                            loading 
                                ? 'opacity-50 cursor-not-allowed' 
                                : 'hover:bg-[#6D75C0] cursor-pointer'
                        }`}
                    >
                        {loading ? 'Processando...' : 'Trocar cartão'}
                    </button>
                </form>
            </main>
            
            {/* Modal CVV */}
            <CvvModal
                show={showCvvModal}
                onClose={() => {
                    setShowCvvModal(false);
                    setIsCardFlipped(false);
                }}
            />
        </div>
    );
}
