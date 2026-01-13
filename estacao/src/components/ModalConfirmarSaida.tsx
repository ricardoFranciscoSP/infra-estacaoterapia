"use client";
import React from "react";
import { useEscapeKey } from "@/hooks/useEscapeKey";

type ModalConfirmarSaidaProps = {
  onClose: () => void;
  onConfirm: () => void;
  isOpen: boolean;
};

export default function ModalConfirmarSaida({ onClose, onConfirm, isOpen }: ModalConfirmarSaidaProps) {
  // Fecha o modal ao pressionar ESC
  useEscapeKey(isOpen, onClose);
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-transparent z-50">
      <div className="bg-white rounded-lg shadow-lg flex flex-col max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Confirmar Saída
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
            aria-label="Fechar modal"
          >
            ×
          </button>
        </div>
        
        {/* Conteúdo */}
        <div className="px-6 py-4">
          <p className="text-gray-700 text-base">
            Deseja encerrar a chamada?
          </p>
        </div>
        
        {/* Botões */}
        <div className="flex w-full px-6 pb-4 gap-3">
          <button
            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2.5 rounded font-medium text-base hover:bg-gray-300 transition-colors"
            onClick={onClose}
          >
            Não
          </button>
          <button
            className="flex-1 bg-red-600 text-white px-4 py-2.5 rounded font-medium text-base hover:bg-red-700 transition-colors"
            onClick={onConfirm}
          >
            Sim
          </button>
        </div>
      </div>
    </div>
  );
}

