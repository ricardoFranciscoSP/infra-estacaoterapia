import { useQuery, useMutation } from '@tanstack/react-query';
import useConfigAgendaStore from '@/store/psicologos/configAgendaStore';
import { ConfigAgenda } from '@/types/configAgendaTypes';

// Tipo para horário individual
export type HorarioSlot = {
    Id: string;
    Horario: string;
    Status: string;
};

// Tipo para payload de atualização de status
export type AgendaStatusPayload = {
    HorarioId: string;
    Horario: string;
    Status: string;
    Data: string;
    Recorrente: boolean;
};

// Hook para buscar todas as agendas
export function useConfigAgenda() {
    const listarAgendas = useConfigAgendaStore(state => state.listarAgendas);

    const query = useQuery<ConfigAgenda[]>({
        queryKey: ['configAgendas'],
        queryFn: async () => {
            await listarAgendas(); // Atualiza o store
            return useConfigAgendaStore.getState().configAgendas;
        },
        retry: 1,
        staleTime: 5 * 60 * 1000,
        enabled: true,
    });

    return {
        configAgendas: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}
// Hook para buscar uma agenda específica por id
export function useObterAgenda(id: string) {
    const obterAgenda = useConfigAgendaStore(state => state.obterAgenda);
    const configAgenda = useConfigAgendaStore(state => state.configAgenda);

    const query = useQuery<ConfigAgenda>({
        queryKey: ['configAgenda', id],
        queryFn: async () => {
            await obterAgenda(id);
            // Garante que nunca retorna null para o React Query
            return configAgenda ?? {} as ConfigAgenda;
        },
        enabled: !!id,
        retry: 1,
        staleTime: 5 * 60 * 1000,
    });

    return {
        configAgenda: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}

// Hook para criar uma agenda
export function useConfigurarAgenda() {
    const configurarAgenda = useConfigAgendaStore(state => state.configurarAgenda);

    const mutation = useMutation({
        mutationFn: async (data: ConfigAgenda) => {
            await configurarAgenda(data);
        },
    });

    return {
        configurarAgenda: mutation.mutateAsync,
        isPending: mutation.isPending,
        isError: mutation.isError,
        isSuccess: mutation.isSuccess,
        error: mutation.error,
    };
}

// Hook para atualizar uma agenda
export function useAtualizarAgenda() {
    const atualizarAgenda = useConfigAgendaStore(state => state.atualizarAgenda);

    const mutation = useMutation({
        mutationFn: async (data: Partial<ConfigAgenda>) => {
            await atualizarAgenda(data);
        },
    });

    return {
        atualizarAgenda: mutation.mutateAsync,
        isPending: mutation.isPending,
        isError: mutation.isError,
        isSuccess: mutation.isSuccess,
        error: mutation.error,
    };
}

// Hook para deletar uma agenda
export function useDeletarAgenda() {
    const deletarAgenda = useConfigAgendaStore(state => state.deletarAgenda);

    const mutation = useMutation({
        mutationFn: async (id: string) => {
            await deletarAgenda(id);
        },
    });

    return {
        deletarAgenda: mutation.mutateAsync,
        isPending: mutation.isPending,
        isError: mutation.isError,
        isSuccess: mutation.isSuccess,
        error: mutation.error,
    };
}

// Novo hook para listar todas as agendas usando o método listarConfigAgenda do store e React Query
export function useListarConfigAgenda() {
    const listarConfigAgendas = useConfigAgendaStore(state => state.listarConfigAgendas);

    const query = useQuery<ConfigAgenda[]>({
        queryKey: ['listarConfigAgenda'],
        queryFn: async () => {
            await listarConfigAgendas(); // Atualiza o store
            return useConfigAgendaStore.getState().configAgendas; // Retorna o array atualizado
        },
        retry: 1,
        staleTime: 5 * 60 * 1000,
        enabled: true,
    });

    return {
        configAgendas: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}

// Hook para listar horários por dia
export function useListarHorariosPorDia(data: { data: string }) {
    const listarHorariosPorDia = useConfigAgendaStore(state => state.listarHorariosPorDia);
    const isLoadingHorarios = useConfigAgendaStore(state => state.isLoadingHorarios);
    const errorHorarios = useConfigAgendaStore(state => state.errorHorarios);

    const query = useQuery<HorarioSlot[]>({
        queryKey: ['horariosPorDia', data],
        queryFn: async () => {
            const formattedData = {
                data: data.data.replace(/\//g, '-')
            };
            await listarHorariosPorDia(formattedData);
            return useConfigAgendaStore.getState().horariosPorDia;
        },
        enabled: !!data.data,
        retry: 1,
        staleTime: 5 * 60 * 1000,
    });

    return {
        horariosPorDia: query.data,
        isLoading: isLoadingHorarios || query.isLoading,
        isError: query.isError || !!errorHorarios,
        error: errorHorarios,
        refetch: query.refetch,
    };
}

// Hook para atualizar o status de disponibilidade da agenda
export function useUpdateAgendaStatusDisponivel() {
    const updateAgendaStatusDisponivel = useConfigAgendaStore(state => state.updateAgendaStatusDisponivel);

    const mutation = useMutation({
        mutationFn: async (payload: AgendaStatusPayload[]) => {
            await updateAgendaStatusDisponivel(payload);
        },
    });

    return {
        updateAgendaStatusDisponivel: mutation.mutateAsync,
        isPending: mutation.isPending,
        isError: mutation.isError,
        isSuccess: mutation.isSuccess,
        error: mutation.error,
    };
}
