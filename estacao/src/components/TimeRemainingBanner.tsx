"use client";
import React, { useEffect, useState } from "react";

export interface TimeRemainingBannerProps {
  timeRemaining: number; // em segundos (do contador)
  minutesRemaining: number; // minutos restantes (15, 10, 5)
  onClose?: () => void;
  autoClose?: number; // tempo em ms para fechar automaticamente, 0 = não fecha
}

/**
 * Banner de notificação estilo Google Meet para tempo restante
 * Aparece discretamente no topo da tela, integrado ao contador
 */
export default function TimeRemainingBanner({
  timeRemaining,
  minutesRemaining,
  onClose,
  autoClose = 10000, // 10 segundos por padrão
}: TimeRemainingBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [displayTimeRemaining, setDisplayTimeRemaining] = useState(timeRemaining);

  // Atualiza o tempo restante em tempo real
  useEffect(() => {
    setDisplayTimeRemaining(timeRemaining);
    
    const interval = setInterval(() => {
      setDisplayTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining]);

  // Auto-close
  useEffect(() => {
    if (autoClose > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose?.(), 300); // Aguarda animação de saída
      }, autoClose);

      return () => clearTimeout(timer);
    }
  }, [autoClose, onClose]);

  if (!isVisible) return null;

  // Formata tempo restante (MM:SS)
  const formatTimeRemaining = (seconds: number) => {
    const mins = Math.floor(Math.max(0, seconds) / 60);
    const secs = Math.floor(Math.max(0, seconds) % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Determina cor e estilo baseado no tempo restante (igual ao contador)
  const getColorClasses = () => {
    if (timeRemaining <= 300) { // 5 minutos
      return {
        bg: "bg-red-500/90",
        border: "border-red-400",
        text: "text-white",
        icon: "text-red-100",
      };
    } else if (timeRemaining <= 600) { // 10 minutos
      return {
        bg: "bg-orange-500/90",
        border: "border-orange-400",
        text: "text-white",
        icon: "text-orange-100",
      };
    } else if (timeRemaining <= 900) { // 15 minutos
      return {
        bg: "bg-yellow-500/90",
        border: "border-yellow-400",
        text: "text-white",
        icon: "text-yellow-100",
      };
    }
    return {
      bg: "bg-blue-500/90",
      border: "border-blue-400",
      text: "text-white",
      icon: "text-blue-100",
    };
  };

  const colors = getColorClasses();

  // Mensagem baseada nos minutos restantes
  const getMessage = () => {
    if (minutesRemaining === 15) {
      return "A sessão se encerra em 15 minutos";
    } else if (minutesRemaining === 10) {
      return "A sessão se encerra em 10 minutos";
    } else if (minutesRemaining === 5) {
      return "A sessão se encerra em 5 minutos";
    }
    return "Tempo restante";
  };

  return (
    <div
      className={`
        fixed top-20 left-1/2 transform -translate-x-1/2 z-50
        max-w-[calc(100vw-2rem)] sm:max-w-md
        ${colors.bg} ${colors.border}
        backdrop-blur-md rounded-lg shadow-2xl border-2
        px-4 py-3 sm:px-5 sm:py-3.5
        transition-all duration-300
        ${timeRemaining <= 300 ? "animate-pulse" : ""}
      `}
      style={{
        animation: "slideDown 0.3s ease-out",
      }}
    >
      <div className="flex items-center gap-3">
        {/* Ícone de relógio */}
        <div className={`flex-shrink-0 ${colors.icon}`}>
          <svg
            className="w-5 h-5 sm:w-6 sm:h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <p className={`${colors.text} text-sm sm:text-base font-medium mb-0.5`}>
            {getMessage()}
          </p>
          <p className={`${colors.text} text-xs sm:text-sm opacity-90`}>
            Tempo restante: <span className="font-mono font-bold">{formatTimeRemaining(displayTimeRemaining)}</span>
          </p>
        </div>

        {/* Botão fechar */}
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onClose?.(), 300);
          }}
          className={`flex-shrink-0 ${colors.text} opacity-70 hover:opacity-100 transition-opacity p-1`}
          aria-label="Fechar notificação"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <style jsx>{`
        @keyframes slideDown {
          from {
            transform: translate(-50%, -100%);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
