"use client";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { normalizeEnum } from "@/utils/enumUtils";
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface ModalQueixasProps {
  isOpen: boolean;
  onClose: () => void;
  queixas: string[];
}

export default function ModalQueixas({ isOpen, onClose, queixas }: ModalQueixasProps) {
  // Fecha o modal ao pressionar ESC
  useEscapeKey(isOpen, onClose);
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Modal Desktop */}
          <motion.div
            className="hidden lg:flex fixed inset-0 z-50 items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Fundo transparente */}
            <motion.div
              className="absolute inset-0 bg-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.div
              className="bg-white/90 backdrop-blur-md rounded-lg shadow-lg w-full max-w-lg relative flex flex-col z-10"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              {/* Header fixo com cor e texto centralizado */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#ECECEC] sticky top-0 rounded-t-lg z-10 bg-[#232A5C]">
                <h2 className="text-xl font-semibold text-white w-full text-center">Queixas e sintomas</h2>
                <button
                  className="text-white text-2xl font-bold hover:text-[#49525A] transition-colors"
                  onClick={onClose}
                  aria-label="Fechar"
                  style={{ lineHeight: 1 }}
                >
                  ×
                </button>
              </div>
              {/* Conteúdo com rolagem */}
              <div className="flex-1 px-6 py-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 gap-3">
                  {queixas.map((queixa, idx) => (
                    <div
                      key={idx}
                      className="border border-[#6D75C0] rounded-[4px] px-4 py-3 text-[#6D75C0] font-normal text-[14px] leading-[20px] text-center"
                    >
                      {normalizeEnum(queixa)}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Modal Mobile */}
          <motion.div
            className="lg:hidden fixed inset-0 z-50 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Fundo transparente */}
            <motion.div
              className="absolute inset-0 bg-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            
            {/* Modal content */}
            <motion.div
              className="relative w-full h-full bg-white flex flex-col"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center"
                >
                  <Image src="/icons/caret-left.svg" alt="Voltar" className="w-6 h-6" width={24} height={24} />
                </button>
                <h2 className="text-lg font-semibold text-gray-900">Queixas e sintomas</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700"
                >
                  <span className="text-2xl font-light">×</span>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 bg-white">
                <div className="space-y-3">
                  {queixas.map((queixa, idx) => (
                    <div
                      key={idx}
                      className="border border-[#6D75C0] rounded-[4px] px-4 py-3 text-[#6D75C0] font-normal text-[14px] leading-[20px] text-left"
                    >
                      {normalizeEnum(queixa)}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
