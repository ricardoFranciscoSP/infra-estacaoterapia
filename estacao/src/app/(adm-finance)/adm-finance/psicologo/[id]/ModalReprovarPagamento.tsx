"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FinanceiroPsicologo } from "@/types/admFinanceTypes";
import { useAdmFinanceStore } from "@/store/admFinanceStore";
import { toast } from "react-hot-toast";

interface ModalReprovarPagamentoProps {
  open: boolean;
  onClose: () => void;
  pagamento: FinanceiroPsicologo;
  onSuccess: () => void;
}

export default function ModalReprovarPagamento({
  open,
  onClose,
  pagamento,
  onSuccess,
}: ModalReprovarPagamentoProps) {
  const [motivo, setMotivo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { reprovarPagamento } = useAdmFinanceStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!motivo.trim()) {
      toast.error("O motivo é obrigatório");
      return;
    }

    setIsLoading(true);

    try {
      await reprovarPagamento(pagamento.Id, motivo);
      toast.success("Pagamento reprovado com sucesso!");
      onSuccess();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao reprovar pagamento";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          >
            <motion.div
              className="bg-white rounded-xl shadow-2xl w-full max-w-md"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-[#E5E9FA]">
                <h2 className="text-xl font-bold text-[#23253a]">Reprovar Pagamento</h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor
                  </label>
                  <input
                    type="text"
                    value={new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(pagamento.Valor)}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Motivo da Reprovação <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    rows={4}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8494E9]"
                    placeholder="Descreva o motivo da reprovação..."
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !motivo.trim()}
                    className="flex-1 px-4 py-2 bg-[#E57373] text-white rounded-lg hover:bg-[#d32f2f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Reprovando..." : "Reprovar"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

