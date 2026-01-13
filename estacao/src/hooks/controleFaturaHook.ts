import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useControleFaturaStore, Fatura, FaturaStatus } from '@/store/controleFaturaStore';

// Buscar todas as faturas
export function useFaturas() {
    const { fetchFaturas } = useControleFaturaStore();
    const query = useQuery<Fatura[]>({
        queryKey: ['faturas'],
        queryFn: async () => {
            await fetchFaturas();
            return useControleFaturaStore.getState().faturas;
        },
        retry: 1,
        staleTime: 5 * 60 * 1000,
        enabled: false,
    });
    return {
        faturas: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}

// Buscar fatura por ID
export function useFaturaById(id: string | undefined) {
    const { getControleFaturaById } = useControleFaturaStore();
    const query = useQuery<Fatura | null>({
        queryKey: ['fatura', id],
        queryFn: async () => {
            if (!id) return null;
            await getControleFaturaById(id);
            return useControleFaturaStore.getState().fatura;
        },
        enabled: !!id,
        retry: 1,
        staleTime: 5 * 60 * 1000,
    });
    return {
        fatura: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}

// Buscar faturas por usuário
export function useFaturasByUserId(userId: string | undefined) {
    const { getControleFaturasByUserId } = useControleFaturaStore();
    const query = useQuery<Fatura[]>({
        queryKey: ['faturasByUser', userId],
        queryFn: async () => {
            if (!userId) return [];
            await getControleFaturasByUserId(userId);
            return useControleFaturaStore.getState().faturas;
        },
        enabled: !!userId,
        retry: 1,
        staleTime: 5 * 60 * 1000,
    });
    return {
        faturas: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}

// Criar nova fatura
export function useCriarFatura() {
    const queryClient = useQueryClient();
    const { criarControleFatura } = useControleFaturaStore();
    const mutation = useMutation({
        mutationFn: (data: Omit<Fatura, 'Id' | 'CreatedAt' | 'UpdatedAt'>) => criarControleFatura(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['faturas'] });
        },
    });
    return {
        criarFatura: mutation.mutate,
        isError: mutation.status === 'error',
        isSuccess: mutation.status === 'success',
        error: mutation.error,
    };
}

// Atualizar status da fatura
export function useUpdateFaturaStatus() {
    const queryClient = useQueryClient();
    const { updateControleFaturaStatus } = useControleFaturaStore();
    const mutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: FaturaStatus }) =>
            updateControleFaturaStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['faturas'] });
        },
    });
    return {
        updateStatus: mutation.mutate,
        isError: mutation.status === 'error',
        isSuccess: mutation.status === 'success',
        error: mutation.error,
    };
}

// Deletar fatura
export function useDeleteFatura() {
    const queryClient = useQueryClient();
    const { deleteControleFatura } = useControleFaturaStore();
    const mutation = useMutation({
        mutationFn: (id: string) => deleteControleFatura(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['faturas'] });
        },
    });
    return {
        deleteFatura: mutation.mutate,
        isError: mutation.status === 'error',
        isSuccess: mutation.status === 'success',
        error: mutation.error,
    };
}
