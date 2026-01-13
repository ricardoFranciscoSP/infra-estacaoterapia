import React, { useEffect, useState } from 'react';

interface ProgressButtonProps {
  isLoading: boolean;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export const ProgressButton: React.FC<ProgressButtonProps> = ({
  isLoading,
  children,
  className = '',
  disabled = false,
  onClick,
  type = 'button',
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isLoading) {
      setProgress(0);
      // Simula progresso de 0 a 100% em ~2 segundos
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          // Acelera no início e desacelera no final
          const increment = prev < 50 ? 8 : prev < 80 ? 5 : 2;
          return Math.min(prev + increment, 100);
        });
      }, 50);
      return () => clearInterval(interval);
    } else {
      setProgress(0);
    }
  }, [isLoading]);

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`relative overflow-hidden ${className}`}
      style={{ position: 'relative' }}
    >
      {/* Barra de progresso */}
      {isLoading && (
        <div
          className="absolute inset-0 transition-all duration-75 ease-out"
          style={{
            width: `${progress}%`,
            left: 0,
            top: 0,
            height: '100%',
            zIndex: 1,
            backgroundColor: '#5a6299', // Lilás mais escuro
          }}
        />
      )}
      {/* Conteúdo do botão */}
      <span
        className="relative z-10"
        style={{ position: 'relative', zIndex: 2 }}
      >
        {children}
      </span>
    </button>
  );
};

