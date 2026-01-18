'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { api } from '@/lib/axios';
import { asTrustedHTML } from '@/utils/trustedTypes';

interface IntegrationsResponse {
  googleTagManager: string | null;
  googleAnalytics: string | null;
}

/**
 * GoogleIntegrations Component
 * 
 * Otimizado para performance:
 * - GTM carregado via next/script com strategy lazyOnload (não bloqueia renderização)
 * - Google Analytics carregado via next/script com strategy lazyOnload
 * - Scripts de terceiros não bloqueiam o carregamento inicial da página
 */
export default function GoogleIntegrations() {
  const [integrations, setIntegrations] = useState<IntegrationsResponse>({
    googleTagManager: null,
    googleAnalytics: null,
  });

  useEffect(() => {
    // Não buscar integrações em rotas administrativas
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (pathname.startsWith('/adm-finance') || pathname.startsWith('/adm-estacao') || pathname.startsWith('/adm-login')) {
        return;
      }
    }

    const fetchIntegrations = async () => {
      try {
        const response = await api.get<IntegrationsResponse>('/faqs/integrations');
        setIntegrations(response.data);
      } catch {
        // Silenciar erro em rotas administrativas
        if (typeof window !== 'undefined') {
          const pathname = window.location.pathname;
          if (pathname.startsWith('/adm-finance') || pathname.startsWith('/adm-estacao') || pathname.startsWith('/adm-login')) {
            return;
          }
        }
      }
    };

    fetchIntegrations();
  }, []);

  // Helper para obter domínio dos cookies
  const getCookieDomain = () => {
    if (typeof window === 'undefined') return 'auto';
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'auto';
    }
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      const baseDomain = parts.slice(-2).join('.');
      return '.' + baseDomain;
    }
    return 'auto';
  };

  // ⚡ OTIMIZAÇÃO: Delay no carregamento de scripts de terceiros para melhorar LCP
  const [shouldLoadScripts, setShouldLoadScripts] = useState(false);

  useEffect(() => {
    // Aguarda interação do usuário ou 3 segundos após carregamento
    const loadAfterInteraction = () => {
      setShouldLoadScripts(true);
      // Remove listeners após carregar (sem options, pois once já remove automaticamente)
      window.removeEventListener('mousedown', loadAfterInteraction);
      window.removeEventListener('touchstart', loadAfterInteraction);
      window.removeEventListener('keydown', loadAfterInteraction);
      window.removeEventListener('scroll', loadAfterInteraction);
    };

    // Opções para event listeners
    const listenerOptions: AddEventListenerOptions = { once: true, passive: true };

    // Carrega após interação do usuário (melhor para performance)
    window.addEventListener('mousedown', loadAfterInteraction, listenerOptions);
    window.addEventListener('touchstart', loadAfterInteraction, listenerOptions);
    window.addEventListener('keydown', loadAfterInteraction, listenerOptions);
    window.addEventListener('scroll', loadAfterInteraction, listenerOptions);

    // Fallback: carrega após 3 segundos se não houver interação
    const timeout = setTimeout(() => {
      setShouldLoadScripts(true);
      loadAfterInteraction();
    }, 3000);

    return () => {
      clearTimeout(timeout);
      loadAfterInteraction(); // Remove listeners
    };
  }, []);

  return (
    <>
      {/* Google Tag Manager - Carregado apenas após interação do usuário */}
      {shouldLoadScripts && integrations.googleTagManager && (
        <>
          <Script
            id="gtm-script"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: asTrustedHTML(`
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.defer=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${integrations.googleTagManager}');
              `),
            }}
          />
          {/* Noscript fallback para GTM */}
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${integrations.googleTagManager}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
              loading="lazy"
            />
          </noscript>
        </>
      )}

      {/* Google Analytics - Carregado apenas após interação do usuário */}
      {shouldLoadScripts && integrations.googleAnalytics && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${integrations.googleAnalytics}`}
            strategy="afterInteractive"
            id="ga-external-script"
          />
          <Script
            id="ga-script"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: asTrustedHTML(`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                
                const cookieDomain = '${getCookieDomain()}';
                
                gtag('config', '${integrations.googleAnalytics}', {
                  page_path: window.location.pathname,
                  send_page_view: false,
                  cookie_domain: cookieDomain,
                  cookie_flags: 'SameSite=None;Secure',
                  cookie_expires: 63072000,
                });
              `),
            }}
          />
        </>
      )}
    </>
  );
}


