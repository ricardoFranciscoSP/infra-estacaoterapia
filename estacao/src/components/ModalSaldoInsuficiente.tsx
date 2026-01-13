"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface ModalSaldoInsuficienteProps {
  open: boolean;
  onClose: () => void;
}

export default function ModalSaldoInsuficiente({
  open,
  onClose,
}: ModalSaldoInsuficienteProps) {
  // Fecha o modal ao pressionar ESC
  useEscapeKey(open, onClose);
  
  const router = useRouter();

  const handleComprarConsulta = () => {
    onClose();
    router.push("/painel/planos");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-center bg-transparent"
          style={{ paddingTop: '196px' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative flex flex-col w-[588px] h-[376px] rounded-[8px] bg-white shadow-xl opacity-100"
            initial={{ scale: 0.9, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 40 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-center relative w-full h-[56px] bg-[#6D75C0] rounded-t-[8px] px-6 py-4">
              <span className="text-white font-semibold text-[16px] leading-5 text-center">
                Saldo Insuficiente
              </span>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 bg-transparent cursor-pointer text-white hover:opacity-70 transition"
                onClick={onClose}
                aria-label="Fechar"
                style={{ fontSize: "1.5rem", lineHeight: "1" }}
              >
                ×
              </button>
            </div>

            {/* Conteúdo */}
            <div className="flex flex-col w-full h-[320px] px-6 py-4">
              <div className="flex flex-col w-full flex-1 justify-center overflow-hidden">
                <div className="flex items-center justify-center mb-3">
                  <div className="w-16 h-16 bg-[#FFF3CD] rounded-full flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-8 h-8 text-[#856404]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                </div>
                
                <p className="font-bold text-[#606C76] text-[16px] leading-6 mb-2 text-center">
                  Você não possui consultas disponíveis
                </p>
                
                <p className="text-[#606C76] text-[14px] leading-6 mb-3 text-center">
                  Para agendar uma consulta, é necessário possuir um plano ativo com consultas disponíveis no ciclo ou uma consulta avulsa válida.
                </p>
                
                <p className="text-[#606C76] text-[14px] leading-6 text-center mb-4">
                  Deseja adquirir um plano ou consulta avulsa?
                </p>
              </div>

              <div className="flex flex-col gap-3 w-full flex-shrink-0">
                <button
                  className="w-full h-10 rounded-[8px] bg-[#6D75C0] text-white font-medium text-[14px] leading-5 cursor-pointer hover:bg-[#5A5F9E] transition-colors flex items-center justify-center gap-2"
                  onClick={handleComprarConsulta}
                >
                  Comprar consulta
                </button>
                <button
                  className="w-full h-10 rounded-[8px] border border-[#6D75C0] text-[#6D75C0] bg-white font-medium text-[14px] leading-5 cursor-pointer hover:bg-[#F5F7FF] transition-colors"
                  onClick={onClose}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

