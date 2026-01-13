import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface Cancelamento {
    Id: string;
    Protocolo: string;
    Motivo: string;
    Status: string;
    Data: string;
    Horario: string;
    LinkDock?: string;
    Autor?: {
        Id: string;
        Nome: string;
        Email: string;
    };
    Sessao?: {
        Psicologo?: {
            Id: string;
            Nome: string;
            Email: string;
        };
    };
    Documents?: Array<{
        Id: string;
        Url: string;
        Type?: string;
        Description?: string;
        CreatedAt?: string;
    }>;
}

// Contador por status parametrizável (default: 'Cancelado')
export function useAdmCancelamentosCount(status: string = 'Cancelado') {
    const query = useQuery<number>({
        queryKey: ['cancelamentosCount', status],
        queryFn: async () => {
            const response = await api.get('/cancelamento/count', {
                params: { status }
            });
            const data = response.data;
            return Number(data?.count) || 0;
        },
        retry: 1,
        staleTime: 5 * 60 * 1000,
        enabled: true,
    });

    return {
        count: query.data || 0,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}

export function useAdmCancelamentos(status?: string) {
    const query = useQuery<Cancelamento[]>({
        queryKey: ['cancelamentos', status],
        queryFn: async () => {
            const response = await api.get('/cancelamento');
            let cancelamentos = response.data || [];

            // Se status foi especificado, filtrar
            if (status) {
                cancelamentos = cancelamentos.filter((c: Cancelamento) => {
                    const cStatus = c.Status;
                    return cStatus === status;
                });
            }

            return cancelamentos;
        },
        retry: 1,
        staleTime: 5 * 60 * 1000,
        enabled: true,
    });

    return {
        cancelamentos: query.data || [],
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}
