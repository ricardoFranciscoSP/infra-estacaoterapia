"use client";

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { getApiUrl } from '@/config/env';

export function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const checkInProgress = useRef(false);
  const lastCheckRef = useRef<number>(0);

  // Rotas públicas que não devem ser bloqueadas
  const publicRoutes = [
    '/manutencao',
    '/login',
    '/register',
    '/forgot',
    '/esqueceu-a-senha',
    '/reset-senha',
    '/resetar',
    '/api',
    '/_next',
  ];

  const currentPathname = pathname || '';
  const isPublicRoute = publicRoutes.some(route => currentPathname.startsWith(route));

  useEffect(() => {
    // Se for rota pública, não precisa verificar manutenção
    if (isPublicRoute) {
      return;
    }

    // Evita múltiplas verificações simultâneas ou muito frequentes
    if (checkInProgress.current) {
      return;
    }

    // Throttle: só verifica a cada 2 segundos no máximo
    const now = Date.now();
    if (now - lastCheckRef.current < 2000) {
      return;
    }

    const checkMaintenance = async () => {
      checkInProgress.current = true;
      lastCheckRef.current = now;

      try {
        // Usa a função centralizada getApiUrl() que já tem a lógica correta de detecção
        let apiUrl: string;
        
        try {
          apiUrl = getApiUrl();
        } catch {
          // Se getApiUrl() falhar (SSR), detecta manualmente pelo hostname
          if (typeof window !== 'undefined') {
            const hostname = window.location.hostname;
            // Pré-produção
            if (hostname === 'pre.estacaoterapia.com.br' || hostname.startsWith('pre.')) {
              apiUrl = 'https://api.pre.estacaoterapia.com.br';
            } else if (hostname === 'estacaoterapia.com.br' || hostname === 'www.estacaoterapia.com.br') {
              apiUrl = 'https://api-prd.estacaoterapia.com.br';
            } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
              apiUrl = 'http://localhost:3333';
            } else {
              apiUrl = 'https://api.pre.estacaoterapia.com.br'; // Fallback seguro
            }
          } else {
            // SSR: usa produção como fallback
            apiUrl = 'https://api-prd.estacaoterapia.com.br';
          }
        }
        
        // Valida que a URL não seja o domínio raiz incorreto
        const invalidUrls = [
          'https://estacaoterapia.com.br',
          'http://estacaoterapia.com.br',
          'https://www.estacaoterapia.com.br',
          'http://www.estacaoterapia.com.br'
        ];
        
        if (invalidUrls.includes(apiUrl)) {
          // Se for domínio raiz incorreto, detecta pelo hostname
          if (typeof window !== 'undefined') {
            const hostname = window.location.hostname;
            if (hostname === 'pre.estacaoterapia.com.br' || hostname.startsWith('pre.')) {
              apiUrl = 'https://api.pre.estacaoterapia.com.br';
            } else {
              apiUrl = 'https://api-prd.estacaoterapia.com.br';
            }
          } else {
            apiUrl = 'https://api.pre.estacaoterapia.com.br'; // Fallback seguro
          }
        }
        
        // Remove barra final e /backend duplicado se houver
        let cleanApiUrl = apiUrl.replace(/\/$/, '').replace(/\/backend\/?$/, '');
        
        // Garante que não tenha /api duplicado
        if (cleanApiUrl.endsWith('/api')) {
          cleanApiUrl = cleanApiUrl.replace(/\/api$/, '');
        }
        
        const maintenanceUrl = `${cleanApiUrl}/api/configuracoes/manutencao`;
        
        console.log('🔍 [MaintenanceGuard] Verificando manutenção em:', maintenanceUrl);
        
        const response = await fetch(maintenanceUrl, {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
        });

        if (!response.ok) {
          // Se a API falhar, assume que NÃO está em manutenção para não bloquear o sistema
          checkInProgress.current = false;
          return;
        }

        const data = await response.json();
        const isMaintenanceMode = data.manutencao === true;

        if (isMaintenanceMode) {
          // Se estiver em manutenção, verifica se o usuário é Admin
          // IMPORTANTE: Apenas Admin tem acesso durante manutenção
          const isAdmin = user?.Role === 'Admin';

          if (!isAdmin && currentPathname !== '/manutencao') {
            // Se não for Admin, redireciona para página de manutenção
            router.push('/manutencao');
            checkInProgress.current = false;
            return;
          }
        }

        checkInProgress.current = false;
      } catch (error) {
        console.error('Erro ao verificar modo de manutenção:', error);
        // Em caso de erro, assume que NÃO está em manutenção para não bloquear o sistema
        checkInProgress.current = false;
      }
    };

    // Aguarda um pequeno delay para garantir que o AuthRestoreProvider tenha carregado o usuário
    const timer = setTimeout(() => {
      checkMaintenance();
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [pathname, user?.Role, router, isPublicRoute, currentPathname]);

  // IMPORTANTE: Sempre renderiza o conteúdo normalmente
  // A verificação de manutenção acontece em background e só redireciona se necessário
  // Isso garante que o usuário possa navegar normalmente quando não está em manutenção
  return <>{children}</>;
}
