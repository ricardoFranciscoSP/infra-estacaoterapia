'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { api } from '@/lib/axios';

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
    let didLoad = false;
    const removeListeners = () => {
      window.removeEventListener('mousedown', triggerLoad);
      window.removeEventListener('touchstart', triggerLoad);
      window.removeEventListener('keydown', triggerLoad);
      window.removeEventListener('scroll', triggerLoad);
    };

    const triggerLoad = () => {
      if (didLoad) return;
      didLoad = true;
      setShouldLoadScripts(true);
      removeListeners();
    };

    const listenerOptions: AddEventListenerOptions = { once: true, passive: true };
    window.addEventListener('mousedown', triggerLoad, listenerOptions);
    window.addEventListener('touchstart', triggerLoad, listenerOptions);
    window.addEventListener('keydown', triggerLoad, listenerOptions);
    window.addEventListener('scroll', triggerLoad, listenerOptions);

    const navigatorWithConnection = navigator as Navigator & {
      connection?: {
        saveData?: boolean;
      };
    };
    const canLoadOnIdle = !navigatorWithConnection?.connection?.saveData;
    const requestIdle = (
      callback: () => void,
      timeoutMs: number
    ) => {
      const w = window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
        cancelIdleCallback?: (id: number) => void;
      };
      if (w.requestIdleCallback) {
        return w.requestIdleCallback(callback, { timeout: timeoutMs });
      }
      return window.setTimeout(callback, timeoutMs);
    };

    const cancelIdle = (id: number) => {
      const w = window as Window & {
        cancelIdleCallback?: (idleId: number) => void;
      };
      if (w.cancelIdleCallback) {
        w.cancelIdleCallback(id);
      } else {
        clearTimeout(id);
      }
    };

    const idleId = requestIdle(() => {
      if (canLoadOnIdle) {
        triggerLoad();
      }
    }, 5000);

    return () => {
      cancelIdle(idleId);
      removeListeners();
    };
  }, []);

  return (
    <>
      {/* Google Tag Manager - Carregado apenas após interação do usuário */}
      {shouldLoadScripts && integrations.googleTagManager && (
        <>
          <Script
            id="gtm-script"
            strategy="lazyOnload"
            dangerouslySetInnerHTML={{
              __html: `
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.defer=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${integrations.googleTagManager}');
              `,
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
            strategy="lazyOnload"
            id="ga-external-script"
          />
          <Script
            id="ga-script"
            strategy="lazyOnload"
            dangerouslySetInnerHTML={{
              __html: `
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
              `,
            }}
          />
        </>
      )}
    </>
  );
}


