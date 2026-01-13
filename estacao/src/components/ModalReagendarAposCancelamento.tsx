"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ModalReagendar from "./ModalReagendar";
import { ConsultaApi } from "@/types/consultasTypes";

interface ModalReagendarAposCancelamentoProps {
  open: boolean;
  onClose: () => void;
  consultaOriginal?: ConsultaApi | null;
}

/**
 * Modal para reagendar após cancelamento dentro do prazo
 * Pergunta se o paciente deseja reagendar e abre o calendário do mesmo psicólogo
 */
export default function ModalReagendarAposCancelamento({ 
  open, 
  onClose, 
  consultaOriginal
}: ModalReagendarAposCancelamentoProps) {
  const [mostrarCalendario, setMostrarCalendario] = useState(false);

  const handleSim = () => {
    setMostrarCalendario(true);
  };

  const handleNao = () => {
    onClose();
  };

  const handleCloseCalendario = () => {
    setMostrarCalendario(false);
    onClose();
  };

  return (
    <>
      <AnimatePresence>
        {open && !mostrarCalendario && (
          <motion.div
            className="fixed inset-0 bg-[#E6E9FF]/60 z-[60] flex items-center justify-center font-sans p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="bg-white shadow-xl flex flex-col w-full max-w-[500px] rounded-[12px] mx-auto my-auto"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Header do Modal */}
              <div className="w-full h-[56px] bg-[#8494E9] flex items-center justify-center px-6 rounded-t-[12px] relative">
                <h2 className="text-lg font-semibold text-white text-center">
                  Reagendar sessão
                </h2>
                <button
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-white text-2xl font-bold hover:text-[#E6E9FF] transition-colors"
                  onClick={handleNao}
                  aria-label="Fechar"
                >
                  &times;
                </button>
              </div>
              
              {/* Conteúdo central */}
              <div className="flex-1 px-8 py-6">
                <p className="text-gray-700 text-base leading-relaxed text-center">
                  Deseja reagendar a sessão cancelada?
                </p>
                <p className="text-gray-600 text-sm leading-relaxed text-center mt-2">
                  Você pode escolher um novo horário com o mesmo psicólogo.
                </p>
              </div>
              
              {/* Botões de ação */}
              <div className="w-full px-8 py-5 flex justify-center gap-3 border-t border-gray-100 bg-white rounded-b-[12px]">
                <button
                  onClick={handleNao}
                  className="h-11 font-medium text-sm rounded-lg border border-[#8494E9] text-[#8494E9] bg-white hover:bg-[#F2F4FD] transition-all duration-200 px-6"
                >
                  Não
                </button>
                <button
                  onClick={handleSim}
                  className="h-11 font-medium text-sm rounded-lg bg-[#8494E9] text-white transition-all duration-200 hover:bg-[#6D75C0] px-6"
                >
                  Sim
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de reagendamento */}
      {mostrarCalendario && consultaOriginal && (
        <ModalReagendar
          isOpen={mostrarCalendario}
          onClose={handleCloseCalendario}
          consulta={{
            data: consultaOriginal.Date || "",
            horario: consultaOriginal.Time || "",
            psicologo: consultaOriginal.Psicologo ? {
              nome: consultaOriginal.Psicologo.Nome || "",
              id: consultaOriginal.PsicologoId || "",
              Image: consultaOriginal.Psicologo.Images
            } : undefined
          }}
          consultaIdAtual={consultaOriginal.Id ? String(consultaOriginal.Id) : ""}
        />
      )}
    </>
  );
}
