"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isMobile?: boolean;
  planoId?: string | null;
}

export default function ModalMudarPlano({ open, onClose, onConfirm, isMobile = true}: Props) {
  // Fecha o modal ao pressionar ESC
  useEscapeKey(open, onClose);
  // Versão Desktop
  if (!isMobile) {
    return (
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-transparent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative flex flex-col items-center w-[588px] h-[376px] rounded-[8px] bg-[#fff] opacity-100 border border-[#6366F1]"
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
            >
              {/* Header */}
              <div className="flex items-center justify-center relative w-[588px] h-[56px] bg-[#6366F1] rounded-t-[8px]">
                <span className="text-white font-semibold text-[20px] leading-6 text-center w-full">
                  Mudar de Plano
                </span>
                <button
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 bg-transparent cursor-pointer"
                  onClick={onClose}
                  aria-label="Fechar"
                  style={{ fontSize: "2rem", color: "#fff" }}
                >
                  ×
                </button>
              </div>
              {/* Conteúdo */}
              <div className="flex flex-col items-center justify-center w-full px-6 flex-1">
                <div className="flex flex-col items-center justify-center w-full mt-8">
                  <span className="font-medium text-[18px] leading-6 text-[#606C76] text-center">
                    Você está solicitando a mudança de plano
                  </span>
                  <span className="font-normal text-[16px] leading-6 text-[#606C76] text-center mt-4">
                    Ao mudar de plano, as condições e valores podem ser alterados conforme o novo plano escolhido.
                  </span>
                </div>
                <div className="flex flex-col gap-2 w-full items-center mt-10">
                  <button
                    className="w-[540px] h-8 rounded-[4px] bg-[#6366F1] text-white font-medium text-[16px] leading-6 cursor-pointer hover:bg-[#4F46E5]"
                    onClick={onConfirm}
                  >
                    Sim, desejo mudar de plano
                  </button>
                  <button
                    className="w-[540px] h-8 rounded-[4px] border border-[#6366F1] text-[#6366F1] bg-white font-medium text-[16px] leading-6 cursor-pointer hover:bg-[#E6E9FF]"
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

  // Versão Mobile
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
              Mudar de Plano
            </span>
          </div>
          {/* Conteúdo */}
          <div className="p-4 flex-1 flex flex-col overflow-y-auto text-gray-800 text-sm leading-relaxed">
            <span className="mb-2 font-medium text-center text-[18px] text-[#606C76]">
              Você está solicitando a mudança de plano
            </span>
            <span className="mb-4 font-normal text-center text-[16px] text-[#606C76]">
              Ao mudar de plano, as condições e valores podem ser alterados conforme o novo plano escolhido.
            </span>
            <div className="flex-grow" />
            <div className="flex flex-col gap-2 w-full">
              <button
                className="w-full h-10 rounded-[6px] bg-[#6366F1] text-white font-medium text-base cursor-pointer hover:bg-[#4F46E5] transition"
                onClick={onConfirm}
              >
                Sim, desejo mudar de plano
              </button>
              <button
                className="w-full h-10 rounded-[6px] border border-[#6366F1] text-[#6366F1] font-medium text-base bg-white cursor-pointer hover:bg-[#E6E9FF] transition"
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
