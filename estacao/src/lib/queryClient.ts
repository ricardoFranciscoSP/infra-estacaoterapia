// lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Sempre buscar dados frescos (sem cache local)
            staleTime: 0,
            gcTime: 0, // 👈 Antigo `cacheTime` (novo nome: `gcTime`)
            retry: 1,
            refetchOnWindowFocus: true,
            refetchOnMount: true,
            refetchOnReconnect: true,
        },
        mutations: {
            // ⚡ OTIMIZAÇÃO: Retry reduzido para mutations
            retry: 0,
        },
    },
});