import { create } from 'zustand';
import { userPsicologoService, updatePsicologo, PsicologoImagemFormData } from '@/services/userPsicologoService';

// Tipo para erro da API
type APIError = {
    response?: {
        data?: {
            message?: string;
        };
    };
};

export interface UserPsicologoState {
    psicologo: updatePsicologo | null;
    isLoading: boolean;
    error: string | null;
    fetchPsicologo: () => Promise<void>;
    updatePsicologo: (data: updatePsicologo) => Promise<void>;
    updateImagem: (imageId: string, formData: PsicologoImagemFormData) => Promise<void>;
    setPsicologo: (psicologo: updatePsicologo | null) => void;
    deleteFormacaoPsicologo: (formacaoId: string) => Promise<void>;
}

export const useUserPsicologoStore = create<UserPsicologoState>((set) => ({
    psicologo: null,
    isLoading: false,
    error: null,

    setPsicologo: (psicologo) => set({ psicologo }),

    fetchPsicologo: async () => {
        set({ isLoading: true, error: null });
        try {
            const { data } = await userPsicologoService().getMeusPsicologos();
            set({ psicologo: data, isLoading: false });
        } catch (error: unknown) {
            const apiError = error as APIError;
            set({ psicologo: null, isLoading: false, error: apiError?.response?.data?.message ?? 'Erro ao buscar psicólogo.' });
        }
    },

    updatePsicologo: async (data: updatePsicologo) => {
        set({ isLoading: true, error: null });
        try {
            const { data: updated } = await userPsicologoService().updatePsicologo(data);
            set({ psicologo: updated, isLoading: false });
        } catch (error: unknown) {
            const apiError = error as APIError;
            set({ isLoading: false, error: apiError?.response?.data?.message ?? 'Erro ao atualizar psicólogo.' });
        }
    },

    updateImagem: async (imageId: string, formData: PsicologoImagemFormData) => {
        set({ isLoading: true, error: null });
        try {
            const { data: updated } = await userPsicologoService().updateImagem(imageId, formData);
            set({ psicologo: updated, isLoading: false });
        } catch (error: unknown) {
            const apiError = error as APIError;
            set({ isLoading: false, error: apiError?.response?.data?.message ?? 'Erro ao atualizar imagem.' });
        }
    },

    deleteFormacaoPsicologo: async (formacaoId: string) => {
        set({ isLoading: true, error: null });
        try {
            await userPsicologoService().deleteFormacao(formacaoId);
            set({ psicologo: null, isLoading: false });
        } catch (error: unknown) {
            const apiError = error as APIError;
            set({ isLoading: false, error: apiError?.response?.data?.message ?? 'Erro ao deletar formação.' });
        }
    },


}));
