import { useQuery } from '@tanstack/react-query';
import { usePsicologoStore, fetchPsicologos, fetchPsicologoById, fetchPsicologoByFilter, verPsicologos } from '@/store/psicologoStore';
import { Psicologo, PsicologoAtivo } from '@/types/psicologoTypes';

export function usePsicologos() {
    const query = useQuery<Psicologo[]>({
        queryKey: ['psicologos'],
        queryFn: async () => {
            await fetchPsicologos();
            return (usePsicologoStore.getState().Psicologos ?? []) as unknown as Psicologo[];
        },
        retry: 1,
        staleTime: 5 * 60 * 1000,
        enabled: true,
    });

    return {
        psicologos: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}

export function usePsicologoById(id: string | undefined) {
    const query = useQuery<Psicologo | null>({
        queryKey: ['psicologo', id],
        queryFn: async () => {
            if (!id || id.trim() === '') {
                return null;
            }
            try {
                await fetchPsicologoById(id);
                // Busca o psicólogo do estado atualizado
                return usePsicologoStore.getState().Psicologo ?? null;
            } catch (error) {
                console.error('Erro ao buscar psicólogo:', error);
                throw error;
            }
        },
        enabled: !!id && id.trim() !== '',
        retry: 1,
        staleTime: 5 * 60 * 1000,
    });

    return {
        psicologo: query.data ?? null,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}

export function usePsicologoByFilter(filter: string | undefined) {
    const query = useQuery<Psicologo[]>({
        queryKey: ['psicologos', 'filter', filter],
        queryFn: async () => {
            if (!filter) return [];
            // Usa 'nome' em vez de 'filter' conforme a interface PsicologoFilterParams
            await fetchPsicologoByFilter({ nome: filter });
            return (usePsicologoStore.getState().Psicologos ?? []) as unknown as Psicologo[];
        },
        enabled: !!filter,
        retry: 1,
        staleTime: 5 * 60 * 1000,
    });

    return {
        psicologos: query.data ?? [],
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}

export function useVerPsicologos() {
    const query = useQuery<PsicologoAtivo[]>({
        queryKey: ['verPsicologos'],
        queryFn: async () => {
            const data = await verPsicologos();
            // Garante que todos os campos da interface estejam presentes
            return (data ?? []).map((item: PsicologoAtivo) => ({
                Id: item.Id ?? '',
                Nome: item.Nome ?? '',
                Crp: item.Crp ?? '',
                Images: item.Images ?? [],
                Reviews: item.Reviews ?? [],
                ProfessionalProfiles: item.ProfessionalProfiles ?? [],
                PsychologistAgendas: item.PsychologistAgendas ?? [],
                ReviewsReceived: item.ReviewsReceived ?? [],
            }));
        },
        retry: 1,
        staleTime: 5 * 60 * 1000,
        enabled: true,
    });

    return {
        psicologos: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}