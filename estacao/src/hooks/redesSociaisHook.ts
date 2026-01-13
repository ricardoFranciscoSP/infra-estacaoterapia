import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { redesSociaisService, RedesSociais } from '@/services/configuracoesService';

// Hook para buscar redes sociais (usa rota pública)
export function useRedesSociais() {
    const query = useQuery<RedesSociais[]>({
        queryKey: ['redesSociais'],
        queryFn: async () => {
            const response = await redesSociaisService.getPublic();
            return response.data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutos
        gcTime: 10 * 60 * 1000, // 10 minutos
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
    });

    return {
        redesSociais: query.data ?? [],
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch,
    };
}

// Hook para atualizar redes sociais
export function useUpdateRedesSociais() {
    const queryClient = useQueryClient();

    const mutation = useMutation<RedesSociais, Error, Partial<RedesSociais>>({
        mutationFn: async (data) => {
            const response = await redesSociaisService.update(data);
            return response.data;
        },
        onSuccess: () => {
            // Invalida o cache para forçar reload
            queryClient.invalidateQueries({ queryKey: ['redesSociais'] });
        },
    });

    return {
        updateRedesSociais: mutation.mutate,
        updateRedesSociaisAsync: mutation.mutateAsync,
        isLoading: mutation.isPending,
        isError: mutation.isError,
        error: mutation.error,
        isSuccess: mutation.isSuccess,
    };
}

// Hook para criar redes sociais
export function useCreateRedesSociais() {
    const queryClient = useQueryClient();

    const mutation = useMutation<RedesSociais, Error, Partial<RedesSociais>>({
        mutationFn: async (data) => {
            const response = await redesSociaisService.create(data);
            return response.data;
        },
        onSuccess: () => {
            // Invalida o cache para forçar reload
            queryClient.invalidateQueries({ queryKey: ['redesSociais'] });
        },
    });

    return {
        createRedesSociais: mutation.mutate,
        createRedesSociaisAsync: mutation.mutateAsync,
        isLoading: mutation.isPending,
        isError: mutation.isError,
        error: mutation.error,
        isSuccess: mutation.isSuccess,
    };
}
