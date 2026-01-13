import { create } from 'zustand';
import { reservaSessaoService } from '@/services/reservaSessaoService';
import { agendamentoService } from '@/services/agendamentoService';
import { ReservaSessaoStore, ConfigAgendaStoreSetters } from '@/types/reservaSessaoTypes';

export const useReservaSessaoStore = create<ReservaSessaoStore & ConfigAgendaStoreSetters>((set) => ({
    reservaSessao: [],
    setReservaSessao: (reservaSessao) => {
        if (Array.isArray(reservaSessao)) {
            set({ reservaSessao });
        } else if (reservaSessao) {
            set({ reservaSessao: [reservaSessao] });
        } else {
            set({ reservaSessao: [] });
        }
    },
    reagendarReservaSessao: async (idAntiga: string, idNova: string) => {
        try {
            const response = await agendamentoService().reagendarAgendamento(idAntiga, idNova);
            // Atualiza o estado se necessário, por exemplo, buscar novamente a reserva
            // Opcional: await fetchReservaSessaoById(idNova);
            return response.data;
        } catch (error) {
            console.error('Erro ao reagendar reserva de sessão:', error);
            throw error;
        }
    },
}));

export const fetchReservaSessaoById = async (id: string) => {
    try {
        // Log apenas em caso de erro para reduzir poluição de logs
        const response = await reservaSessaoService().getById(id);
        
        // Assume que response.data.data é do tipo ReservaSessao
        const data = response.data?.data;
        
        if (data) {
            useReservaSessaoStore.getState().setReservaSessao(data);
            return data;
        }
        
        // Log apenas se não encontrar dados (não a cada 10 segundos)
        if (response.data?.success === false) {
            console.warn('⚠️ [fetchReservaSessaoById] ReservaSessao não encontrada para ID:', id);
        }
        return null; // Retorna null em vez de undefined
    } catch (error) {
        console.error('🔴 [fetchReservaSessaoById] Erro ao buscar reserva de sessão por ID:', error);
        return null; // Retorna null em vez de undefined em caso de erro
    }
};
