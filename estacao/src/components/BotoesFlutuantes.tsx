"use client";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";

type Props = {
  micOn: boolean;
  camOn: boolean;
  toggleMic: () => void;
  toggleCamera: () => void;
  handleLeave: () => void;
  role?: "PATIENT" | "PSYCHOLOGIST";
  onCancelarConsulta?: () => void; // Cancelamento (problema do paciente)
  onReagendar?: () => void; // Reagendamento (problema do psicólogo)
  onAgendar?: () => void;
  isProcessingExit?: boolean;
  onLeaveHover?: () => void; // Intenção de sair (hover)
};

export default function BotoesFlutuantes({
  micOn,
  camOn,
  toggleMic,
  toggleCamera,
  handleLeave,
  role = "PATIENT",
  onCancelarConsulta,
  onReagendar,
  onAgendar,
  isProcessingExit = false,
  onLeaveHover,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fecha o menu ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  const isPsychologist = role === "PSYCHOLOGIST";

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-3 sm:bottom-4 md:bottom-6 flex flex-row items-center justify-center gap-1.5 sm:gap-2 md:gap-3 w-auto z-40 max-w-[calc(100vw-1rem)] px-2">
      {/* Microfone - switch - otimizado para mobile */}
      <div className="flex items-center gap-1 bg-indigo-100/95 backdrop-blur-sm rounded-full px-1.5 sm:px-2 py-1.5 sm:py-1 shadow-lg w-[44px] h-[44px] sm:w-[44px] sm:h-[44px]">
        <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-400 shrink-0">
          <Image src="/assets/icons/Icon-mic.svg" alt="Mic" width={18} height={18} className="sm:w-5 sm:h-5" />
        </div>
        <label className="flex items-center justify-center cursor-pointer w-full h-full">
          <input
            type="checkbox"
            checked={micOn}
            onChange={toggleMic}
            className="sr-only"
            aria-label="Alternar microfone"
          />
          <div className={`w-6 h-3.5 sm:w-7 sm:h-4 flex items-center rounded-full p-0.5 sm:p-1 transition-colors ${micOn ? "bg-indigo-500" : "bg-gray-300"}`}>
            <div
              className={`w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 bg-white rounded-full shadow transform transition-transform duration-300 ${micOn ? "translate-x-2.5 sm:translate-x-3" : "translate-x-0"}`}
            />
          </div>
        </label>
      </div>
      {/* Câmera - switch - otimizado para mobile */}
      <div className="flex items-center gap-1 bg-indigo-100/95 backdrop-blur-sm rounded-full px-1.5 sm:px-2 py-1.5 sm:py-1 shadow-lg w-[44px] h-[44px] sm:w-[44px] sm:h-[44px]">
        <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-400 shrink-0">
          <Image src="/assets/icons/Icon-camera.svg" alt="Cam" width={18} height={18} className="sm:w-5 sm:h-5" />
        </div>
        <label className="flex items-center justify-center cursor-pointer w-full h-full">
          <input
            type="checkbox"
            checked={camOn}
            onChange={toggleCamera}
            className="sr-only"
            aria-label="Alternar câmera"
          />
          <div className={`w-6 h-3.5 sm:w-7 sm:h-4 flex items-center rounded-full p-0.5 sm:p-1 transition-colors ${camOn ? "bg-indigo-500" : "bg-gray-300"}`}>
            <div
              className={`w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 bg-white rounded-full shadow transform transition-transform duration-300 ${camOn ? "translate-x-2.5 sm:translate-x-3" : "translate-x-0"}`}
            />
          </div>
        </label>
      </div>
      
      {/* Para psicólogo: Menu de três pontos com todas as opções */}
      {isPsychologist && (
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center justify-center w-[44px] h-[44px] sm:w-[44px] sm:h-[44px] rounded-xl bg-gray-200/95 backdrop-blur-sm hover:bg-gray-300 transition-colors shadow-lg"
            title="Menu de opções"
            aria-label="Menu de opções"
            aria-expanded={menuOpen}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12a.75.75 0 110-1.5.75.75 0 010 1.5zM12 17.25a.75.75 0 110-1.5.75.75 0 010 1.5z"
              />
            </svg>
          </button>
          
          {/* Dropdown Menu - todas as opções */}
          {menuOpen && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 sm:w-56 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
              <button
                onClick={() => {
                  onAgendar?.();
                  setMenuOpen(false);
                }}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs sm:text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Agendar próxima sessão
              </button>
              <button
                onClick={() => {
                  onReagendar?.();
                  setMenuOpen(false);
                }}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs sm:text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Reagendar consulta
              </button>
              <button
                onClick={() => {
                  onCancelarConsulta?.();
                  setMenuOpen(false);
                }}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs sm:text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancelar consulta
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Para pacientes: não exibe mão e chat (removidos) */}
      
      {/* Encerrar - otimizado para mobile */}
      <button
        onClick={handleLeave}
        onMouseEnter={() => onLeaveHover?.()}
        disabled={isProcessingExit}
        className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 h-[44px] sm:h-[44px] rounded-full text-white text-xs sm:text-sm font-semibold shadow-lg transition-colors ${
          isProcessingExit 
            ? 'bg-red-500 cursor-not-allowed opacity-70' 
            : 'bg-red-700 hover:bg-red-800 cursor-pointer'
        }`}
      >
        <Image src="/icons/exit.svg" alt="Sair" width={16} height={16} className="w-4 h-4 sm:w-5 sm:h-5" />
        <span>{isProcessingExit ? 'Processando...' : 'Sair'}</span>
      </button>
    </div>
  );
}
