import { create } from 'zustand';
import { ConfigAgenda } from '@/types/configAgendaTypes';
import { configAgendaService } from '@/services/configAgendaService';
import { HorarioSlot, AgendaStatusPayload } from '@/hooks/psicologos/configAgenda';

// Adicionar interface para erros da API
interface APIError {
    response?: {
        data?: {
            message?: string;
        };
    };
}

interface ConfigAgendaState {
    configAgenda: ConfigAgenda | null;
    configAgendas: ConfigAgenda[]; // lista de agendas
    isLoading: boolean;
    error: string | null;
    horariosPorDia: HorarioSlot[]; // novo estado para horários
    isLoadingHorarios: boolean; // loading específico
    errorHorarios: string | null; // erro específico
    obterAgenda: (id: string) => Promise<void>;
    listarAgendas: () => Promise<void>; // <-- Adicione esta linha
    configurarAgenda: (data: ConfigAgenda) => Promise<void>;
    atualizarAgenda: (data: Partial<ConfigAgenda>) => Promise<void>;
    deletarAgenda: (id: string) => Promise<void>; // alterado de 'data: any' para 'id: string'
    setConfigAgenda: (config: ConfigAgenda | null) => void;
    listarConfigAgendas: () => Promise<void>; // <-- Adicione esta linha
    listarHorariosPorDia: (data: { data: string }) => Promise<void>;
    updateAgendaStatusDisponivel: (payload: AgendaStatusPayload[]) => Promise<void>;
}

const useConfigAgendaStore = create<ConfigAgendaState>((set) => ({
    configAgenda: null,
    configAgendas: [],
    horariosPorDia: [],

    isLoading: false,
    error: null,
    isLoadingHorarios: false,
    errorHorarios: null,

    setConfigAgenda: (config) => set({ configAgenda: config }),

    obterAgenda: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
            const { data } = await configAgendaService().obterAgenda(id);
            set({ configAgenda: data, isLoading: false });
        } catch (error: unknown) {
            const apiError = error as APIError;
            set({ error: apiError?.response?.data?.message || 'Erro ao obter agenda.', isLoading: false });
        }
    },

    listarAgendas: async () => {
        set({ isLoading: true, error: null });
        try {
            const { data } = await configAgendaService().listarAgendas();

            console.debug("Agendas listadas:", data);
            set({ configAgendas: data, isLoading: false });
        } catch (error: unknown) {
            const apiError = error as APIError;
            set({ error: apiError?.response?.data?.message || 'Erro ao listar agendas.', isLoading: false });
        }
    },

    configurarAgenda: async (data: ConfigAgenda) => {
        set({ isLoading: true, error: null });
        try {
            const response = await configAgendaService().configurarAgenda(data);
            set({ configAgenda: response.data, isLoading: false });
        } catch (error: unknown) {
            const apiError = error as APIError;
            set({ error: apiError?.response?.data?.message || 'Erro ao configurar agenda.', isLoading: false });
        }
    },

    atualizarAgenda: async (data: Partial<ConfigAgenda>) => {
        set({ isLoading: true, error: null });
        try {
            if (!data.Id) throw new Error('Id da agenda é obrigatório para atualização.');
            const response = await configAgendaService().atualizarAgenda(data.Id, data as ConfigAgenda);
            set({ configAgenda: response.data, isLoading: false });
        } catch (error: unknown) {
            const apiError = error as APIError;
            set({ error: apiError?.response?.data?.message || 'Erro ao atualizar agenda.', isLoading: false });
        }
    },

    deletarAgenda: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
            await configAgendaService().deletarAgenda(id);
            set({ configAgenda: null, isLoading: false });
        } catch (error: unknown) {
            const apiError = error as APIError;
            set({ error: apiError?.response?.data?.message || 'Erro ao deletar agenda.', isLoading: false });
        }
    },

    listarConfigAgendas: async () => {
        set({ isLoading: true, error: null });
        try {
            const { data } = await configAgendaService().listarConfigAgenda();
            console.debug("Configurações de agenda listadas:", data);
            set({ configAgendas: data, isLoading: false });
        } catch (error: unknown) {
            const apiError = error as APIError;
            set({ error: apiError?.response?.data?.message || 'Erro ao listar configurações de agenda.', isLoading: false });
        }
    },

    listarHorariosPorDia: async (payload: { data: string }) => {
        set({ isLoadingHorarios: true, errorHorarios: null });
        try {
            const formattedDate = payload.data.replace(/\//g, '-');
            const { data } = await configAgendaService().listarHorariosPorDia({
                data: formattedDate
            });
            set({ horariosPorDia: data, isLoadingHorarios: false });
        } catch (error: unknown) {
            const apiError = error as APIError;
            set({ errorHorarios: apiError?.response?.data?.message || 'Erro ao listar horários.', isLoadingHorarios: false });
        }
    },

    updateAgendaStatusDisponivel: async (payload: AgendaStatusPayload[]) => {
        set({ isLoading: true, error: null });
        try {
            await configAgendaService().updateAgendaStatusDisponivel(payload);
            set({ isLoading: false });
        } catch (error: unknown) {
            const apiError = error as APIError;
            set({ error: apiError?.response?.data?.message || 'Erro ao atualizar status.', isLoading: false });
        }
    },
}));

export default useConfigAgendaStore;
