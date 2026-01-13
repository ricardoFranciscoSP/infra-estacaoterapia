import React, { useState, useEffect } from "react";

interface LoadingButtonProps {
  loading: boolean;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading,
  children,
  className = "",
  disabled = false,
  onClick,
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (loading) {
      setProgress(0);
      // Simula progresso de 0 a 100% em ~3 segundos (mais lento para operações longas)
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          // Acelera no início e desacelera no final (estilo Mercado Livre)
          const increment = prev < 50 ? 6 : prev < 80 ? 4 : 2;
          return Math.min(prev + increment, 100);
        });
      }, 50);
      return () => clearInterval(interval);
    } else {
      setProgress(0);
    }
  }, [loading]);

  const isDisabled = disabled || loading;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`relative overflow-hidden ${className} ${
        isDisabled
          ? 'cursor-not-allowed bg-gray-300 text-gray-500'
          : 'cursor-pointer hover:brightness-105'
      }`}
    >
      {/* Barra de progresso da esquerda para direita - estilo Mercado Livre */}
      {loading && (
        <div
          className="absolute inset-0 transition-all duration-75 ease-out"
          style={{
            width: `${progress}%`,
            left: 0,
            top: 0,
            height: '100%',
            zIndex: 1,
            backgroundColor: '#5a6299', // Lilás mais escuro (#6D75C0 mais escuro)
          }}
        />
      )}
      {/* Conteúdo do botão */}
      <span className="relative z-10" style={{ position: 'relative', zIndex: 2 }}>
        {children}
      </span>
    </button>
  );
};
