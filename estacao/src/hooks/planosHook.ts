import { useQuery } from '@tanstack/react-query';
import { fetchPlanoById, usePlanoStore, type Plano } from '@/store/planoStore';
import { Planos } from '@/types/planosVendaTypes';

// Função auxiliar para converter Plano em Planos
function convertPlanoToPlanos(plano: Plano | undefined): Planos | undefined {
    if (!plano) return undefined;
    
    return {
        Id: plano.Id,
        Nome: plano.Nome,
        Descricao: plano.Descricao,
        Preco: plano.Preco,
        Status: plano.Status,
        ProductId: plano.ProductId ?? "",
        VindiPlanId: plano.VindiPlanId ?? "",
        Tipo: plano.Tipo ?? plano.Type ?? "",
        Type: plano.Type,
        Duracao: plano.Duracao,
    };
}

// Hook para buscar um plano por id
export function usePlanoById(id: string) {
    const setPlanos = usePlanoStore(state => state.setPlanos);

    const query = useQuery<Planos | undefined>({
        queryKey: ['planos', id],
        queryFn: async () => {
            const data = await fetchPlanoById(id);
            if (data) {
                setPlanos([data]);
                return convertPlanoToPlanos(data);
            }
            return undefined;
        },
        retry: 1,
        staleTime: 5 * 60 * 1000,
        enabled: !!id,
    });

    return {
        planos: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}


