import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SubmitButton } from "@/components/SubmitButton";
import { useEscapeKey } from "@/hooks/useEscapeKey";

type EditModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  isLoading?: boolean;
};

export default function EditModal({ open, title, children, onClose, isLoading = false }: EditModalProps) {
  const [isMobile, setIsMobile] = React.useState(false);

  // Fecha o modal ao pressionar ESC
  useEscapeKey(open, onClose);

  React.useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 640);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (isMobile) {
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
            {/* Header Mobile */}
            <div className="relative flex flex-col items-center p-4 border-b border-[#E3E4F3] bg-[#232A5C]">
              <button
                onClick={onClose}
                className="absolute right-4 top-4 text-xl font-bold text-white hover:text-gray-200 transition"
                aria-label="Fechar"
              >
                ×
              </button>
              <span className="block text-base font-semibold text-white mb-2 text-center">
                {title}
              </span>
            </div>
            <div className="p-4 flex-1 flex flex-col overflow-y-auto text-gray-800 text-sm leading-relaxed">
              {children}
              <div className="flex-grow" />
              <div className="flex flex-col gap-2 w-full mt-4">
                <SubmitButton
                  isLoading={isLoading}
                  type="button"
                  className="w-full h-10 rounded-[6px] text-base"
                  onClick={() => {
                    const form = document.querySelector('.modal-form-mobile');
                    if (form) (form as HTMLFormElement).requestSubmit?.();
                  }}
                >
                  Salvar
                </SubmitButton>
                <button
                  className="w-full h-10 rounded-[6px] border border-[#6D75C0] text-[#6D75C0] font-medium text-base bg-white cursor-pointer hover:bg-[#E6E9FF] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
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
            className="bg-white rounded-2xl shadow-2xl p-0 w-full max-w-[900px] relative"
            initial={{ scale: 0.95, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 40 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center px-6 py-4 border-b border-[#E3E4F3] rounded-t-2xl bg-[#232A5C] relative">
              <div className="flex-1 flex justify-center">
                <h2 className="text-lg font-bold text-white">{title}</h2>
              </div>
              <button
                onClick={onClose}
                className="absolute right-6 top-1/2 -translate-y-1/2 text-white text-2xl px-2 py-1 rounded hover:bg-[#6D75C0] transition"
              >
                ×
              </button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {children}
              <div className="flex justify-end gap-3 mt-8">
                <button
                  className="px-6 py-2 rounded-[6px] border border-[#75838F] bg-[#FCFBF6] text-[#23253A] font-medium hover:bg-[#F3F6F8] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Cancelar
                </button>
                <SubmitButton
                  isLoading={isLoading}
                  type="button"
                  className="px-6 py-2 rounded-[6px] font-semibold"
                  onClick={() => {
                    const form = document.querySelector('.modal-form-mobile');
                    if (form) (form as HTMLFormElement).requestSubmit?.();
                  }}
                >
                  Salvar
                </SubmitButton>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
