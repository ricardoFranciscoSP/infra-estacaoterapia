import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface ModalCompletarPerfilProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleteNow?: () => void;
}

const ModalCompletarPerfil: React.FC<ModalCompletarPerfilProps> = ({
  isOpen,
  onClose,
  onCompleteNow,
}) => {
  // Fecha o modal ao pressionar ESC
  useEscapeKey(isOpen, onClose);

  const handleCompleteNow = () => {
    onClose();
    if (onCompleteNow) {
      onCompleteNow();
    } else {
      // Redirecionar para completar perfil, se necessário
      window.location.href = "/painel-psicologo/pos-cadastro";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile: Modal de baixo para cima, cobrindo toda a tela */}
          <motion.div
            className="fixed inset-0 z-[99999] sm:hidden flex flex-col justify-end bg-transparent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
          >
            <motion.div
              className="w-full bg-white rounded-t-2xl shadow-xl flex flex-col"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              style={{ minHeight: '100vh', maxHeight: '100vh', height: '100vh', position: 'relative' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Mobile */}
              <div className="relative flex flex-col items-center p-4 bg-[#232A5C] rounded-t-2xl" style={{ minHeight: 60 }}>
                <button 
                  onClick={onClose} 
                  className="absolute right-4 top-4 text-2xl font-bold text-white"
                  aria-label="Fechar"
                >
                  ×
                </button>
                <span className="block text-[20px] font-semibold text-white mb-2 text-center">
                  Próxima etapa - Completar perfil
                </span>
              </div>
              
              {/* Conteúdo Mobile */}
              <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-6 sm:py-8 overflow-y-auto">
                <span className="block text-[#23253A] text-lg sm:text-xl font-semibold mb-3 text-center">
                  Complete seu perfil e já comece a atender conosco!
                </span>
                <span className="block text-[#3B3B7A] text-base sm:text-lg font-semibold mb-3 text-center">
                  Primeiramente te desejamos boas-vindas a nossa plataforma!
                </span>
                <span className="block text-[#23253A] text-sm sm:text-base font-normal mb-3 text-center max-w-[600px]">
                  Para que seu perfil seja visto pelos pacientes e você consiga
                  atender na plataforma, é importante que finalize seu perfil.
                </span>
                <span className="block text-[#23253A] text-sm sm:text-base font-normal mb-3 text-center max-w-[600px]">
                  É rápido, prático e garante que você fique visível na
                  plataforma para os pacientes.
                </span>
                <span className="block text-[#23253A] text-base sm:text-lg font-semibold mb-6 text-center">
                  Vamos lá?
                </span>
                <div className="flex flex-col sm:flex-row gap-4 mt-2 w-full max-w-[600px] px-4">
                  <button
                    className="w-full sm:w-auto px-6 py-3 rounded-lg border border-[#8494E9] text-[#8494E9] bg-transparent font-medium text-base hover:bg-[#e3e4f3] transition"
                    onClick={onClose}
                  >
                    Fazer isso depois
                  </button>
                  <button
                    className="w-full sm:w-auto px-6 py-3 rounded-lg bg-[#8494E9] text-white font-medium text-base hover:bg-[#6D75C0] transition"
                    onClick={handleCompleteNow}
                  >
                    Completar meu perfil agora
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Desktop: Modal centralizado */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="hidden sm:flex fixed inset-0 z-50 items-center justify-center bg-transparent"
            onClick={onClose}
          >
            <motion.div
              className="w-[90vw] max-w-[902px] bg-[#FCFBF6] rounded-lg shadow-lg flex flex-col"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ height: 439 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Desktop */}
              <div className="w-full rounded-t-lg bg-[#232A5C] px-8 py-4 flex items-center justify-center relative">
                <span className="text-white text-lg font-semibold text-center w-full">
                  Próxima etapa - Completar perfil
                </span>
                <button
                  className="absolute right-8 top-1/2 -translate-y-1/2 text-white text-2xl font-bold focus:outline-none hover:opacity-70 transition"
                  onClick={onClose}
                  aria-label="Fechar"
                >
                  ×
                </button>
              </div>
              {/* Conteúdo Desktop */}
              <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
                <span className="block text-[#23253A] text-lg font-semibold mb-2 text-center">
                  Complete seu perfil e já comece a atender conosco!
                </span>
                <span className="block text-[#3B3B7A] text-base font-semibold mb-2 text-center">
                  Primeiramente te desejamos boas-vindas a nossa plataforma!
                </span>
                <span className="block text-[#23253A] text-base font-normal mb-2 text-center max-w-[600px]">
                  Para que seu perfil seja visto pelos pacientes e você consiga
                  atender na plataforma, é importante que finalize seu perfil.
                </span>
                <span className="block text-[#23253A] text-base font-normal mb-2 text-center max-w-[600px]">
                  É rápido, prático e garante que você fique visível na
                  plataforma para os pacientes.
                </span>
                <span className="block text-[#23253A] text-base font-semibold mb-6 text-center">
                  Vamos lá?
                </span>
                <div className="flex gap-4 mt-2">
                  <button
                    className="px-6 py-2 rounded border border-[#8494E9] text-[#8494E9] bg-transparent font-medium text-base hover:bg-[#e3e4f3] transition"
                    onClick={onClose}
                  >
                    Fazer isso depois
                  </button>
                  <button
                    className="px-6 py-2 rounded bg-[#8494E9] text-white font-medium text-base hover:bg-[#6D75C0] transition"
                    onClick={handleCompleteNow}
                  >
                    Completar meu perfil agora
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ModalCompletarPerfil;
