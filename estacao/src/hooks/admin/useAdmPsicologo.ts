import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Psicologo, PsicologoUpdate } from '@/types/psicologoTypes';
import { deletePsicologo, getPsicologos, getPsicologosId, updatePsicologo, useAdmPsicologoStore, previaContrato, gerarContrato } from '@/store/admin/admPsicologoStore';

export function useAdmPsicologo() {
    const query = useQuery<Psicologo[]>({
        queryKey: ['psicologos'],
        queryFn: async () => {
            await getPsicologos();
            return (useAdmPsicologoStore.getState().psicologos ?? []) as unknown as Psicologo[];
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

export function useAdmPsicologoById(id: string | undefined) {
    const query = useQuery<Psicologo | null>({
        queryKey: ['psicologo', id],
        queryFn: async () => {
            if (!id) return null;
            await getPsicologosId(id);
            const selected = useAdmPsicologoStore.getState().psicologoSelecionado;
            if (selected && !('Sexo' in selected)) {
                return null;
            }
            return selected as Psicologo | null;
        },
        enabled: !!id,
        retry: 1,
        staleTime: 5 * 60 * 1000,
    });

    return {
        psicologo: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}

// Hook para update do psicólogo
export function useUpdateAdmPsicologo() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: { id: string, update: PsicologoUpdate }) => {
            return await updatePsicologo(data.id, data.update);
        },
        onSuccess: (_, variables) => {
            // Invalida queries relacionadas para atualizar em tempo real
            queryClient.invalidateQueries({ queryKey: ['psicologo', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['psicologos'] });
        },
    });
}

// Hook para delete do psicólogo
export function useDeleteAdmPsicologo() {
    return useMutation({
        mutationFn: async (id: string) => {
            return await deletePsicologo(id);
        },
    });
}

// Hook para obter prévia do contrato do psicólogo
// enabled: controla se a query deve ser executada automaticamente (default: false - não carrega automaticamente)
export function usePreviaContrato(id: string | undefined, enabled: boolean = false) {
    return useQuery({
        queryKey: ['previaContrato', 'psicologo', id], // Adiciona 'psicologo' para diferenciar de paciente
        queryFn: async () => {
            if (!id) return null;
            console.log('[usePreviaContrato] Buscando prévia do contrato de PARCERIA para psicólogo ID:', id);
            const html = await previaContrato(id);

            // Validação no frontend também
            if (typeof html === 'string') {
                if (!html.includes('CONTRATO DE PARCERIA E INTERMEDIAÇÃO')) {
                    console.error('[usePreviaContrato] ❌ ERRO: HTML recebido não é do contrato de parceria!');
                    console.error('[usePreviaContrato] Primeiros 500 caracteres:', html.substring(0, 500));

                    if (html.includes('CONTRATO DE PRESTAÇÃO DE SERVIÇOS PSICOLÓGICOS VIA PLATAFORMA VIRTUAL')) {
                        console.error('[usePreviaContrato] ❌ ERRO: Template de PACIENTE detectado no frontend!');
                        throw new Error('Template incorreto: O sistema retornou o template de paciente. Por favor, recarregue a página ou contate o suporte.');
                    }
                } else {
                    console.log('[usePreviaContrato] ✅ HTML validado: Contém título de PARCERIA');
                }
            }

            return html;
        },
        enabled: !!id && enabled, // Só carrega se id existir E enabled for true
        retry: 1,
        staleTime: 0, // Sem cache - sempre busca novo para garantir que está correto
        gcTime: 0, // Remove do cache imediatamente após uso
    });
}

// Hook para emitir contrato do psicólogo
export function useGerarContrato() {
    return useMutation({
        mutationFn: async (id: string) => {
            return await gerarContrato(id);
        },
    });
}