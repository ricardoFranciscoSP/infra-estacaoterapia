// lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // ⚠️ IMPORTANTE: Em áreas logadas, os hooks específicos sobrescrevem essas configurações
            // para sempre buscar dados frescos (staleTime: 0, gcTime: 0)
            // Estas configurações padrão são para áreas públicas/não-logadas
            staleTime: 1000 * 60 * 5,
            gcTime: 1000 * 60 * 30, // 👈 Antigo `cacheTime` (novo nome: `gcTime`)
            retry: 1,
            refetchOnWindowFocus: false,
            // ⚡ OTIMIZAÇÃO: Reduz overhead na thread principal
            refetchOnMount: false,
            refetchOnReconnect: false,
        },
        mutations: {
            // ⚡ OTIMIZAÇÃO: Retry reduzido para mutations
            retry: 0,
        },
    },
});