import { create } from 'zustand';
import { gerarAgendaService } from '@/services/gerarAgendaService';
import { GerarAgendaResultado, GerarAgendaResponse } from '@/services/gerarAgendaService';

// Estado e ações do store
export interface GerarAgendaStoreState {
    isLoading: boolean;
    error: string | null;
    resultados: GerarAgendaResultado[] | null;
    ultimaGeracao: Date | null;
}

export interface GerarAgendaStoreActions {
    SetLoading: (loading: boolean) => void;
    SetError: (error: string | null) => void;
    SetResultados: (resultados: GerarAgendaResultado[] | null) => void;
    SetUltimaGeracao: (data: Date | null) => void;
}

// Store com estado e ações
export const useGerarAgendaStore = create<GerarAgendaStoreState & GerarAgendaStoreActions>((set) => ({
    isLoading: false,
    error: null,
    resultados: null,
    ultimaGeracao: null,
    SetLoading: (loading: boolean) => set({ isLoading: loading }),
    SetError: (error: string | null) => set({ error }),
    SetResultados: (resultados: GerarAgendaResultado[] | null) => set({ resultados }),
    SetUltimaGeracao: (data: Date | null) => set({ ultimaGeracao: data }),
}));

// Função para gerar agenda manualmente usando o service
export const gerarAgendaManual = async (): Promise<GerarAgendaResponse> => {
    const store = useGerarAgendaStore.getState();
    
    try {
        store.SetLoading(true);
        store.SetError(null);
        
        const response = await gerarAgendaService.gerarManual();
        const data = response.data;
        
        store.SetResultados(data.resultados);
        store.SetUltimaGeracao(new Date());
        
        return data;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao gerar agenda';
        console.error('Erro ao gerar agenda manualmente:', error);
        store.SetError(errorMessage);
        throw error;
    } finally {
        store.SetLoading(false);
    }
};

