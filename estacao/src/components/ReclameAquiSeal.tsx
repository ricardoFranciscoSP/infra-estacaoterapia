'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

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
  const [shouldLoadScript, setShouldLoadScript] = useState(false);

  // Função para recarregar o widget se necessário
  const reloadWidget = () => {
    if (typeof window !== 'undefined') {
      const windowWithRaichu = window as WindowWithRaichu;
      if (windowWithRaichu.__RAICHU_VERIFIED__) {
        try {
          windowWithRaichu.__RAICHU_VERIFIED__?.process?.();
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[ReclameAquiSeal] Erro ao processar widget:', error);
          }
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

  // Carrega o script apenas quando o selo entra em viewport
  useEffect(() => {
    if (shouldLoadScript) return;
    const element = containerRef.current;
    if (!element || typeof window === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoadScript(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [shouldLoadScript]);

  // Fallback para recarregar após um tempo (após carregar script)
  useEffect(() => {
    if (!shouldLoadScript) return;
    const timer = setTimeout(() => {
      reloadWidget();
    }, 500);

    return () => clearTimeout(timer);
  }, [shouldLoadScript]);

  return (
    <div className="flex justify-start w-full mt-1">
      <div 
        id="ra-verified-seal"
        ref={containerRef}
        data-testid="reclame-aqui-seal"
      >
        {/* Placeholder enquanto o script carrega */}
        <div className="inline-block bg-gray-100 rounded animate-pulse w-32 h-12" />
        
        {/* Script do Reclame Aqui - otimizado para Next.js */}
        {shouldLoadScript && (
          <Script
            id="ra-embed-verified-seal"
            src="/api/reclame-aqui/ra-verified/bundle.js"
            data-id="RUtTNlgtN1VLWEpoRGkzbTplc3RhY2FvLXRlcmFwaWEx"
            data-target="ra-verified-seal"
            data-model="compact_1"
            strategy="lazyOnload"
            onLoad={handleScriptLoad}
            onError={() => {
              if (process.env.NODE_ENV === 'development') {
                console.warn('[ReclameAquiSeal] Erro ao carregar script do Reclame Aqui');
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
