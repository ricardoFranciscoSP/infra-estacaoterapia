import { useUserPsicologoStore } from '@/store/psicologos/userPsicologoStore';
import { useQuery, useMutation } from '@tanstack/react-query';
import { userPsicologoService, updatePsicologo } from '@/services/userPsicologoService';
import React from 'react';

// Hook para buscar dados do psicólogo do usuário
export function useUserPsicologo() {
    const { setPsicologo } = useUserPsicologoStore();

    const query = useQuery({
        queryKey: ['userPsicologo'],
        queryFn: async () => {
            const { data } = await userPsicologoService().getMeusPsicologos();
            return data;
        },
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
        refetchOnWindowFocus: false,
    });

    // Corrigido: sincroniza Zustand após sucesso
    React.useEffect(() => {
        if (query.data) {
            setPsicologo(query.data);
        }
    }, [query.data, setPsicologo]);

    return {
        psicologo: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}

// Hook para atualizar dados do psicólogo
export function useUpdateUserPsicologo() {
    const { setPsicologo } = useUserPsicologoStore();

    const mutation = useMutation({
        mutationFn: async (data: Partial<updatePsicologo>) => {
            const { data: updated } = await userPsicologoService().updatePsicologo(data);
            return updated;
        },
        onSuccess: (updated) => {
            setPsicologo(updated);
        }
    });

    return {
        mutate: mutation.mutate,
        isPending: mutation.isPending,
        isError: mutation.isError,
        reset: mutation.reset,
    };
}

// Hook para upload de imagem do psicólogo (upload inicial)
export function useUploadUserPsicologoImagem() {
    const { setPsicologo } = useUserPsicologoStore();

    const mutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            const { data: updated } = await userPsicologoService().uploadImagem(formData);
            return updated;
        },
        onSuccess: (updated) => {
            setPsicologo(updated);
        }
    });

    return {
        mutate: mutation.mutate,
        isPending: mutation.isPending,
        isError: mutation.isError,
        reset: mutation.reset,
    };
}

// Hook para atualizar imagem do psicólogo (atualização de imagem existente)
export function useUpdateUserPsicologoImagem() {
    const { setPsicologo } = useUserPsicologoStore();

    const mutation = useMutation({
        mutationFn: async ({ imageId, file }: { imageId: string; file: File }) => {
            const formData = new FormData();
            formData.append('file', file);
            const { data: updated } = await userPsicologoService().updateImagem(imageId, formData);
            return updated;
        },
        onSuccess: (updated) => {
            setPsicologo(updated);
        }
    });

    return {
        mutate: mutation.mutate,
        isPending: mutation.isPending,
        isError: mutation.isError,
        reset: mutation.reset,
    };
}

// Hook para deletar psicólogo
export function useDeletePsicologo() {
    const { setPsicologo } = useUserPsicologoStore();

    const mutation = useMutation({
        mutationFn: async (formacaoId: string) => {
            await userPsicologoService().deleteFormacao(formacaoId);
        },
        onSuccess: () => {
            setPsicologo(null);
        }
    });

    return {
        mutate: mutation.mutate,
        isPending: mutation.isPending,
        isError: mutation.isError,
        reset: mutation.reset,
    };
}

// Hook para atualizar dados bancários
export function useUpdateDadosBancarios() {
    const { setPsicologo } = useUserPsicologoStore();
    const { refetch } = useUserPsicologo();

    const mutation = useMutation({
        mutationFn: async (chavePix: string) => {
            const { data } = await userPsicologoService().updateDadosBancarios(chavePix);
            return data;
        },
        onSuccess: (updated) => {
            // O backend retorna { success: true, user: UserPsicologo[] }
            if (updated?.user) {
                setPsicologo(updated.user);
            }
            refetch();
        }
    });

    return {
        mutate: mutation.mutate,
        isPending: mutation.isPending,
        isError: mutation.isError,
        reset: mutation.reset,
    };
}

// Hook para atualizar dados pessoais
export function useUpdateDadosPessoais() {
    const { setPsicologo } = useUserPsicologoStore();
    const { refetch } = useUserPsicologo();

    const mutation = useMutation({
        mutationFn: async (data: {
            Nome?: string;
            Email?: string;
            Telefone?: string;
            WhatsApp?: string;
            Sexo?: string;
            Pronome?: string;
            RacaCor?: string;
            Rg?: string;
            DataNascimento?: string;
        }) => {
            const { data: updated } = await userPsicologoService().updateDadosPessoais(data);
            return updated;
        },
        onSuccess: (updated) => {
            if (updated?.user) {
                setPsicologo(updated.user);
            }
            refetch();
        }
    });

    return {
        mutate: mutation.mutate,
        isPending: mutation.isPending,
        isError: mutation.isError,
        reset: mutation.reset,
    };
}

// Hook para atualizar sobre mim
export function useUpdateSobreMim() {
    const { setPsicologo } = useUserPsicologoStore();
    const { refetch } = useUserPsicologo();

    const mutation = useMutation({
        mutationFn: async (sobreMim: string) => {
            const { data } = await userPsicologoService().updateSobreMim(sobreMim);
            return data;
        },
        onSuccess: (updated) => {
            if (updated?.user) {
                setPsicologo(updated.user);
            }
            refetch();
        }
    });

    return {
        mutate: mutation.mutate,
        isPending: mutation.isPending,
        isError: mutation.isError,
        reset: mutation.reset,
    };
}

// Hook para atualizar especialidades
export function useUpdateEspecialidades() {
    const { setPsicologo } = useUserPsicologoStore();
    const { refetch } = useUserPsicologo();

    const mutation = useMutation({
        mutationFn: async (data: {
            ExperienciaClinica?: string | null;
            TipoAtendimento?: string[];
            Abordagens?: string[];
            Queixas?: string[];
            Idiomas?: string[];
        }) => {
            const { data: updated } = await userPsicologoService().updateEspecialidades(data);
            return updated;
        },
        onSuccess: (updated) => {
            if (updated?.user) {
                setPsicologo(updated.user);
            }
            refetch();
        }
    });

    return {
        mutate: mutation.mutate,
        isPending: mutation.isPending,
        isError: mutation.isError,
        reset: mutation.reset,
    };
}

// Hook para atualizar endereço
export function useUpdateEndereco() {
    const { setPsicologo } = useUserPsicologoStore();
    const { refetch } = useUserPsicologo();

    const mutation = useMutation({
        mutationFn: async (data: {
            Rua?: string;
            Numero?: string;
            Bairro?: string;
            Cidade?: string;
            Estado?: string;
            Cep?: string;
            Complemento?: string;
            isBillingAddress?: boolean;
        }) => {
            const { isBillingAddress, ...addressData } = data;
            const { data: updated } = await userPsicologoService().updateEndereco(addressData, isBillingAddress);
            return updated;
        },
        onSuccess: (updated) => {
            if (updated?.user) {
                setPsicologo(updated.user);
            }
            refetch();
        }
    });

    return {
        mutate: mutation.mutate,
        isPending: mutation.isPending,
        isError: mutation.isError,
        reset: mutation.reset,
    };
}

// Hook para atualizar pessoa jurídica
export function useUpdatePessoalJuridica() {
    const { setPsicologo } = useUserPsicologoStore();
    const { refetch } = useUserPsicologo();

    const mutation = useMutation({
        mutationFn: async (data: {
            CNPJ?: string;
            RazaoSocial?: string;
            NomeFantasia?: string;
            InscricaoEstadual?: string;
            SimplesNacional?: boolean;
        }) => {
            const { data: updated } = await userPsicologoService().updatePessoalJuridica(data);
            return updated;
        },
        onSuccess: (updated) => {
            if (updated?.user) {
                setPsicologo(updated.user);
            }
            refetch();
        }
    });

    return {
        mutate: mutation.mutate,
        isPending: mutation.isPending,
        isError: mutation.isError,
        reset: mutation.reset,
    };
}

// Hook para atualizar formações
export function useUpdateFormacoes() {
    const { setPsicologo } = useUserPsicologoStore();
    const { refetch } = useUserPsicologo();

    const mutation = useMutation({
        mutationFn: async (formacoes: Array<{
            Id?: string;
            TipoFormacao?: string;
            Instituicao?: string;
            Curso?: string;
            DataInicio?: string;
            DataConclusao?: string;
            Status?: string;
        }>) => {
            const { data: updated } = await userPsicologoService().updateFormacoes(formacoes);
            return updated;
        },
        onSuccess: (updated) => {
            if (updated?.user) {
                setPsicologo(updated.user);
            }
            refetch();
        }
    });

    return {
        mutate: mutation.mutate,
        isPending: mutation.isPending,
        isError: mutation.isError,
        reset: mutation.reset,
    };
}
