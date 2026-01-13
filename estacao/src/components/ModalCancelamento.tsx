"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isMobile?: boolean;
  mensagem?: string | null;
  loading?: boolean;
  multaMensagem?: string | null;
  multaValor?: number | null;
}

export default function ModalCancelamento({
  open,
  onClose,
  onConfirm,
  isMobile = true,
  loading = false,
  multaMensagem,
  multaValor,
}: Props) {
  // Formata o valor da multa
  const formatarValor = (valor: number | null | undefined) => {
    if (!valor) return null;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  // Desktop
  if (!isMobile) {
    return (
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-transparent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          >
            <motion.div
              className="relative flex flex-col w-[588px] rounded-[8px] bg-white shadow-xl"
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-center relative w-full h-[56px] bg-[#6D75C0] rounded-t-[8px]">
                <span className="text-white font-semibold text-[16px] leading-5 text-center">
                  Cancelamento de plano
                </span>
                <button
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 bg-transparent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-white hover:opacity-70 transition"
                  onClick={onClose}
                  aria-label="Fechar"
                  style={{ fontSize: "1.5rem", lineHeight: "1" }}
                  disabled={loading}
                >
                  ×
                </button>
              </div>
              {/* Conteúdo */}
              <div className="flex flex-col w-full px-6 py-6">
                <div className="flex flex-col w-full mb-6">
                  <p className="font-bold text-[#606C76] text-[15px] leading-6 mb-4">
                    Você está realizando o cancelamento do seu plano
                  </p>
                  <p className="text-[#606C76] text-[14px] leading-6 mb-3">
                    Após o cancelamento, você precisará adquirir um novo plano de acordo com a disponibilidade.
                  </p>
                  
                  {/* Mensagem sobre multa */}
                  {(multaMensagem || multaValor) ? (
                    <>
                      <p className="text-[#606C76] text-[14px] leading-6 mb-3">
                        De acordo com o contrato, o cancelamento antes do término da fidelidade implica em multa de 20% sobre o valor do plano.
                      </p>
                      <div className="bg-[#FFF3CD] border-l-4 border-[#FFC107] p-3 mb-4 rounded">
                        <p className="text-[#856404] text-[14px] leading-6 font-medium mb-1">
                          {multaMensagem || "Multa por descomprometimento do prazo contratual"}
                        </p>
                        {multaValor && (
                          <p className="text-[#856404] text-[14px] leading-6 font-bold">
                            Valor da multa: {formatarValor(multaValor)}
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-[#606C76] text-[14px] leading-6 mb-4">
                      Caso deseje, você pode adquirir um novo plano sem custo adicional.
                    </p>
                  )}
                  
                  <p className="font-bold text-[#606C76] text-[15px] leading-6 mt-2">
                    Deseja continuar com o cancelamento?
                  </p>
                </div>
                
                <div className="flex flex-col gap-3 w-full">
                  <button
                    className="w-full h-10 rounded-[8px] bg-[#6D75C0] text-white font-medium text-[14px] leading-5 cursor-pointer hover:bg-[#5A5F9E] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                    onClick={onConfirm}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Cancelando...
                      </>
                    ) : (
                      'Sim, desejo cancelar plano'
                    )}
                  </button>
                  <button
                    className="w-full h-10 rounded-[8px] border border-[#6D75C0] text-[#6D75C0] bg-white font-medium text-[14px] leading-5 cursor-pointer hover:bg-[#F5F7FF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    onClick={onClose}
                    disabled={loading}
                  >
                    Não, desejo manter o plano
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Mobile
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 bg-white z-50 sm:hidden flex flex-col"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          {/* Header */}
          <div className="relative flex items-center justify-center w-full h-[56px] bg-[#6D75C0]">
            <span className="text-white font-semibold text-[16px] leading-5 text-center">
              Cancelamento de plano
            </span>
            <button
              onClick={onClose}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-transparent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-70 transition"
              aria-label="Fechar"
              style={{ fontSize: "1.5rem", lineHeight: "1" }}
              disabled={loading}
            >
              ×
            </button>
          </div>
          {/* Conteúdo */}
          <div className="p-6 flex-1 flex flex-col overflow-y-auto">
            <div className="flex flex-col w-full mb-6">
              <p className="font-bold text-[#606C76] text-[15px] leading-6 mb-4">
                Você está realizando o cancelamento do seu plano
              </p>
              <p className="text-[#606C76] text-[14px] leading-6 mb-3">
                Após o cancelamento, você precisará adquirir um novo plano de acordo com a disponibilidade.
              </p>
              
              {/* Mensagem sobre multa */}
              {(multaMensagem || multaValor) ? (
                <>
                  <p className="text-[#606C76] text-[14px] leading-6 mb-3">
                    De acordo com o contrato, o cancelamento antes do término da fidelidade implica em multa de 20% sobre o valor do plano.
                  </p>
                  <div className="bg-[#FFF3CD] border-l-4 border-[#FFC107] p-3 mb-4 rounded">
                    <p className="text-[#856404] text-[14px] leading-6 font-medium mb-1">
                      {multaMensagem || "Multa por descomprometimento do prazo contratual"}
                    </p>
                    {multaValor && (
                      <p className="text-[#856404] text-[14px] leading-6 font-bold">
                        Valor da multa: {formatarValor(multaValor)}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-[#606C76] text-[14px] leading-6 mb-4">
                  Caso deseje, você pode adquirir um novo plano sem custo adicional.
                </p>
              )}
              
              <p className="font-bold text-[#606C76] text-[15px] leading-6 mt-2">
                Deseja continuar com o cancelamento?
              </p>
            </div>
            
            <div className="flex-grow" />
            <div className="flex flex-col gap-3 w-full">
              <button
                className="w-full h-12 rounded-[8px] bg-[#6D75C0] text-white font-medium text-[14px] leading-5 cursor-pointer hover:bg-[#5A5F9E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                onClick={onConfirm}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Cancelando...
                  </>
                ) : (
                  'Sim, desejo cancelar plano'
                )}
              </button>
              <button
                className="w-full h-12 rounded-[8px] border border-[#6D75C0] text-[#6D75C0] font-medium text-[14px] leading-5 bg-white cursor-pointer hover:bg-[#F5F7FF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onClose}
                disabled={loading}
              >
                Não, desejo manter o plano
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}