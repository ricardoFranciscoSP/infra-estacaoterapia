import { useQuery } from '@tanstack/react-query';
import { Plano, fetchPlano, usePlanoStore } from '@/store/planoStore';

// Função auxiliar para normalizar a descrição
function normalizarDescricao(descricao: unknown): string[] {
    if (!descricao) return [];
    if (Array.isArray(descricao)) return descricao;
    if (typeof descricao === 'string') return [descricao];
    return [];
}

// Hook para buscar todos os planos de venda
export function useVendaPlanos() {
    const setPlanos = usePlanoStore(state => state.setPlanos);

    const query = useQuery<Plano[]>({
        queryKey: ['planos-venda'],
        queryFn: async () => {
            const planos = await fetchPlano();
            // Normaliza os dados para garantir que Descricao esteja no formato correto
            const planosNormalizados = Array.isArray(planos) ? planos.map(plano => {
                const planoAny = plano as Partial<{ descricao?: unknown }>;
                return {
                    ...plano,
                    Descricao: normalizarDescricao(plano.Descricao || planoAny.descricao),
                };
            }) : [];
            setPlanos(planosNormalizados);
            return planosNormalizados;
        },
        retry: 1,
        staleTime: 5 * 60 * 1000,
        enabled: true,
        refetchOnWindowFocus: true,
    });

    return {
        planos: query.data || [],
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}






