import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { planoService, type PlanoAssinatura, type PlanoAssinaturaData } from '@/services/planoService';
import toast from 'react-hot-toast';

const service = planoService();

export function usePlanosAdmin() {
    return useQuery<PlanoAssinatura[]>({
        queryKey: ['planos-admin'],
        queryFn: async () => {
            const response = await service.getPlanos();
            return response.data;
        },
    });
}

export function usePlanoAdminById(id: string | undefined) {
    return useQuery<PlanoAssinatura>({
        queryKey: ['plano-admin', id],
        queryFn: async () => {
            if (!id) throw new Error('ID do plano é obrigatório');
            const response = await service.getPlanosId(id);
            return response.data;
        },
        enabled: !!id,
    });
}

export function useCreatePlanoAdmin() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: PlanoAssinaturaData[]) => {
            const response = await service.createPlano(data);
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['planos-admin'] });
            if (data.createdPlanos && data.createdPlanos.length > 0) {
                toast.success(`${data.createdPlanos.length} plano(s) criado(s) com sucesso!`);
            }
            if (data.failedPlanos && data.failedPlanos.length > 0) {
                toast.error(`Erro ao criar ${data.failedPlanos.length} plano(s): ${data.failedPlanos.join(', ')}`);
            }
        },
        onError: (error: Error) => {
            toast.error(`Erro ao criar plano: ${error.message}`);
        },
    });
}

export function useUpdatePlanoAdmin() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<PlanoAssinaturaData> }) => {
            const response = await service.updatePlano(id, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['planos-admin'] });
            toast.success('Plano atualizado com sucesso!');
        },
        onError: (error: Error) => {
            toast.error(`Erro ao atualizar plano: ${error.message}`);
        },
    });
}

export function useDeletePlanoAdmin() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const response = await service.deletePlano(id);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['planos-admin'] });
            toast.success('Plano deletado com sucesso!');
        },
        onError: (error: Error) => {
            toast.error(`Erro ao deletar plano: ${error.message}`);
        },
    });
}
