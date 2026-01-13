import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEscapeKey } from "@/hooks/useEscapeKey";

// Tipo para avaliação
type Review = {
  Id?: string | number;
  CreatedAt?: string;
  Rating: number;
  Comentario: string;
};

interface ModalReviewProps {
  isOpen: boolean;
  onClose: () => void;
  reviews: Review[];
}

export default function ModalReview({ isOpen, onClose, reviews }: ModalReviewProps) {
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
              {/* Header fixo */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#ECECEC] sticky top-0 rounded-t-lg z-10 bg-[#8494E9]">
                <h2 className="text-xl font-semibold text-white w-full text-center">Avaliações</h2>
                <button
                  className="text-white text-2xl font-bold hover:text-[#49525A] transition-colors"
                  onClick={onClose}
                  aria-label="Fechar"
                  style={{ lineHeight: 1 }}
                >
                  ×
                </button>
              </div>
              {/* Conteúdo */}
              <div className="flex-1 flex flex-col gap-4 px-6 py-4 max-h-[80vh] overflow-y-auto">
                {reviews.map((avaliacao: Review, idx: number) => (
                  <div key={avaliacao.Id || idx} className="border-b pb-3 last:border-b-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Image
                        src="/assets/Profile.svg"
                        alt="Avatar paciente"
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full"
                      />
                      <div className="flex flex-col">
                        <span className="font-semibold text-[#212529]">Paciente anônimo</span>
                        <span className="text-[#75838F] text-sm">
                          {avaliacao.CreatedAt ? new Date(avaliacao.CreatedAt).toLocaleDateString("pt-BR") : ""}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center mb-1">
                      {[1,2,3,4,5].map((star) => (
                        <Image
                          key={star}
                          src={star <= Math.round(avaliacao.Rating ?? 0) ? "/icons/star.svg" : "/icons/star-inline.svg"}
                          alt={star <= Math.round(avaliacao.Rating ?? 0) ? "estrela cheia" : "estrela vazia"}
                          width={20}
                          height={20}
                          className="w-5 h-5"
                        />
                      ))}
                    </div>
                    <div className="text-[#49525A] text-[15px]">{avaliacao.Comentario}</div>
                  </div>
                ))}
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
            {/* Fundo preto */}
            <motion.div
              className="absolute inset-0 bg-black bg-opacity-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            {/* Conteúdo */}
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
                  <Image src="/icons/caret-left.svg" alt="Voltar" width={24} height={24} className="w-6 h-6" />
                </button>
                <h2 className="text-lg font-semibold text-gray-900">Avaliações</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700"
                >
                  <span className="text-2xl font-light">×</span>
                </button>
              </div>
              {/* Lista Avaliações */}
              <div className="flex-1 overflow-y-auto p-4 bg-white">
                <div className="space-y-4">
                  {reviews.map((avaliacao: Review, idx: number) => (
                    <div key={avaliacao.Id || idx} className="border-b border-gray-100 pb-4 last:border-b-0">
                      <div className="flex items-center gap-3 mb-2">
                        <Image
                          src="/assets/avatar-placeholder.svg" 
                          alt="Avatar paciente"
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-full"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-[#212529] text-sm truncate pr-2">Paciente anônimo</span>
                            <span className="text-[#75838F] text-xs flex-shrink-0">
                              {avaliacao.CreatedAt ? new Date(avaliacao.CreatedAt).toLocaleDateString("pt-BR") : ""}
                            </span>
                          </div>
                          <div className="flex items-center">
                            {[1,2,3,4,5].map((star) => (
                              <Image
                                key={star}
                                src={star <= Math.round(avaliacao.Rating ?? 0) ? "/icons/star.svg" : "/icons/star-inline.svg"}
                                alt={star <= Math.round(avaliacao.Rating ?? 0) ? "estrela cheia" : "estrela vazia"}
                                width={16}
                                height={16}
                                className="w-4 h-4"
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-[#49525A] text-sm leading-relaxed">
                        {avaliacao.Comentario}
                      </div>
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
