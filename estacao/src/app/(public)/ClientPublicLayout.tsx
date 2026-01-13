"use client";
import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useClearFiltersOnNavigation } from '@/hooks/useClearFiltersOnNavigation';
import { useAuth } from '@/hooks/authHook';
import { getRedirectRouteByRole } from '@/utils/redirectByRole';

export default function ClientPublicLayout({ children }: { children: React.ReactNode }) {
  // Limpa filtros de psicólogo ao navegar para outras páginas
  useClearFiltersOnNavigation();
  
  const router = useRouter();
  const pathname = usePathname();
  const { user, fetchUser, isLoading } = useAuth();
  
  // ⚡ OTIMIZAÇÃO: Verifica se o usuário está logado e redireciona (defer para não bloquear renderização)
  useEffect(() => {
    // Aguarda o carregamento completo
    if (isLoading) return;
    
    // ⚡ OTIMIZAÇÃO: Defer verificação de token para não bloquear renderização inicial
    // Usa requestIdleCallback quando disponível, senão setTimeout
    const scheduleCheck = (callback: () => void) => {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        requestIdleCallback(callback, { timeout: 2000 });
      } else {
        setTimeout(callback, 100);
      }
    };

    scheduleCheck(() => {
      // Verifica se há token de autenticação
      const hasToken = typeof window !== 'undefined' 
        ? document.cookie.split('; ').some((row) => row.startsWith('token='))
        : false;
      
      // Se não há token, não precisa redirecionar
      if (!hasToken) return;
      
      // Se não há usuário ainda, tenta buscar (apenas uma vez)
      if (!user) {
        fetchUser().catch(() => {
          // Silencioso - se falhar, não redireciona
        });
        return;
      }
      
      // Se tem usuário, verifica se está na home (/) e redireciona se necessário
      if (pathname === '/' && user?.Role) {
        const redirectRoute = getRedirectRouteByRole(user);
        if (redirectRoute) {
          router.replace(redirectRoute);
        }
      }
    });
  }, [user, isLoading, pathname, router, fetchUser]);
  
  return <>{children}</>;
}

