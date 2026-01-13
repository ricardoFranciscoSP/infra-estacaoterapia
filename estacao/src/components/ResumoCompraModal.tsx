import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface ResumoCompraModalProps {
  showModal: boolean;
  onClose: () => void;
  loading: boolean;
  quantity: number;
  unitValue: number;
  activeTab: "credito" | "pix";
  mainForm: {
    numeroCartao: string;
    nomeTitular: string;
    validade: string;
    cvv: string;
  };
  getCardLogo: () => string;
  getLast4Digits: (numero: string) => string;
  handleConfirmarModal: () => void;
  isPlano?: boolean; // Indica se é compra de plano
  planoNome?: string; // Nome do plano (quando isPlano for true)
  isConsultaPromocional?: boolean; // Indica se é consulta promocional (primeira consulta)
}

const ResumoCompraModal: React.FC<ResumoCompraModalProps> = ({
  showModal,
  onClose,
  loading,
  quantity,
  unitValue,
  activeTab,
  mainForm,
  getCardLogo,
  getLast4Digits,
  handleConfirmarModal,
  isPlano = false,
  planoNome,
  isConsultaPromocional = false,
}) => {
  // Fecha o modal ao pressionar ESC
  useEscapeKey(showModal, onClose);
  
  // Travar/destravar scroll do body ao abrir/fechar modal mobile
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [showModal]);
  // Versão desktop
  const DesktopModal = (
    <div className="fixed inset-0 z-[99999] pointer-events-none items-center justify-center bg-opacity-30 hidden sm:flex" style={{ width: '100vw', height: '100vh' }}>
      <div className="rounded-xl shadow-2xl border border-[#e3e6e8] relative w-[95vw] max-w-[588px] min-h-[400px] bg-white flex flex-col pointer-events-auto" style={{ minWidth: 320 }}>
        <div className="flex items-center justify-center relative w-full h-[56px] rounded-t-xl bg-[#8494E9] px-6 py-4" style={{ borderBottom: '1px solid #e3e6e8' }}>
          <span className="text-[20px] font-semibold text-[#FCFBF6] w-full text-center">
            Resumo da compra
          </span>
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#FCFBF6] text-2xl font-bold cursor-pointer hover:bg-[#6D75C0] hover:text-white transition-colors"
            onClick={onClose}
            aria-label="Fechar"
            style={{ lineHeight: 1 }}
          >
            ×
          </button>
        </div>
        <div className="flex-1 pt-4 px-8 pb-8 bg-white rounded-b-xl">
          {isConsultaPromocional && (
            <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="mb-1">
                <span className="font-semibold text-yellow-800">Consulta promocional</span>
              </div>
              <div>
                <span className="text-sm text-yellow-700">Validade: 30 dias</span>
              </div>
            </div>
          )}
          <div className="mb-2">
            {isPlano && planoNome ? (
              <span className="font-medium">Plano contratado:</span>
            ) : (
              <span className="font-medium">Quantidade de consultas:</span>
            )}{" "}
            {isPlano && planoNome ? planoNome : quantity}
          </div>
          <div className="mb-2">
            <span className="font-medium">Valor unitário:</span> R$ {unitValue.toFixed(2).replace('.', ',')}
          </div>
          <div className="mb-2">
            <span className="font-medium">Valor total:</span> R$ {(quantity * unitValue).toFixed(2).replace('.', ',')}
          </div>
          <div className="mb-2">
            <span className="font-medium">Forma de pagamento:</span> {activeTab === 'credito' ? 'Cartão de Crédito' : 'Pix'}
          </div>
          {activeTab === 'credito' && (
            <div className="mb-2 flex items-center gap-2">
              <span className="font-medium">Cartão:</span>
              <Image src={getCardLogo()} alt="Bandeira" className="w-6 h-6" width={24} height={24} />
              <span>
                {mainForm.nomeTitular} (Final {getLast4Digits(mainForm.numeroCartao)})
              </span>
            </div>
          )}
          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="flex w-full justify-center gap-4">
              <button
                className="w-full px-6 bg-white border border-[#8494E9] text-[#8494E9] py-2 rounded-lg font-medium text-center shadow-sm mr-2 cursor-pointer hover:bg-[#f3f4fa] hover:border-[#6D75C0] transition-colors"
                onClick={onClose}
                disabled={loading}
              >
                Fechar
              </button>
              <button
                className={`w-full px-6 bg-[#8494E9] text-white py-2 rounded-lg font-medium flex items-center justify-center text-center shadow-sm border border-[#8494E9] ml-2 cursor-pointer hover:bg-[#6D75C0] transition-colors ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
                onClick={handleConfirmarModal}
                disabled={loading}
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                ) : null}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Versão mobile ajustada
  const MobileModal = (
    <AnimatePresence>
      {showModal && (
        <motion.div
          className="fixed inset-0 z-[99999] sm:hidden flex flex-col justify-end bg-transparent"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ duration: 0.3 }}
          style={{ width: '100vw', height: '100vh', overscrollBehavior: 'contain' }}
        >
          <motion.div
            className="w-full bg-white rounded-t-2xl shadow-xl flex flex-col"
            initial={{ y: 0 }}
            animate={{ y: 0 }}
            exit={{ y: 0 }}
            style={{ minHeight: '100vh', maxHeight: '100vh', height: '100vh', position: 'relative' }}
          >
            <div className="relative flex flex-col items-center p-4 bg-[#8494E9] rounded-t-2xl" style={{ minHeight: 60 }}>
              <button onClick={onClose} className="absolute right-4 top-4 text-2xl font-bold text-[#FCFBF6]">
                ×
              </button>
              <span className="block text-[20px] font-semibold text-[#FCFBF6] mb-2 text-center">Resumo da compra</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 text-gray-800 text-sm leading-relaxed" style={{ minHeight: 0, paddingBottom: 300 }}>
              {isConsultaPromocional && (
                <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="mb-1">
                    <span className="font-semibold text-yellow-800">Consulta promocional</span>
                  </div>
                  <div>
                    <span className="text-sm text-yellow-700">Validade: 30 dias</span>
                  </div>
                </div>
              )}
              <div className="mb-2">
                {isPlano && planoNome ? (
                  <span className="font-medium">Plano contratado:</span>
                ) : (
                  <span className="font-medium">Quantidade de consultas:</span>
                )}{" "}
                {isPlano && planoNome ? planoNome : quantity}
              </div>
              <div className="mb-2">
                <span className="font-medium">Valor unitário:</span> R$ {unitValue.toFixed(2).replace('.', ',')}
              </div>
              <div className="mb-2">
                <span className="font-medium">Valor total:</span> R$ {(quantity * unitValue).toFixed(2).replace('.', ',')}
              </div>
              <div className="mb-2">
                <span className="font-medium">Forma de pagamento:</span> {activeTab === 'credito' ? 'Cartão de Crédito' : 'Pix'}
              </div>
              {activeTab === 'credito' && (
                <div className="mb-2 flex items-center gap-2">
                  <span className="font-medium">Cartão:</span>
                  <Image src={getCardLogo()} alt="Bandeira" className="w-6 h-6" width={24} height={24} />
                  <span>
                    {mainForm.nomeTitular} (Final {getLast4Digits(mainForm.numeroCartao)})
                  </span>
                </div>
              )}
            </div>
            <div className="w-full px-4 bg-white flex justify-center items-center gap-4" style={{ position: 'absolute', left: 0, bottom: '200px', width: '100%' }}>
              <button
                className="min-w-[120px] px-4 bg-white border border-[#8494E9] text-[#8494E9] py-2 rounded-lg font-medium text-center"
                onClick={onClose}
                disabled={loading}
              >
                Fechar
              </button>
              <button
                className={`min-w-[120px] px-4 bg-[#8494E9] text-white py-2 rounded-lg font-medium flex items-center justify-center text-center ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
                onClick={handleConfirmarModal}
                disabled={loading}
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                ) : null}
                Confirmar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (!showModal) return null;
  return (
    <>
      {DesktopModal}
      {MobileModal}
    </>
  );
};

export default ResumoCompraModal;
