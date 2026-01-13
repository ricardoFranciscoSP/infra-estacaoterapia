import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Plano } from "@/store/planoStore";
import { useEscapeKey } from "@/hooks/useEscapeKey";


interface ModalConfirmarCompraProps {
    show: boolean;
    onClose: () => void;
    onConfirm: (e: React.FormEvent) => void;
    isLoading: boolean;
    plano: Plano;
    getCardFinal: () => string;
    getCardLogo: () => string;
    endereco?: {
        cep: string;
        rua: string;
        numero: string;
        complemento: string;
        bairro: string;
        cidade: string;
        estado: string;
    };
    cartao?: {
        gateway_token?: unknown;
        numeroCartao: string;
        nomeTitular: string;
        validade: string;
        cvv: string;
        bandeira: string;
        last4: string;
        payment_company_code: string;
        payment_company_id: number | string;
        payment_method_code: string;
    };
}

const ModalConfirmarCompra: React.FC<ModalConfirmarCompraProps> = ({
    show,
    onClose,
    onConfirm,
    isLoading,
    plano,
    getCardFinal,
    getCardLogo
}) => {
    // Fecha o modal ao pressionar ESC
    useEscapeKey(show, onClose);
    
    if (!show) return null;

    return (
        <>
            {/* Desktop */}
            <div className="hidden md:flex fixed inset-0 z-[9999] items-center justify-center bg-opacity-40">
                {/* Fundo transparente removido */}
                <div
                    className="w-[95vw] max-w-[588px] h-[312px] bg-white rounded-lg shadow-lg flex flex-col relative"
                    style={{ opacity: 1 }}
                >
                    {/* Header */}
                    <div
                        className="w-full h-[56px] flex items-center justify-center px-6 py-3 rounded-t-lg relative"
                        style={{ background: "#8494E9", padding: '16px 24px' }}
                    >
                        <span className="text-white text-lg font-semibold text-center w-full">
                            Deseja confirmar compra ?
                        </span>
                        {/* Ícone X para fechar */}
                        <button
                            className="absolute right-6 top-4 text-white text-2xl font-bold"
                            onClick={onClose}
                            aria-label="Fechar"
                            type="button"
                        >
                            ×
                        </button>
                    </div>
                    {/* Conteúdo */}
                    <div className="flex-1 flex flex-col justify-between px-6 py-4 bg-white">
                        <div>
                            <div className="mb-2 text-base text-[#23272F]">
                                <span className="font-semibold">Plano:</span> {plano?.Nome || "Assinatura mensal"}
                            </div>
                            <div className="mb-2 text-base text-[#23272F]">
                                <span className="font-semibold">Valor total:</span> R$ {plano?.Preco?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || "0,00"}/mês
                            </div>
                            <div className="mb-4 flex items-center text-base text-[#23272F]">
                                <span className="font-semibold">Pagamento:</span>
                                <span className="ml-2">cartão de crédito Final {getCardFinal()}</span>
                                <Image src={getCardLogo()} alt="Bandeira" className="ml-2 w-8 h-6 object-contain" width={32} height={24} />
                            </div>
                            <div className="text-xs text-[#6B7280] mb-2">
                                As consultas do plano são válidas por 30 dias e não acumulam para o próximo mês*
                            </div>
                        </div>
                        <div className="flex w-full gap-2 mt-4">
                        <div className="flex w-full justify-center gap-2 mt-4">
                            <button
                                className="h-8 min-w-[120px] flex items-center justify-center gap-2 rounded bg-[#8494E9] text-white font-medium text-sm"
                                style={{ borderRadius: 4, paddingLeft: 24, paddingRight: 24, opacity: 1 }}
                                onClick={onConfirm}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Image src="/assets/icons/spinner.svg" alt="" className="w-5 h-5 animate-spin" width={20} height={20} />
                                ) : (
                                    'Confirmar compra'
                                )}
                            </button>
                            <button
                                className="h-8 min-w-[120px] flex items-center justify-center gap-2 rounded bg-gray-200 text-[#23272F] font-medium text-sm"
                                style={{ borderRadius: 4, paddingLeft: 24, paddingRight: 24, opacity: 1 }}
                                onClick={onClose}
                                disabled={isLoading}
                            >
                                Cancelar
                            </button>
                        </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Mobile */}
            <AnimatePresence>
                {show && (
                    <motion.div
                        className="md:hidden fixed inset-0 z-[9999] flex flex-col bg-transparent"
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                        <div className="flex flex-col bg-white h-full">
                            {/* Header mobile igual ModalMudarPlanoMobile */}
                            <div className="relative flex flex-col items-center p-4 border-b border-gray-200">
                                {/* Ícone X para fechar */}
                                <button
                                    onClick={onClose}
                                    className="absolute right-4 top-4 text-xl font-bold text-gray-600"
                                    aria-label="Fechar"
                                >
                                    ×
                                </button>
                                <span className="block text-base font-semibold text-gray-800 mb-2 text-center">
                                    Deseja confirmar compra ?
                                </span>
                            </div>
                            {/* Conteúdo ajustado mobile */}
                            <div className="flex flex-col px-6 py-4 flex-1 overflow-y-auto">
                                <div className="mb-4 text-base text-[#23272F]">
                                    <span className="font-semibold">Plano:</span> {plano?.Nome || "Assinatura mensal"}
                                </div>
                                <div className="mb-4 text-base text-[#23272F]">
                                    <span className="font-semibold">Valor total:</span> R$ {plano?.Preco?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || "0,00"}/mês
                                </div>
                                <div className="mb-4 flex items-center text-base text-[#23272F]">
                                    <span className="font-semibold">Pagamento:</span>
                                    <span className="ml-2">cartão de crédito Final {getCardFinal()}</span>
                                    <Image src={getCardLogo()} alt="Bandeira" className="ml-2 w-8 h-6 object-contain" width={32} height={24} />
                                </div>
                                <div className="text-xs text-[#6B7280] mb-2">
                                    As consultas do plano são válidas por 30 dias e não acumulam para o próximo mês*
                                </div>
                            </div>
                            {/* Botões Cancelar e Confirmar (invertidos) */}
                            <div className="p-4 flex gap-2">
                                <button
                                    className="flex-1 h-12 rounded bg-gray-200 text-[#23272F] font-medium text-base flex items-center justify-center gap-2"
                                    style={{ borderRadius: 8, opacity: 1 }}
                                    onClick={onClose}
                                    disabled={isLoading}
                                >
                                    Cancelar
                                </button>
                                <button
                                    className="flex-1 h-12 rounded bg-[#8494E9] text-white font-medium text-base flex items-center justify-center gap-2"
                                    style={{ borderRadius: 8, opacity: 1 }}
                                    onClick={onConfirm}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <Image src="/assets/icons/spinner.svg" alt="" className="w-5 h-5 animate-spin" width={20} height={20} />
                                    ) : (
                                        'Confirmar compra'
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default ModalConfirmarCompra;
