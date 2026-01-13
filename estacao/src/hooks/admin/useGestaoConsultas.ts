import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import toast from 'react-hot-toast';

export interface ConsultaPendente {
    Id: string;
    Status: string;
    Date: string;
    Time: string;
    Paciente?: {
        Id: string;
        Nome: string;
        Email: string;
    };
    Psicologo?: {
        Id: string;
        Nome: string;
        Email: string;
    };
    CancelamentoSessao?: {
        Id: string;
        Protocolo: string;
        Motivo: string;
        Status: string;
        Tipo: string;
        Documents?: Array<{
            Id: string;
            Url: string;
            Type?: string;
        }>;
        LinkDock?: string;
    };
}

export interface CancelamentoPendente {
    Id: string;
    Protocolo: string;
    Motivo: string;
    Status: string;
    Data: string;
    Horario: string;
    Tipo: string;
    Autor?: {
        Id: string;
        Nome: string;
        Email: string;
    };
    Paciente?: {
        Id: string;
        Nome: string;
        Email: string;
    };
    Psicologo?: {
        Id: string;
        Nome: string;
        Email: string;
    };
    Sessao?: {
        Id: string;
        Status: string;
        Date: string;
        Time: string;
    };
    Documents?: Array<{
        Id: string;
        Url: string;
        Type?: string;
        Description?: string;
    }>;
    LinkDock?: string;
}

export function useGestaoConsultas() {
    const queryClient = useQueryClient();

    // Buscar cancelamentos pendentes (EmAnalise)
    const cancelamentosQuery = useQuery<CancelamentoPendente[]>({
        queryKey: ['gestao-cancelamentos'],
        queryFn: async () => {
            const response = await api.get('/cancelamento');
            const cancelamentos = response.data || [];
            // Filtrar apenas os que estão em análise
            return cancelamentos.filter((c: CancelamentoPendente) => 
                c.Status === 'EmAnalise'
            );
        },
        retry: 1,
        staleTime: 30 * 1000, // 30 segundos
    });

    // Buscar consultas com status que precisam de aprovação
    // Nota: Endpoint pode não existir ainda, então vamos usar apenas cancelamentos por enquanto
    const consultasQuery = useQuery<ConsultaPendente[]>({
        queryKey: ['gestao-consultas-pendentes'],
        queryFn: async () => {
            // Por enquanto retorna array vazio, pode ser implementado depois
            return [];
        },
        retry: 1,
        staleTime: 30 * 1000,
        enabled: false, // Desabilitado até ter endpoint
    });

    // Mutação para aprovar cancelamento
    const aprovarCancelamento = useMutation({
        mutationFn: async (cancelamentoId: string) => {
            const response = await api.patch(`/cancelamento/${cancelamentoId}/status`, {
                status: 'Deferido'
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['gestao-cancelamentos'] });
            queryClient.invalidateQueries({ queryKey: ['gestao-consultas-pendentes'] });
            queryClient.invalidateQueries({ queryKey: ['cancelamentos'] });
            toast.success('Cancelamento aprovado com sucesso!');
        },
        onError: (error: unknown) => {
            const errorMessage = error && typeof error === 'object' && 'response' in error
                ? (error as { response?: { data?: { error?: string } } })?.response?.data?.error
                : undefined;
            toast.error(errorMessage || 'Erro ao aprovar cancelamento');
        }
    });

    // Mutação para reprovar cancelamento
    const reprovarCancelamento = useMutation({
        mutationFn: async (cancelamentoId: string) => {
            const response = await api.patch(`/cancelamento/${cancelamentoId}/status`, {
                status: 'Indeferido'
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['gestao-cancelamentos'] });
            queryClient.invalidateQueries({ queryKey: ['gestao-consultas-pendentes'] });
            queryClient.invalidateQueries({ queryKey: ['cancelamentos'] });
            toast.success('Cancelamento reprovado.');
        },
        onError: (error: unknown) => {
            const errorMessage = error && typeof error === 'object' && 'response' in error
                ? (error as { response?: { data?: { error?: string } } })?.response?.data?.error
                : undefined;
            toast.error(errorMessage || 'Erro ao reprovar cancelamento');
        }
    });

    return {
        cancelamentos: cancelamentosQuery.data || [],
        consultas: consultasQuery.data || [],
        isLoading: cancelamentosQuery.isLoading || consultasQuery.isLoading,
        isError: cancelamentosQuery.isError || consultasQuery.isError,
        refetch: () => {
            cancelamentosQuery.refetch();
            consultasQuery.refetch();
        },
        aprovarCancelamento: aprovarCancelamento.mutate,
        reprovarCancelamento: reprovarCancelamento.mutate,
        isAprovando: aprovarCancelamento.isPending,
        isReprovando: reprovarCancelamento.isPending,
    };
}
