'use client';

import { useEffect, useState } from 'react';

/**
 * Tipos para a API do GoAdopt
 */
interface GoAdoptConfig {
  cookieDomain?: string;
}

interface GoAdoptAPI {
  setCookieDomain?: (domain: string) => void;
}

interface WindowWithGoAdopt extends Window {
  __adoptConfig?: GoAdoptConfig;
  adopt?: GoAdoptAPI;
}

/**
 * GoAdopt Consent Management Component
 * Integra o sistema de consentimento de cookies via GoAdopt
 * 
 * IMPORTANTE: A meta tag adopt-website-id deve estar no <head> do layout principal
 * O script é carregado via useEffect para melhor controle do protocolo HTTPS
 */
export default function GoAdoptConsent() {
  const [shouldLoadScript, setShouldLoadScript] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let didLoad = false;
    const triggerLoad = () => {
      if (didLoad) return;
      didLoad = true;
      setShouldLoadScript(true);
      window.removeEventListener('mousedown', triggerLoad);
      window.removeEventListener('touchstart', triggerLoad);
      window.removeEventListener('keydown', triggerLoad);
      window.removeEventListener('scroll', triggerLoad);
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
      window.removeEventListener('mousedown', triggerLoad);
      window.removeEventListener('touchstart', triggerLoad);
      window.removeEventListener('keydown', triggerLoad);
      window.removeEventListener('scroll', triggerLoad);
    };
  }, []);

  useEffect(() => {
    if (!shouldLoadScript) return;
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (pathname.startsWith('/adm-finance') || pathname.startsWith('/adm-estacao') || pathname.startsWith('/adm-login')) {
        return;
      }
    }
    // Configura o domínio dos cookies do GoAdopt após o script carregar
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      // Define o domínio base para os cookies do GoAdopt
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        const baseDomain = '.' + parts.slice(-2).join('.');
        // Configura o domínio antes do GoAdopt inicializar
        if (typeof document !== 'undefined') {
          // Adiciona configuração global para o GoAdopt
          const windowWithGoAdopt = window as WindowWithGoAdopt;
          windowWithGoAdopt.__adoptConfig = {
            cookieDomain: baseDomain,
          };
        }
      }
    }

    // Carrega o script GoAdopt de forma segura e só se não houver erro de rede
    const loadGoAdoptScript = () => {
      if (document.querySelector('script[src*="tag.goadopt.io"]')) {
        // Script já está carregado
        return;
      }

      fetch('https://tag.goadopt.io/injector.js?website_code=29ac98d9-078c-42d7-844f-8e9f0de2dc46', { method: 'HEAD' })
        .then(resp => {
          if (!resp.ok) throw new Error('Script GoAdopt não disponível');
          const script = document.createElement('script');
          script.src = 'https://tag.goadopt.io/injector.js?website_code=29ac98d9-078c-42d7-844f-8e9f0de2dc46';
          script.async = true;
          script.defer = true;
          script.className = 'adopt-injector';
          script.onload = () => {
            if (typeof window !== 'undefined') {
              const windowWithGoAdopt = window as WindowWithGoAdopt;
              if (windowWithGoAdopt.adopt) {
                try {
                  const hostname = window.location.hostname;
                  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
                    const parts = hostname.split('.');
                    if (parts.length >= 2) {
                      const baseDomain = '.' + parts.slice(-2).join('.');
                      if (windowWithGoAdopt.adopt.setCookieDomain) {
                        windowWithGoAdopt.adopt.setCookieDomain(baseDomain);
                      }
                    }
                  }
                } catch (error) {
                  if (process.env.NODE_ENV === 'development') {
                    console.warn('[GoAdopt] Não foi possível configurar o domínio dos cookies:', error);
                  }
                }
              }
            }
          };
          script.onerror = (error) => {
            if (process.env.NODE_ENV === 'development') {
              console.warn('[GoAdopt] Erro ao carregar script:', error);
            }
          };
          document.head.appendChild(script);
        })
        .catch(error => {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[GoAdopt] Script não carregado:', error);
          }
        });
    };

    // Carrega com um pequeno delay para garantir que o DOM está pronto
    const timer = setTimeout(loadGoAdoptScript, 100);

    return () => clearTimeout(timer);
  }, [shouldLoadScript]);

  return null;
}
