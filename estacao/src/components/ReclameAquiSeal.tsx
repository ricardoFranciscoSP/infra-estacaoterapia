'use client';

import Script from 'next/script';
import { useEffect, useRef } from 'react';

/**
 * Componente para renderizar o selo verificado do Reclame Aqui
 * Usa as melhores práticas do Next.js para scripts de terceiros
 * 
 * Benefícios:
 * - Carregamento otimizado via Next.js Script
 * - Fallback para recarregar se o bundle falhar
 * - Gerenciamento correto de lifecycle
 * - Performance otimizada
 */

interface WindowWithRaichu extends Window {
  __RAICHU_VERIFIED__?: {
    process?: () => void;
  };
}

export default function ReclameAquiSeal() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Função para recarregar o widget se necessário
  const reloadWidget = () => {
    if (typeof window !== 'undefined') {
      const windowWithRaichu = window as WindowWithRaichu;
      if (windowWithRaichu.__RAICHU_VERIFIED__) {
        try {
          windowWithRaichu.__RAICHU_VERIFIED__?.process?.();
        } catch (error) {
          console.warn('[ReclameAquiSeal] Erro ao processar widget:', error);
        }
      }
    }
  };

  // Callback quando o script carregar
  const handleScriptLoad = () => {
    // Aguarda um frame para garantir que o DOM está atualizado
    requestAnimationFrame(() => {
      reloadWidget();
    });
  };

  // Fallback para recarregar após um tempo
  useEffect(() => {
    const timer = setTimeout(() => {
      reloadWidget();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex justify-start w-full mt-1">
      <div 
        id="ra-verified-seal"
        ref={containerRef}
        data-testid="reclame-aqui-seal"
        aria-label="Reclame Aqui - Verificado"
      >
        {/* Placeholder enquanto o script carrega */}
        <div className="inline-block bg-gray-100 rounded animate-pulse w-32 h-12" />
        
        {/* Script do Reclame Aqui - otimizado para Next.js */}
        <Script
          id="ra-embed-verified-seal"
          src="https://s3.amazonaws.com/raichu-beta/ra-verified/bundle.js"
          data-id="RUtTNlgtN1VLWEpoRGkzbTplc3RhY2FvLXRlcmFwaWEx"
          data-target="ra-verified-seal"
          data-model="compact_1"
          strategy="afterInteractive"
          onLoad={handleScriptLoad}
          onError={() => {
            console.warn('[ReclameAquiSeal] Erro ao carregar script do Reclame Aqui');
          }}
        />
      </div>
    </div>
  );
}
