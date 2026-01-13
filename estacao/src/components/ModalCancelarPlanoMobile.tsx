"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ModalCancelarPlanoMobile({ open, onClose, onConfirm }: Props) {
  // Fecha o modal ao pressionar ESC
  useEscapeKey(open, onClose);
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
          <div className="relative flex flex-col items-center p-4 border-b border-gray-200">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-xl font-bold text-gray-600"
              aria-label="Fechar"
            >
              ×
            </button>
            <span className="block text-base font-semibold text-gray-800 mb-2 text-center">
              Cancelar Plano
            </span>
          </div>
          {/* Conteúdo */}
          <div className="p-4 flex-1 flex flex-col overflow-y-auto text-gray-800 text-sm leading-relaxed">
            <span className="mb-2 font-medium text-center text-[18px] text-[#606C76]">
              Você está realizando o cancelamento de seu plano
            </span>
            <span className="mb-4 font-normal text-center text-[16px] text-[#606C76]">
              Após o cancelamento, você precisará agendar uma nova consulta de acordo com a disponibilidade de agenda do profissional.
            </span>
            <div className="flex-grow" />
            <div className="flex flex-col gap-2 w-full">
              <button
                className="w-full h-10 rounded-[6px] bg-[#6D75C0] text-white font-medium text-base cursor-pointer hover:bg-[#4F46E5] transition"
                onClick={onConfirm}
              >
                Sim, desejo cancelar meu plano
              </button>
              <button
                className="w-full h-10 rounded-[6px] border border-[#6D75C0] text-[#6D75C0] font-medium text-base bg-white cursor-pointer hover:bg-[#E6E9FF] transition"
                onClick={onClose}
              >
                Cancelar
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
