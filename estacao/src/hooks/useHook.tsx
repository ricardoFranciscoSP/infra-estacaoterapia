import { getConsultaAvulsa, getCreditoAvulso, ConsultaAvulsa, CreditoAvulso } from '@/services/userAvulsoService';
import { userService } from '@/services/useService';
import { useQuery } from '@tanstack/react-query';

export function useConsultaAvulsa() {
    const query = useQuery<ConsultaAvulsa[]>({
        queryKey: ['consultaAvulsa'],
        queryFn: getConsultaAvulsa,
        staleTime: 0, // Sempre busca dados frescos em áreas logadas
        gcTime: 0, // Não mantém cache em áreas logadas
        refetchOnWindowFocus: true, // Refetch quando a janela ganha foco
        refetchOnMount: true, // Sempre refetch ao montar o componente
        refetchOnReconnect: true, // Refetch ao reconectar
    });
    return {
        consultaAvulsa: query.data,
        isConsultaAvulsaLoading: query.isLoading,
        refetch: query.refetch,
    };
}

export function useCreditoAvulso() {
    const query = useQuery<CreditoAvulso[]>({
        queryKey: ['creditoAvulso'],
        queryFn: getCreditoAvulso,
        staleTime: 0, // Sempre busca dados frescos em áreas logadas
        gcTime: 0, // Não mantém cache em áreas logadas
        refetchInterval: 5000, // Refetch a cada 5 segundos para atualização em tempo real
        refetchOnWindowFocus: true, // Refetch quando a janela ganha foco
        refetchOnMount: true, // Sempre refetch ao montar o componente
        refetchOnReconnect: true, // Refetch ao reconectar
    });
    return {
        creditoAvulso: query.data,
        isCreditoAvulsoLoading: query.isLoading,
        refetch: query.refetch,
    };
}

export function usePlanoCompra(userId?: string) {
    const { data, isLoading } = useQuery({
        queryKey: ['planoCompra', userId],
        queryFn: async () => {
            if (!userId) return null;
            const { data } = await userService().getUser();
            return data;
        },
        enabled: !!userId,
    });

    return {
        planoCompraData: data,
        isPlanoLoading: isLoading,
    };
}

export function useUserPlano() {
    const { data, isLoading } = useQuery({
        queryKey: ['userData'],
        queryFn: async () => {
            const { data } = await userService().getUserPlano();
            return data;
        },
    });

    return {
        userPlanoData: data,
        isUserPlanoLoading: isLoading,
    };
}