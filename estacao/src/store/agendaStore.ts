

import { create } from 'zustand';
import { AgendaAgendamento } from '../types/agendamentoTypes';

export interface AgendaStore {
    todasAgendas: AgendaAgendamento[];
    agendasPorPsicologo: AgendaAgendamento[];
    agendasPorDataPsicologo: AgendaAgendamento[];
    agendasPorData: AgendaAgendamento[];
    agendasPorPeriodo: AgendaAgendamento[];
    agendasPorDataHorario: AgendaAgendamento[];
    setTodasAgendas: (agendas: AgendaAgendamento[]) => void;
    setAgendasPorPsicologo: (agendas: AgendaAgendamento[]) => void;
    setAgendasPorDataPsicologo: (agendas: AgendaAgendamento[]) => void;
    setAgendasPorData: (agendas: AgendaAgendamento[]) => void;
    setAgendasPorPeriodo: (agendas: AgendaAgendamento[]) => void;
    setAgendasPorDataHorario: (agendas: AgendaAgendamento[]) => void;
    clearAgendas: () => void;
    fetchTodasAgendas: () => Promise<AgendaAgendamento[]>;
    fetchAgendasPorPsicologo: (psicologoId: string) => Promise<AgendaAgendamento[]>;
    fetchAgendasPorDataPsicologo: (psicologoId: string, data: string) => Promise<AgendaAgendamento[]>;
    fetchAgendasPorData: (data: string) => Promise<AgendaAgendamento[]>;
    fetchAgendasPorPeriodo: (psicologoId: string, data: string, periodo: string) => Promise<AgendaAgendamento[]>;
}

export const useAgendaStore = create<AgendaStore>((set) => ({
    todasAgendas: [],
    agendasPorPsicologo: [],
    agendasPorDataPsicologo: [],
    agendasPorData: [],
    agendasPorPeriodo: [],
    agendasPorDataHorario: [],
    setTodasAgendas: (agendas: AgendaAgendamento[]) => set({ todasAgendas: Array.isArray(agendas) ? agendas : [] }),
    setAgendasPorPsicologo: (agendas: AgendaAgendamento[]) => set({ agendasPorPsicologo: Array.isArray(agendas) ? agendas : [] }),
    setAgendasPorDataPsicologo: (agendas: AgendaAgendamento[]) => set({ agendasPorDataPsicologo: Array.isArray(agendas) ? agendas : [] }),
    setAgendasPorData: (agendas: AgendaAgendamento[]) => set({ agendasPorData: Array.isArray(agendas) ? agendas : [] }),
    setAgendasPorPeriodo: (agendas: AgendaAgendamento[]) => set({ agendasPorPeriodo: Array.isArray(agendas) ? agendas : [] }),
    setAgendasPorDataHorario: (agendas: AgendaAgendamento[]) => set({ agendasPorDataHorario: Array.isArray(agendas) ? agendas : [] }),
    clearAgendas: () => set({
        todasAgendas: [],
        agendasPorPsicologo: [],
        agendasPorDataPsicologo: [],
        agendasPorData: [],
        agendasPorPeriodo: [],
        agendasPorDataHorario: [],
    }),
    fetchTodasAgendas: async () => [],
    fetchAgendasPorPsicologo: async () => [],
    fetchAgendasPorDataPsicologo: async () => [],
    fetchAgendasPorData: async () => [],
    fetchAgendasPorPeriodo: async () => [], // Implementação real pode ser feita se necessário
    // ...existing code...
}));
