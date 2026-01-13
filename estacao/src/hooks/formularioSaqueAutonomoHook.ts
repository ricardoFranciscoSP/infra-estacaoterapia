import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    useFormularioSaqueAutonomoStore,
    fetchFormulario,
    fetchStatus,
    createFormulario,
    updateFormulario
} from '@/store/formularioSaqueAutonomoStore';
import {
    FormularioSaqueAutonomo,
    CreateFormularioSaqueAutonomoData,
    UpdateFormularioSaqueAutonomoData
} from '@/types/formularioSaqueAutonomoTypes';

// Hook para buscar formulário
export function useFormularioSaqueAutonomo() {
    const store = useFormularioSaqueAutonomoStore();

    const query = useQuery<FormularioSaqueAutonomo | null>({
        queryKey: ['formulario-saque-autonomo'],
        queryFn: async () => {
            const formulario = await fetchFormulario();
            return formulario;
        },
        staleTime: 5 * 60 * 1000, // 5 minutos
        refetchOnWindowFocus: false,
        initialData: store.Formulario ?? undefined,
    });

    return {
        formulario: query.data ?? null,
        isLoading: query.isLoading || store.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch,
    };
}

// Hook para buscar status
export function useFormularioSaqueAutonomoStatus() {
    const store = useFormularioSaqueAutonomoStore();

    const query = useQuery<boolean | null>({
        queryKey: ['formulario-saque-autonomo-status'],
        queryFn: async () => {
            const status = await fetchStatus();
            return status;
        },
        staleTime: 5 * 60 * 1000, // 5 minutos
        refetchOnWindowFocus: false,
        initialData: store.Status ?? undefined,
    });

    return {
        status: query.data ?? null,
        isLoading: query.isLoading || store.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch,
    };
}

// Hook para criar formulário
export function useCreateFormularioSaqueAutonomo() {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (data: CreateFormularioSaqueAutonomoData) => createFormulario(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['formulario-saque-autonomo'] });
            queryClient.invalidateQueries({ queryKey: ['formulario-saque-autonomo-status'] });
        },
    });

    return {
        createFormulario: mutation.mutate,
        createFormularioAsync: mutation.mutateAsync,
        isLoading: mutation.isPending,
        isError: mutation.isError,
        error: mutation.error,
        isSuccess: mutation.isSuccess,
    };
}

// Hook para atualizar formulário
export function useUpdateFormularioSaqueAutonomo() {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (data: UpdateFormularioSaqueAutonomoData) => updateFormulario(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['formulario-saque-autonomo'] });
            queryClient.invalidateQueries({ queryKey: ['formulario-saque-autonomo-status'] });
        },
    });

    return {
        updateFormulario: mutation.mutate,
        updateFormularioAsync: mutation.mutateAsync,
        isLoading: mutation.isPending,
        isError: mutation.isError,
        error: mutation.error,
        isSuccess: mutation.isSuccess,
    };
}
