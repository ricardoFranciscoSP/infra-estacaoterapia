import { create } from 'zustand';
import { admConsultasService } from '@/services/admConsultas';

// Tipos para o store de consultas administrativas
export interface ConsultasRealizadas {
    Id: string;
    Date: string;
    Time: string;
    Status: string;
    GoogleEventId?: string | null;
    PacienteId: string;
    PsicologoId: string;
    AgendaId: string;
    CreatedAt: string;
    UpdatedAt: string;
    Psicologo?: {
        Id: string;
        Nome: string;
        Email?: string;
        Images?: { url: string }[];
    };
    Paciente?: {
        Id: string;
        Nome: string;
        Email?: string;
    };
    Agenda?: {
        Data: string;
        Horario: string;
        DiaDaSemana: string;
        Status: string;
    };
    ReservaSessao?: {
        VideoCallLink?: string | null;
        Status: string;
    };
}

export interface ConsultasStoreState {
    consultasRealizadas: ConsultasRealizadas[] | null;
    consultaSelecionada: ConsultasRealizadas | null;
}

export interface ConsultasStoreActions {
    setConsultasRealizadas: (consultas: ConsultasRealizadas[]) => void;
    setConsultaSelecionada: (consulta: ConsultasRealizadas | null) => void;
}

export const useAdmConsultasStore = create<ConsultasStoreState & ConsultasStoreActions>((set) => ({
    consultasRealizadas: null,
    consultaSelecionada: null,
    setConsultasRealizadas: (consultas) => set({ consultasRealizadas: consultas }),
    setConsultaSelecionada: (consulta) => set({ consultaSelecionada: consulta }),
}));

// Função para buscar consultas realizadas
export const getConsultasRealizadas = async () => {
    try {
        const response = await admConsultasService().getConsultasRealizadas();
        useAdmConsultasStore.getState().setConsultasRealizadas(response.data);
        return response.data;
    } catch (error) {
        console.error('Erro ao buscar consultas realizadas:', error);
        throw error;
    }
};

// Função para buscar consulta por ID
export const getConsultaById = async (id: string) => {
    try {
        const consultas = useAdmConsultasStore.getState().consultasRealizadas;
        if (consultas) {
            const consulta = consultas.find((c: ConsultasRealizadas) => c.Id === id);
            if (consulta) {
                useAdmConsultasStore.getState().setConsultaSelecionada(consulta);
                return consulta;
            }
        }
        // Se não encontrou na lista, busca diretamente
        const response = await admConsultasService().getConsultasRealizadas();
        const consulta = response.data.find((c: ConsultasRealizadas) => c.Id === id);
        if (consulta) {
            useAdmConsultasStore.getState().setConsultaSelecionada(consulta);
            return consulta;
        }
        return null;
    } catch (error) {
        console.error('Erro ao buscar consulta por ID:', error);
        throw error;
    }
};

// Função para atualizar consulta (se necessário no futuro)
export const updateConsulta = async (id: string, update: Partial<ConsultasRealizadas>) => {
    try {
        // Implementar quando houver endpoint de atualização
        // const response = await admConsultasService().updateConsulta(id, update);

        // Atualiza o consultaSelecionada se for o mesmo id
        if (useAdmConsultasStore.getState().consultaSelecionada?.Id === id) {
            const consultaAtualizada = {
                ...useAdmConsultasStore.getState().consultaSelecionada,
                ...update
            } as ConsultasRealizadas;
            useAdmConsultasStore.getState().setConsultaSelecionada(consultaAtualizada);
        }

        // Atualiza a lista de consultas se necessário
        const consultas = useAdmConsultasStore.getState().consultasRealizadas;
        if (consultas) {
            const novas = consultas.map((c: ConsultasRealizadas) =>
                c.Id === id ? { ...c, ...update } : c
            );
            useAdmConsultasStore.getState().setConsultasRealizadas(novas);
        }

        return true;
    } catch (error) {
        console.error('Erro ao atualizar consulta:', error);
        throw error;
    }
};

// Função para deletar consulta (se necessário no futuro)
export const deleteConsulta = async (id: string) => {
    try {
        // Implementar quando houver endpoint de deleção
        // await admConsultasService().deleteConsulta(id);

        // Remove da lista de consultas
        const consultas = useAdmConsultasStore.getState().consultasRealizadas;
        if (consultas) {
            const novas = consultas.filter((c: ConsultasRealizadas) => c.Id !== id);
            useAdmConsultasStore.getState().setConsultasRealizadas(novas);
        }

        // Limpa o selecionado se for o mesmo id
        if (useAdmConsultasStore.getState().consultaSelecionada?.Id === id) {
            useAdmConsultasStore.getState().setConsultaSelecionada(null);
        }

        return true;
    } catch (error) {
        console.error('Erro ao deletar consulta:', error);
        throw error;
    }
};
