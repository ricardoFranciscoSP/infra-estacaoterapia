// Agendas por data e horário
export const fetchAgendasPorDataHorario = async (data: string, horario: string) => {
    try {
        const response = await agendamentoService().listarAgendasPorDataHorario(data, horario);
        useAgendaStore.getState().setAgendasPorDataHorario(response.data);
        return response.data;
    } catch (error) {
        throw error;
    }
};
import { useAgendaStore } from '@/store/agendaStore';
import { agendamentoService } from '@/services/agendamentoService';

// Todas as agendas
export const useFetchTodasAgendas = async () => {
    try {
        const response = await agendamentoService().listarTodasAgendas();
        useAgendaStore.getState().setTodasAgendas(response.data);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Agendas por psicólogo
export const useFetchAgendasPorPsicologo = async (psicologoId: string) => {
    console.debug('Fetching agendas for psicólogo:', psicologoId);
    try {
        const response = await agendamentoService().listarAgendasPorPsicologo(psicologoId);
        useAgendaStore.getState().setAgendasPorPsicologo(response.data);
        console.debug('Agendas por psicólogo:', response.data);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Agendas por data do psicólogo
export const useFetchAgendasPorDataPsicologo = async (psicologoId: string, data: string) => {
    try {
        const response = await agendamentoService().listarAgendasPorDataPsicologo(psicologoId, data);
        useAgendaStore.getState().setAgendasPorDataPsicologo(response.data);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Agendas por data
export const useFetchAgendasPorData = async (data: string) => {
    try {
        const response = await agendamentoService().listarAgendasPorData(data);
        useAgendaStore.getState().setAgendasPorData(response.data);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Agendas por período
export const fetchAgendasPorPeriodo = async (data: string, periodo: string) => {
    try {
        const response = await agendamentoService().listarAgendasPorPeriodo(data, periodo);
        useAgendaStore.getState().setAgendasPorPeriodo(response.data);
        return response.data;
    } catch (error) {
        throw error;
    }
};
