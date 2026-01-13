import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    useSolicitacaoStore,
    fetchSolicitacoes,
    fetchSolicitacaoById,
    createSolicitacao,
    updateSolicitacaoStatus,
    deleteSolicitacao,
    filterSolicitacoes
} from '@/store/solicitacaoStore';
import { solicitacaoService } from '@/services/solicitacoesService';
import { Solicitacao, CreateSolicitacaoData, FilterSolicitacoesParams } from '@/types/solicitacaoTypes';

// Buscar todas as solicitações do usuário logado
export function useSolicitacoes() {
    const store = useSolicitacaoStore();
    const query = useQuery<Solicitacao[]>({
        queryKey: ['solicitacoes'],
        queryFn: async () => {
            const solicitacoes = await fetchSolicitacoes();
            return solicitacoes;
        },
        staleTime: 5 * 60 * 1000, // 5 minutos
        refetchOnWindowFocus: false,
        initialData: store.Solicitacoes ?? undefined,
    });

    return {
        solicitacoes: query.data ?? [],
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch,
    };
}

// Buscar solicitação por ID
export function useSolicitacaoById(id: string | null) {
    const store = useSolicitacaoStore();
    const query = useQuery<Solicitacao | null>({
        queryKey: ['solicitacao', id],
        queryFn: async () => {
            if (!id) return null;
            const solicitacao = await fetchSolicitacaoById(id);
            return solicitacao;
        },
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        initialData: id === store.SolicitacaoSelecionada?.Id ? store.SolicitacaoSelecionada : undefined,
    });

    return {
        solicitacao: query.data ?? null,
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch,
    };
}

// Criar solicitação
export function useCreateSolicitacao() {
    const queryClient = useQueryClient();
    const mutation = useMutation<{ success: boolean; message: string }, Error, CreateSolicitacaoData>({
        mutationFn: async (data: CreateSolicitacaoData) => {
            return await createSolicitacao(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['solicitacoes'] });
        },
    });

    return {
        createSolicitacao: mutation.mutate,
        createSolicitacaoAsync: mutation.mutateAsync,
        isLoading: mutation.isPending,
        isError: mutation.isError,
        error: mutation.error,
        isSuccess: mutation.isSuccess,
    };
}

// Atualizar status da solicitação
export function useUpdateSolicitacaoStatus() {
    const queryClient = useQueryClient();
    const mutation = useMutation<{ success: boolean; message: string }, Error, { solicitacaoId: string; status: string }>({
        mutationFn: async ({ solicitacaoId, status }) => {
            return await updateSolicitacaoStatus(solicitacaoId, status);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['solicitacoes'] });
        },
    });

    return {
        updateSolicitacaoStatus: mutation.mutate,
        updateSolicitacaoStatusAsync: mutation.mutateAsync,
        isLoading: mutation.isPending,
        isError: mutation.isError,
        error: mutation.error,
        isSuccess: mutation.isSuccess,
    };
}

// Deletar solicitação
export function useDeleteSolicitacao() {
    const queryClient = useQueryClient();
    const mutation = useMutation<{ success: boolean; message: string }, Error, string>({
        mutationFn: async (id: string) => {
            return await deleteSolicitacao(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['solicitacoes'] });
        },
    });

    return {
        deleteSolicitacao: mutation.mutate,
        deleteSolicitacaoAsync: mutation.mutateAsync,
        isLoading: mutation.isPending,
        isError: mutation.isError,
        error: mutation.error,
        isSuccess: mutation.isSuccess,
    };
}

// Filtrar solicitações
export function useFilterSolicitacoes() {
    const queryClient = useQueryClient();

    const mutation = useMutation<Solicitacao[], Error, FilterSolicitacoesParams>({
        mutationFn: async (params: FilterSolicitacoesParams) => {
            return await filterSolicitacoes(params);
        },
        onSuccess: (solicitacoes) => {
            queryClient.setQueryData(['solicitacoes'], solicitacoes);
        },
    });

    return {
        filterSolicitacoes: mutation.mutate,
        filterSolicitacoesAsync: mutation.mutateAsync,
        isLoading: mutation.isPending,
        isError: mutation.isError,
        error: mutation.error,
        isSuccess: mutation.isSuccess,
    };
}

// ============ HOOKS PARA ADMINISTRAÇÃO ============

// Buscar todas as solicitações (admin)
export function useAllSolicitacoes() {
    const store = useSolicitacaoStore();
    const query = useQuery<Solicitacao[]>({
        queryKey: ['solicitacoes', 'all'],
        queryFn: async () => {
            try {
                const response = await solicitacaoService.getAllSolicitacoes();
                const solicitacoes = response.data.solicitacoes || [];
                useSolicitacaoStore.getState().SetSolicitacoes(solicitacoes);
                return solicitacoes;
            } catch (error: unknown) {
                console.error('[Solicitações] Erro ao buscar todas as solicitações:', error);

                // Log detalhado do erro
                if (error && typeof error === 'object' && 'response' in error) {
                    const axiosError = error as { response?: { status?: number; statusText?: string; data?: unknown } };
                    console.error('[Solicitações] Erro de resposta:', {
                        status: axiosError.response?.status,
                        statusText: axiosError.response?.statusText,
                        data: axiosError.response?.data,
                    });

                    // Se for 401/403, significa que não está autenticado
                    if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
                        console.error('[Solicitações] Erro de autenticação/autorização');
                    }
                } else if (error && typeof error === 'object' && 'request' in error) {
                    const requestError = error as { message?: string; code?: string };
                    console.error('[Solicitações] Erro de requisição (sem resposta):', {
                        message: requestError.message,
                        code: requestError.code
                    });
                } else {
                    const genericError = error as { message?: string };
                    console.error('[Solicitações] Erro:', genericError.message);
                }

                useSolicitacaoStore.getState().SetSolicitacoes([]);

                // Relança o erro para que o React Query trate corretamente
                throw error;
            }
        },
        staleTime: 2 * 60 * 1000, // 2 minutos para admin (atualiza mais frequentemente)
        refetchOnWindowFocus: true,
        retry: 1, // Tentar 1 vez antes de falhar
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Backoff exponencial
        initialData: store.Solicitacoes ?? undefined,
    });

    return {
        solicitacoes: query.data ?? [],
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch,
    };
}

// Buscar apenas solicitações financeiras (admin/finance)
export function useFinanceSolicitacoes() {
    const store = useSolicitacaoStore();
    const query = useQuery<Solicitacao[]>({
        queryKey: ['solicitacoes', 'financeiro'],
        queryFn: async () => {
            try {
                const response = await solicitacaoService.getSolicitacoesFinanceiro();
                const solicitacoes = response.data.solicitacoes || [];
                useSolicitacaoStore.getState().SetSolicitacoes(solicitacoes);
                return solicitacoes;
            } catch (error: unknown) {
                console.error('[Solicitações] Erro ao buscar solicitações financeiras:', error);
                useSolicitacaoStore.getState().SetSolicitacoes([]);
                throw error;
            }
        },
        staleTime: 2 * 60 * 1000, // 2 minutos para admin (atualiza mais frequentemente)
        refetchOnWindowFocus: true,
        retry: 1,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        initialData: store.Solicitacoes ?? undefined,
    });

    return {
        solicitacoes: query.data ?? [],
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch,
    };
}

// Atualizar solicitação completa (admin)
export function useUpdateSolicitacao() {
    const queryClient = useQueryClient();
    const mutation = useMutation<{ success: boolean; message: string }, Error, { id: string; dados: Partial<Solicitacao> }>({
        mutationFn: async ({ id, dados }) => {
            // Se estiver atualizando apenas o status, usa o endpoint específico
            if (dados.Status && Object.keys(dados).length === 1) {
                return await updateSolicitacaoStatus(id, dados.Status);
            }
            // Para atualizações mais complexas, pode precisar de um endpoint adicional
            // Por enquanto, vamos usar apenas o update de status
            if (dados.Status) {
                return await updateSolicitacaoStatus(id, dados.Status);
            }
            throw new Error('Atualização não suportada');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['solicitacoes'] });
        },
    });

    return {
        updateSolicitacao: mutation.mutate,
        updateSolicitacaoAsync: mutation.mutateAsync,
        isLoading: mutation.isPending,
        isError: mutation.isError,
        error: mutation.error,
        isSuccess: mutation.isSuccess,
    };
}

// Adicionar resposta à thread da solicitação
export function useAddResponse() {
    const queryClient = useQueryClient();
    const mutation = useMutation<{ success: boolean; message: string }, Error, { solicitacaoId: string; mensagem: string; status?: string }>({
        mutationFn: async ({ solicitacaoId, mensagem, status }) => {
            const response = await solicitacaoService.addResponse({
                solicitacaoId,
                mensagem,
                status,
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['solicitacoes'] });
            queryClient.invalidateQueries({ queryKey: ['solicitacao'] });
        },
    });

    return {
        addResponse: mutation.mutate,
        addResponseAsync: mutation.mutateAsync,
        isLoading: mutation.isPending,
        isError: mutation.isError,
        error: mutation.error,
        isSuccess: mutation.isSuccess,
    };
}
