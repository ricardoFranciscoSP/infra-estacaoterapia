"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export default function CadastroIncompletoModalMobile({ open, onClose, onSubmit }: Props) {
  // Fecha o modal ao pressionar ESC
  useEscapeKey(open, onClose);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute top-0 left-0 w-full h-full bg-white z-[9999] sm:hidden flex flex-col"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ duration: 0.3 }}
        >
          {/* Cabeçalho */}
          <div className="relative flex flex-col items-center p-4 border-b border-gray-200">
            <button onClick={onClose} className="absolute right-4 top-4 text-xl font-bold text-gray-600">
              ×
            </button>
            <span className="block text-base font-semibold text-gray-800 mb-2 text-center">Complete seu cadastro</span>
          </div>
          {/* Conteúdo */}
          <div className="p-4 flex-1 flex flex-col overflow-y-auto text-gray-800 text-sm leading-relaxed text-center">
            <p className="mb-4 text-[#222] text-base font-medium">
              Alguns dados no seu cadastro precisam ser preenchidos para que você continue aproveitando a nossa plataforma.
            </p>
            <p className="mb-8 text-[#222] text-base font-medium">
              Complete seu cadastro agora e aproveite para agendar sua primeira sessão conosco.
            </p>
            <div className="flex-grow" />
            <button
              className="w-full py-3 rounded bg-[#8494E9] text-white font-semibold text-base hover:bg-[#6b7acb] transition mb-3"
              onClick={onSubmit}
            >
              Concluir cadastro
            </button>
            <button
              className="w-full py-3 rounded border border-[#8494E9] text-[#8494E9] font-semibold text-base hover:bg-[#f0f2fa] transition"
              onClick={onClose}
            >
              Fazer isso depois
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
