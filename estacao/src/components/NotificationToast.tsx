"use client";
import React, { useEffect, useState } from "react";

export interface NotificationToastProps {
  message: string;
  type?: "info" | "warning" | "error";
  minutesRemaining?: number;
  onClose?: () => void;
  autoClose?: number; // tempo em ms para fechar automaticamente, 0 = não fecha
}

export default function NotificationToast({
  message,
  type = "info",
  minutesRemaining,
  onClose,
  autoClose = 5000, // 5 segundos por padrão
}: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(true);

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

  // Cores baseadas no tipo
  const colors = {
    info: {
      bg: "bg-blue-50",
      border: "border-blue-500",
      icon: "text-blue-600",
      text: "text-blue-900",
    },
    warning: {
      bg: "bg-yellow-50",
      border: "border-yellow-500",
      icon: "text-yellow-600",
      text: "text-yellow-900",
    },
    error: {
      bg: "bg-red-50",
      border: "border-red-500",
      icon: "text-red-600",
      text: "text-red-900",
    },
  };

  const colorSet = colors[type];

  return (
    <div
      className={`
        fixed bottom-24 sm:bottom-28 md:bottom-32 right-2 sm:right-4 md:right-6 z-50 
        max-w-[calc(100vw-1rem)] sm:max-w-sm
        animate-slide-up
      `}
      style={{
        animation: "slideUp 0.3s ease-out",
      }}
    >
      <div
        className={`
          ${colorSet.bg} ${colorSet.border}
          rounded-lg shadow-2xl border-2 w-full sm:w-96 p-3 sm:p-4
          transition-all duration-300
        `}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className={`w-10 h-10 ${colorSet.bg} rounded-full flex items-center justify-center border-2 ${colorSet.border}`}>
              {type === "info" && (
                <svg className={`w-6 h-6 ${colorSet.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {type === "warning" && (
                <svg className={`w-6 h-6 ${colorSet.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              {type === "error" && (
                <svg className={`w-6 h-6 ${colorSet.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={`font-bold ${colorSet.text} text-sm sm:text-base mb-1`}>
              {minutesRemaining !== undefined
                ? `${minutesRemaining} minuto${minutesRemaining !== 1 ? "s" : ""} restante${minutesRemaining !== 1 ? "s" : ""}`
                : "Notificação"}
            </h4>
            <p className={`text-xs sm:text-sm ${colorSet.text} opacity-90`}>
              {message}
            </p>
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(() => onClose?.(), 300);
            }}
            className={`flex-shrink-0 ${colorSet.text} opacity-50 hover:opacity-100 transition-opacity`}
            aria-label="Fechar notificação"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

