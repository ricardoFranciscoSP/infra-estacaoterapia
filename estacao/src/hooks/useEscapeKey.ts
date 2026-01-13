import { useEffect } from 'react';

/**
 * Hook para fechar modais ao pressionar ESC
 * Funciona tanto no Windows quanto no Mac
 * 
 * @param isOpen - Indica se o modal está aberto
 * @param onClose - Função para fechar o modal
 */
export function useEscapeKey(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Esc") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);
}

