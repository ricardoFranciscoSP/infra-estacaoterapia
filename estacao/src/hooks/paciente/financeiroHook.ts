import { useQuery } from '@tanstack/react-query';
import { useFinanceiroStore, fetchFinanceiros } from '@/store/financeiroStore';
import { PagamentoResponse } from '@/types/financeiroTypes';

// Hook para buscar todos os pagamentos
export function useFinanceiro() {
    const setFinanceiros = useFinanceiroStore(state => state.setFinanceiros);

    const query = useQuery<PagamentoResponse>({
        queryKey: ['financeiros'],
        queryFn: async () => {
            const data = await fetchFinanceiros();
            setFinanceiros(data.pagamentos);
            return data;
        },
        retry: 1,
        staleTime: 0, // Sempre busca dados frescos em áreas logadas
        gcTime: 0, // Não mantém cache em áreas logadas
        refetchOnWindowFocus: true, // Refetch quando a janela ganha foco
        refetchOnMount: true, // Sempre refetch ao montar o componente
        refetchOnReconnect: true, // Refetch ao reconectar
        enabled: true,
    });

    return {
        financeiros: query.data?.pagamentos || query.data || [],
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}


