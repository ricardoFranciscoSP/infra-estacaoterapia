import { Paciente } from '@/types/pacienteTypes';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getPacientes, useAdmPacienteStore, getPacienteById, updatePaciente, deletePaciente } from '@/store/admin/admPacienteStore';

export function useAdmPaciente() {
    const query = useQuery<Paciente[]>({
        queryKey: ['pacientes'],
        queryFn: async () => {
            await getPacientes();
            return (useAdmPacienteStore.getState().pacientes ?? []) as Paciente[];
        },
        retry: 1,
        staleTime: 5 * 60 * 1000,
        enabled: true,
    });

    return {
        pacientes: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}

export function useAdmPacienteById(id: string | undefined) {
    const query = useQuery<Paciente | null>({
        queryKey: ['paciente', id],
        queryFn: async () => {
            if (!id) return null;
            await getPacienteById(id);
            const selected = useAdmPacienteStore.getState().pacienteSelecionado;
            return selected as Paciente | null;
        },
        enabled: !!id,
        retry: 1,
        staleTime: 5 * 60 * 1000,
    });

    return {
        paciente: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}

// Hook para update do paciente
export function useUpdateAdmPaciente() {
    return useMutation({
        mutationFn: async (data: { id: string, update: Partial<Paciente> }) => {
            return await updatePaciente(data.id, data.update);
        },
    });
}

// Hook para delete do paciente
export function useDeleteAdmPaciente() {
    return useMutation({
        mutationFn: async (id: string) => {
            return await deletePaciente(id);
        },
    });
}