import { create } from 'zustand';
import { Reserva } from '@/types/consultasTypes';
import { agendamentoService } from '@/services/agendamentoService';

type AgendamentoStore = {
    reservas: Reserva[];
    setReservas: (reservas: Reserva[]) => void;
    criarAgendamento: (id: string) => Promise<void>;
    // Controla se há uma operação de agendamento em andamento
    isCreating: boolean;
    // Guarda os IDs que estão sendo processados para evitar duplicatas
    processingIds: Set<string>;
};

const useAgendamentoStore = create<AgendamentoStore>((set, get) => ({
    reservas: [],
    isCreating: false,
    processingIds: new Set<string>(),
    setReservas: (reservas: Reserva[]) => set({ reservas }),
    criarAgendamento: async (id: string) => {
        const state = get();
        
        // 🔒 PROTEÇÃO: Evita múltiplas chamadas simultâneas para o mesmo ID
        if (state.processingIds.has(id)) {
            console.warn('[AgendamentoStore] Tentativa de criar agendamento duplicado para ID:', id);
            throw new Error('Já existe um agendamento sendo processado para este horário. Aguarde um momento.');
        }
        
        // 🔒 PROTEÇÃO: Evita múltiplas chamadas simultâneas no geral
        if (state.isCreating) {
            console.warn('[AgendamentoStore] Tentativa de criar agendamento enquanto outro está em processamento');
            throw new Error('Já existe um agendamento sendo processado. Aguarde a conclusão.');
        }
        
        try {
            // Marca como em processamento
            set({ 
                isCreating: true,
                processingIds: new Set(state.processingIds).add(id)
            });
            
            console.log('[AgendamentoStore] Criando agendamento para ID:', id);
            
            const response = await agendamentoService().createAgendamento(id);
            const reserva = response.data as Reserva;
            
            set({ reservas: [...state.reservas, reserva] });
            
            console.log('[AgendamentoStore] Agendamento criado com sucesso:', reserva.Id);
            
            return;
        } catch (error) {
            console.error('[AgendamentoStore] Erro ao criar agendamento:', error);
            throw error;
        } finally {
            // Remove o ID do processamento e marca como não criando
            const currentState = get();
            const newProcessingIds = new Set(currentState.processingIds);
            newProcessingIds.delete(id);
            set({ 
                isCreating: false,
                processingIds: newProcessingIds
            });
        }
    },
}));

export default useAgendamentoStore; 
