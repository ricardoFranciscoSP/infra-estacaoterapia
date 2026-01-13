import { create } from 'zustand';
import { PacienteStoreState, PacienteStoreActions, Paciente, PacienteUpdate } from '@/types/pacienteTypes';
import { admPacienteService } from '@/services/admPacienteService';

export const useAdmPacienteStore = create<PacienteStoreState & PacienteStoreActions>((set) => ({
    pacientes: null,
    pacienteSelecionado: null,
    setPacientes: (pacientes) => set({ pacientes }),
    setPacienteSelecionado: (paciente) => set({ pacienteSelecionado: paciente }),
}));

// Função para buscar pacientes
export const getPacientes = async () => {
    try {
        const response = await admPacienteService().getPacientes();
        useAdmPacienteStore.getState().setPacientes(response.data);
    } catch (error) {
        console.error('Erro ao buscar pacientes:', error);
    }
};

// Função para buscar paciente por ID
export const getPacienteById = async (id: string) => {
    try {
        const response = await admPacienteService().getPacienteById(id);
        useAdmPacienteStore.getState().setPacienteSelecionado(response.data);
    } catch (error) {
        console.error('Erro ao buscar paciente por ID:', error);
    }
};

// Função para atualizar paciente
export const updatePaciente = async (id: string, update: PacienteUpdate) => {
    try {
        const response = await admPacienteService().updatePaciente(id, update);
        // Atualiza o pacienteSelecionado se for o mesmo id
        if (useAdmPacienteStore.getState().pacienteSelecionado?.Id === id) {
            useAdmPacienteStore.getState().setPacienteSelecionado(response.data);
        }
        // Atualiza a lista de pacientes se necessário
        const pacientes = useAdmPacienteStore.getState().pacientes;
        if (pacientes) {
            const novos = pacientes.map((p: Paciente) => p.Id === id ? response.data : p);
            useAdmPacienteStore.getState().setPacientes(novos);
        }
        return response.data;
    } catch (error) {
        console.error('Erro ao atualizar paciente:', error);
        throw error;
    }
};

// Função para deletar paciente
export const deletePaciente = async (id: string) => {
    try {
        await admPacienteService().deletePaciente(id);
        // Remove da lista de pacientes
        const pacientes = useAdmPacienteStore.getState().pacientes;
        if (pacientes) {
            const novos = pacientes.filter((p: Paciente) => p.Id !== id);
            useAdmPacienteStore.getState().setPacientes(novos);
        }
        // Limpa o selecionado se for o mesmo id
        if (useAdmPacienteStore.getState().pacienteSelecionado?.Id === id) {
            useAdmPacienteStore.getState().setPacienteSelecionado(null);
        }
        return true;
    } catch (error) {
        console.error('Erro ao deletar paciente:', error);
        throw error;
    }
};