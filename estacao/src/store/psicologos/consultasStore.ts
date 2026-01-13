import { create } from 'zustand';
import { admPsicologoService } from '@/services/admPsicologoService';
import { ConsultasPendentes, ConsultasRealizadas, ProximasConsultas, taxaOcupacao } from '@/types/psicologoTypes';

interface consultasState {
    consultasRealizadas: ConsultasRealizadas | null;
    consultasPendentes: ConsultasPendentes | null;
    proximasConsultas: ProximasConsultas[] | null;
    taxaOcupacao: taxaOcupacao | null;
    loading: boolean;
    error: string | null;
    fetchConsultasRealizadas: () => Promise<void>;
    fetchTaxaOcupacao: () => Promise<void>;
    fetchConsultasPendentes: () => Promise<void>;
    fetchProximasConsultas: () => Promise<void>;
    setConsultasRealizadas: (consultas: ConsultasRealizadas | null) => void;
    setTaxaOcupacao: (taxa: taxaOcupacao | null) => void;
    setConsultasPendentes: (consultas: ConsultasPendentes | null) => void;
    setProximasConsultas: (consultas: ProximasConsultas[] | null) => void;
}

const useConsultasPsicologoStore = create<consultasState>((set) => ({
    consultasRealizadas: null,
    consultasPendentes: null,
    proximasConsultas: null,
    taxaOcupacao: null,
    loading: false,
    error: null,

    setConsultasRealizadas: (consultas) => set({ consultasRealizadas: consultas }),
    setTaxaOcupacao: (taxa) => set({ taxaOcupacao: taxa }),
    setConsultasPendentes: (consultas) => set({ consultasPendentes: consultas }),
    setProximasConsultas: (consultas) => set({ proximasConsultas: consultas }),


    fetchConsultasRealizadas: async () => {
        set({ loading: true, error: null });
        try {
            const result = await admPsicologoService().consultasRealizadas();
            set({ consultasRealizadas: result.data, loading: false });
        } catch (error: unknown) {
            set({ error: (error as Error)?.message || 'Erro ao obter consultas.', loading: false });
        }
    },

    fetchTaxaOcupacao: async () => {
        set({ loading: true, error: null });
        try {
            const result = await admPsicologoService().taxaOcupacao();
            set({ taxaOcupacao: result.data, loading: false });
        } catch (error: unknown) {
            set({ error: (error as Error)?.message || 'Erro ao obter taxa de ocupação.', loading: false });
        }
    },

    fetchConsultasPendentes: async () => {
        set({ loading: true, error: null });
        try {
            const result = await admPsicologoService().consultasPendentes();
            set({ consultasPendentes: result.data, loading: false });
        } catch (error: unknown) {
            set({ error: (error as Error)?.message || 'Erro ao obter consultas pendentes.', loading: false });
        }
    },

    fetchProximasConsultas: async () => {
        set({ loading: true, error: null });
        try {
            const result = await admPsicologoService().proximasConsultas();
            // Garante que sempre é um array
            const consultas = Array.isArray(result.data) ? result.data : (result.data ? [result.data] : []);
            set({ proximasConsultas: consultas, loading: false });
        } catch (error: unknown) {
            set({ error: (error as Error)?.message || 'Erro ao obter próximas consultas.', loading: false });
        }
    },
}));

export default useConsultasPsicologoStore;
