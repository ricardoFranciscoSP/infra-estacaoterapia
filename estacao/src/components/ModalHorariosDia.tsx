import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEscapeKey } from "@/hooks/useEscapeKey";

type Slot = {
  id: string;
  date: string;
  time: string;
  available: boolean;
};

interface ModalHorariosDiaProps {
  open: boolean;
  onClose: () => void;
  date: Date | null;
  slots: Slot[];
  selectedSlots: string[];
  onSelectSlot: (slotId: string) => void;
  onConfirm: () => void;
}

export default function ModalHorariosDia({
  open,
  onClose,
  date,
  slots,
  selectedSlots,
  onSelectSlot,
  onConfirm,
}: ModalHorariosDiaProps) {
  // Fecha o modal ao pressionar ESC
  useEscapeKey(open, onClose);
  // Estado local para simular horários reservados
  const [reservedSlots, setReservedSlots] = useState<string[]>([]);

  useEffect(() => {
    // Simula alguns horários reservados ao abrir o modal
    if (open && slots.length > 0) {
      // Exemplo: reserva os horários das 10:00 e 15:00
      const reservas = slots
        .filter((slot) => slot.time === "10:00" || slot.time === "15:00")
        .map((slot) => slot.id);
      setReservedSlots(reservas);
    }
    if (!open) {
      setReservedSlots([]);
    }
  }, [open, slots]);

  function handleSlotClick(slot: Slot) {
    if (reservedSlots.includes(slot.id)) {
      // Desreserva ao clicar
      setReservedSlots((prev) => prev.filter((id) => id !== slot.id));
    } else if (slot.available) {
      onSelectSlot(slot.id);
    }
  }

  if (!open || !date) return null;

  return (
    <>
      {/* Modal Desktop */}
      <div className="fixed inset-0 z-50 sm:flex hidden items-center justify-center bg-transparent">
        <div className="bg-white rounded-lg w-[588px] h-[344px] shadow-lg relative flex flex-col">
          {/* Header do modal */}
          <div className="bg-[#8494E9] w-full h-14 rounded-t-lg flex items-center justify-center px-8">
            <span className="text-white text-lg font-semibold font-fira text-center w-full">
              Horários de {date.toLocaleDateString("pt-BR")}
            </span>
            <button
              className="absolute right-8 text-white text-2xl font-bold cursor-pointer"
              onClick={onClose}
              aria-label="Fechar"
            >
              &times;
            </button>
          </div>
          {/* Conteúdo do modal */}
          <div className="flex-1 px-8 py-6 flex flex-col justify-between">
            {slots.length === 0 ? (
              <div className="text-gray-500">Nenhum horário cadastrado para este dia.</div>
            ) : (
              <div className="flex gap-[10px] flex-wrap mb-6">
                {slots.map((slot) => {
                  const isReserved = reservedSlots.includes(slot.id);
                  return (
                    <button
                      key={slot.id}
                      className={`w-14 h-8 rounded border-none px-1 py-1 flex items-center justify-center font-fira text-[14px] leading-6 text-center
                        ${isReserved
                          ? "bg-red-500 text-white opacity-100"
                          : selectedSlots.includes(slot.id)
                            ? "bg-blue-600 text-white"
                            : slot.available
                              ? "bg-[#E3E6E8] text-[#49525A]"
                              : "bg-red-100 text-red-800 opacity-60"}
                        transition-all cursor-pointer`}
                      style={{
                        fontWeight: 400,
                        fontStyle: "normal",
                        letterSpacing: "0",
                      }}
                      onClick={() => handleSlotClick(slot)}
                    >
                      {slot.time}
                    </button>
                  );
                })}
              </div>
            )}
            {/* Botões Cancelar e Confirmar */}
            <div className="flex gap-4 w-full">
              <button
                className="flex-1 h-10 rounded bg-gray-200 text-gray-700 font-fira font-semibold text-base hover:bg-gray-300 transition cursor-pointer"
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                className={`flex-1 h-10 rounded bg-[#8494E9] text-white font-fira font-semibold text-base hover:bg-blue-700 transition cursor-pointer ${selectedSlots.length ? "" : "opacity-50 cursor-not-allowed"}`}
                disabled={!selectedSlots.length}
                onClick={onConfirm}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Mobile */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 bg-white z-50 sm:hidden flex flex-col"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.3 }}
          >
            {/* Header */}
            <div className="relative flex flex-col items-center p-4 border-b border-gray-200 bg-[#8494E9] rounded-t-lg">
              <button
                onClick={onClose}
                className="absolute right-4 top-4 text-xl font-bold text-white cursor-pointer"
                aria-label="Fechar"
              >
                ×
              </button>
              <span className="block text-base font-semibold text-white mb-2 text-center w-full">
                Horários de {date.toLocaleDateString("pt-BR")}
              </span>
            </div>
            {/* Conteúdo */}
            <div className="p-4 flex-1 flex flex-col overflow-y-auto text-gray-800 text-sm leading-relaxed">
              <div className="mb-4 font-medium">Selecione os horários:</div>
              <div className="flex flex-wrap gap-[10px] mb-6">
                {slots.map((slot) => {
                  const isReserved = reservedSlots.includes(slot.id);
                  return (
                    <button
                      key={slot.id}
                      className={`w-14 h-8 rounded border-none px-1 py-1 flex items-center justify-center font-fira text-[14px] leading-6 text-center
                        ${isReserved
                          ? "bg-red-500 text-white opacity-100"
                          : selectedSlots.includes(slot.id)
                            ? "bg-blue-600 text-white"
                            : slot.available
                              ? "bg-[#E3E6E8] text-[#49525A]"
                              : "bg-red-100 text-red-800 opacity-60"}
                        transition-all cursor-pointer`}
                      style={{
                        fontWeight: 400,
                        fontStyle: "normal",
                        letterSpacing: "0",
                      }}
                      onClick={() => handleSlotClick(slot)}
                    >
                      {slot.time}
                    </button>
                  );
                })}
              </div>
              <div className="flex-grow" />
              <div className="flex gap-4 w-full">
                <button
                  onClick={onClose}
                  className="w-1/2 h-10 rounded-[6px] border border-[#6D75C0] text-[#6D75C0] font-medium text-base bg-white hover:bg-[#E6E9FF] transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={onConfirm}
                  disabled={!selectedSlots.length}
                  className={`w-1/2 h-10 rounded-[6px] font-medium text-base transition cursor-pointer ${!selectedSlots.length ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-[#8494E9] hover:bg-[#6D75C0] text-white"}`}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
