"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEscapeKey } from "@/hooks/useEscapeKey";

type Slot = {
  id: string;
  date: string;
  time: string;
  available: boolean;
};

interface ModalHorariosDiaMobileProps {
  open: boolean;
  onClose: () => void;
  date: Date | null;
  slots: Slot[];
  selectedSlots: string[];
  onSelectSlot: (slotId: string) => void;
  onConfirm: () => void;
}

export default function ModalHorariosDiaMobile({
  open,
  onClose,
  date,
  slots,
  selectedSlots,
  onSelectSlot,
  onConfirm,
}: ModalHorariosDiaMobileProps) {
  // Fecha o modal ao pressionar ESC
  useEscapeKey(open, onClose);
  const [reservedSlots, setReservedSlots] = useState<string[]>([]);

  useEffect(() => {
    if (open && slots.length > 0) {
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
      setReservedSlots((prev) => prev.filter((id) => id !== slot.id));
    } else if (slot.available) {
      onSelectSlot(slot.id);
    }
  }

  if (!open || !date) return null;

  return (
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
              className="absolute right-4 top-4 text-xl font-bold text-white"
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
                      transition-all`}
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
                className="w-1/2 h-10 rounded-[6px] border border-[#6D75C0] text-[#6D75C0] font-medium text-base bg-white hover:bg-[#E6E9FF] transition"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                disabled={!selectedSlots.length}
                className={`w-1/2 h-10 rounded-[6px] font-medium text-base transition ${!selectedSlots.length ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-[#8494E9] hover:bg-[#6D75C0] text-white"}`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
