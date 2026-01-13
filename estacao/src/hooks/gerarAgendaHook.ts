import { useMutation } from '@tanstack/react-query';
import {
    useGerarAgendaStore,
    gerarAgendaManual
} from '@/store/gerarAgendaStore';
import { GerarAgendaResponse } from '@/services/gerarAgendaService';

// Hook para gerar agenda manualmente
export function useGerarAgendaManual() {
    const store = useGerarAgendaStore();
    
    const mutation = useMutation<GerarAgendaResponse, Error, void>({
        mutationFn: async () => {
            return await gerarAgendaManual();
        },
        onSuccess: (data) => {
            console.log('Agenda gerada com sucesso:', data);
        },
        onError: (error) => {
            console.error('Erro ao gerar agenda:', error);
        },
    });

    return {
        gerarAgenda: mutation.mutate,
        gerarAgendaAsync: mutation.mutateAsync,
        isLoading: mutation.isPending || store.isLoading,
        isError: mutation.isError,
        error: mutation.error || (store.error ? new Error(store.error) : null),
        isSuccess: mutation.isSuccess,
        resultados: store.resultados,
        ultimaGeracao: store.ultimaGeracao,
    };
}

