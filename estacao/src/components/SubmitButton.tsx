import React, { useEffect } from 'react';

interface SubmitButtonProps {
  isLoading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({
  isLoading = false,
  disabled = false,
  children,
  className = '',
  type = 'submit',
  onClick,
  variant = 'primary',
}) => {
  // Adiciona a animação CSS globalmente se não existir
  useEffect(() => {
    if (typeof document !== 'undefined' && !document.getElementById('submit-button-shimmer-style')) {
      const style = document.createElement('style');
      style.id = 'submit-button-shimmer-style';
      style.textContent = `
        @keyframes submitButtonShimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const baseClasses = 'relative overflow-hidden font-bold transition-all duration-200 rounded-md px-4 py-2 flex items-center justify-center gap-2';
  
  const variantClasses = {
    primary: 'bg-[#6D75C0] text-white hover:bg-[#6B7DD8] border border-[#6D75C0]',
    secondary: 'bg-gray-200 text-gray-700 hover:bg-[#6B7DD8] hover:text-white border border-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700 border border-red-600',
  };

  const disabledClasses = 'opacity-60 cursor-not-allowed';
  const loadingClasses = isLoading ? 'cursor-not-allowed' : 'cursor-pointer';

  const isDisabled = disabled || isLoading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${isDisabled ? disabledClasses : loadingClasses}
        ${className}
      `}
    >
      {/* Conteúdo do botão */}
      <span className={`relative z-10 flex items-center gap-2 ${isLoading ? 'opacity-90' : ''}`}>
        {children}
      </span>

      {/* Overlay de loading com cor lilás mais escuro */}
      {isLoading && (
        <div className="absolute inset-0">
          {/* Fundo escurecido com lilás mais escuro */}
          <div className="absolute inset-0 bg-[#5a63b0] opacity-90" />
          
          {/* Animação shimmer da esquerda para direita */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%)',
              width: '60%',
              animation: 'submitButtonShimmer 1.5s ease-in-out infinite',
            }}
          />
        </div>
      )}
    </button>
  );
};

