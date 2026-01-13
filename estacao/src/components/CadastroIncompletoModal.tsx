import { motion, AnimatePresence } from "framer-motion";
import CadastroIncompletoModalMobile from "./CadastroIncompletoModalMobile";
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export default function CadastroIncompletoModal({ open, onClose, onSubmit }: Props) {
  // Fecha o modal ao pressionar ESC
  useEscapeKey(open, onClose);
  return (
    <>
      {/* Modal Desktop: visível a partir de sm */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 hidden sm:flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative flex flex-col items-center w-[588px] h-[328px] rounded-lg bg-[#FCFBF6] shadow-lg"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <header className="w-full h-[56px] rounded-t-lg flex items-center justify-center bg-[#8494E9] p-4 relative">
                <motion.span
                  className="text-white text-lg font-semibold fira-sans text-center w-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  Complete seu cadastro
                </motion.span>
                <button
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white hover:bg-[#6b7acb] rounded-full transition"
                  onClick={onClose}
                  aria-label="Fechar"
                >
                  x
                </button>
              </header>
              <main className="flex flex-col items-center justify-center flex-1 px-8 py-6 text-center">
                <p className="mb-4 text-[#222] fira-sans font-medium">
                  Alguns dados no seu cadastro precisam ser preenchidos para que você continue aproveitando a nossa plataforma.
                </p>
                <p className="mb-8 text-[#222] fira-sans font-medium">
                  Complete seu cadastro agora e aproveite para agendar sua primeira sessão conosco.
                </p>
                <div className="w-full flex flex-col md:flex-row gap-3 md:gap-4 justify-center items-center">
                  <button
                    className="w-full md:w-1/2 py-3 rounded border border-[#8494E9] text-[#8494E9] font-semibold fira-sans hover:bg-[#f0f2fa] transition"
                    onClick={onClose}
                  >
                    Fazer isso depois
                  </button>
                  <button
                    className="w-full md:w-1/2 py-3 rounded bg-[#8494E9] text-white font-semibold fira-sans hover:bg-[#6b7acb] transition"
                    onClick={onSubmit}
                  >
                    Concluir cadastro
                  </button>
                </div>
              </main>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Mobile: visível apenas no xs */}
      <CadastroIncompletoModalMobile open={open} onClose={onClose} onSubmit={onSubmit} />
    </>
  );
}
