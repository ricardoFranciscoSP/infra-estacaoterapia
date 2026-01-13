import { create } from 'zustand';
import { formularioSaqueAutonomoService } from '@/services/formularioSaqueAutonomoService';
import {
    FormularioSaqueAutonomo,
    CreateFormularioSaqueAutonomoData,
    UpdateFormularioSaqueAutonomoData
} from '@/types/formularioSaqueAutonomoTypes';

// Estado e ações do store
export interface FormularioSaqueAutonomoStoreState {
    Formulario: FormularioSaqueAutonomo | null;
    Status: boolean | null;
    isLoading: boolean;
}

export interface FormularioSaqueAutonomoStoreActions {
    SetFormulario: (formulario: FormularioSaqueAutonomo | null) => void;
    SetStatus: (status: boolean | null) => void;
    SetIsLoading: (isLoading: boolean) => void;
}

// Store com estado e ações
export const useFormularioSaqueAutonomoStore = create<FormularioSaqueAutonomoStoreState & FormularioSaqueAutonomoStoreActions>((set) => ({
    Formulario: null,
    Status: null,
    isLoading: false,
    SetFormulario: (formulario: FormularioSaqueAutonomo | null) => set({ Formulario: formulario }),
    SetStatus: (status: boolean | null) => set({ Status: status }),
    SetIsLoading: (isLoading: boolean) => set({ isLoading }),
}));

// Funções para buscar, criar e atualizar formulário usando o service
export const fetchFormulario = async (): Promise<FormularioSaqueAutonomo | null> => {
    try {
        useFormularioSaqueAutonomoStore.getState().SetIsLoading(true);
        const response = await formularioSaqueAutonomoService.getMyFormulario();
        const formulario = response.data.formulario || null;
        if (formulario) {
            useFormularioSaqueAutonomoStore.getState().SetFormulario(formulario);
            useFormularioSaqueAutonomoStore.getState().SetStatus(formulario.Status);
        }
        return formulario;
    } catch (error) {
        console.error('Erro ao buscar formulário:', error);
        useFormularioSaqueAutonomoStore.getState().SetFormulario(null);
        return null;
    } finally {
        useFormularioSaqueAutonomoStore.getState().SetIsLoading(false);
    }
};

export const fetchStatus = async (): Promise<boolean | null> => {
    try {
        useFormularioSaqueAutonomoStore.getState().SetIsLoading(true);
        const response = await formularioSaqueAutonomoService.getStatus();
        // Se não houver formulário, retorna false (não preenchido)
        const status = response.data.status ?? false;
        useFormularioSaqueAutonomoStore.getState().SetStatus(status);
        return status;
    } catch (error: unknown) {
        // Se der 404, significa que o formulário não existe, então status é false
        if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as { response?: { status?: number } };
            if (axiosError.response?.status === 404) {
                useFormularioSaqueAutonomoStore.getState().SetStatus(false);
                return false;
            }
        }
        console.error('Erro ao buscar status:', error);
        return false; // Retorna false em caso de erro
    } finally {
        useFormularioSaqueAutonomoStore.getState().SetIsLoading(false);
    }
};

export const createFormulario = async (data: CreateFormularioSaqueAutonomoData): Promise<{ success: boolean; message: string }> => {
    try {
        useFormularioSaqueAutonomoStore.getState().SetIsLoading(true);
        const response = await formularioSaqueAutonomoService.createFormulario(data);
        if (response.data.success && response.data.formulario) {
            useFormularioSaqueAutonomoStore.getState().SetFormulario(response.data.formulario);
            useFormularioSaqueAutonomoStore.getState().SetStatus(response.data.formulario.Status);
        }
        return { success: response.data.success, message: response.data.message };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao criar formulário';
        console.error('Erro ao criar formulário:', error);
        return { success: false, message: errorMessage };
    } finally {
        useFormularioSaqueAutonomoStore.getState().SetIsLoading(false);
    }
};

export const updateFormulario = async (data: UpdateFormularioSaqueAutonomoData): Promise<{ success: boolean; message: string }> => {
    try {
        useFormularioSaqueAutonomoStore.getState().SetIsLoading(true);
        const response = await formularioSaqueAutonomoService.updateFormulario(data);
        if (response.data.success && response.data.formulario) {
            useFormularioSaqueAutonomoStore.getState().SetFormulario(response.data.formulario);
            useFormularioSaqueAutonomoStore.getState().SetStatus(response.data.formulario.Status);
        }
        return { success: response.data.success, message: response.data.message };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao atualizar formulário';
        console.error('Erro ao atualizar formulário:', error);
        return { success: false, message: errorMessage };
    } finally {
        useFormularioSaqueAutonomoStore.getState().SetIsLoading(false);
    }
};
