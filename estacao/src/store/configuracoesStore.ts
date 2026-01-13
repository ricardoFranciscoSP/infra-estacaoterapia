import { create } from 'zustand';
import { configuracoesService, Configuracao } from '@/services/configuracoesService';

// Estado e ações do store
export interface ConfiguracoesStoreState {
    configuracoes: Configuracao[] | null;
    configuracaoAtual: Configuracao | null;
    isLoading: boolean;
    error: string | null;
}

export interface ConfiguracoesStoreActions {
    SetConfiguracoes: (configuracoes: Configuracao[] | null) => void;
    SetConfiguracaoAtual: (configuracao: Configuracao | null) => void;
    SetLoading: (loading: boolean) => void;
    SetError: (error: string | null) => void;
}

// Store com estado e ações
export const useConfiguracoesStore = create<ConfiguracoesStoreState & ConfiguracoesStoreActions>((set) => ({
    configuracoes: null,
    configuracaoAtual: null,
    isLoading: false,
    error: null,
    SetConfiguracoes: (configuracoes: Configuracao[] | null) => set({ configuracoes }),
    SetConfiguracaoAtual: (configuracao: Configuracao | null) => set({ configuracaoAtual: configuracao }),
    SetLoading: (loading: boolean) => set({ isLoading: loading }),
    SetError: (error: string | null) => set({ error }),
}));

// Funções para buscar e atualizar configurações usando o service
export const fetchConfiguracoes = async (): Promise<Configuracao[]> => {
    const store = useConfiguracoesStore.getState();
    
    // Se já está carregando, retorna os dados existentes para evitar múltiplas requisições
    if (store.isLoading) {
        return store.configuracoes || [];
    }
    
    try {
        store.SetLoading(true);
        store.SetError(null);
        const response = await configuracoesService.getAll();
        const configuracoes = response.data || [];
        
        // Só atualiza o store se os dados realmente mudaram
        const currentConfigs = store.configuracoes || [];
        const hasChanged = JSON.stringify(currentConfigs) !== JSON.stringify(configuracoes);
        
        if (hasChanged || currentConfigs.length === 0) {
            store.SetConfiguracoes(configuracoes);
            // Se houver configurações, define a primeira como atual
            if (configuracoes.length > 0) {
                store.SetConfiguracaoAtual(configuracoes[0]);
            }
        }
        
        return configuracoes;
    } catch (error) {
        console.error('Erro ao buscar configurações:', error);
        store.SetError('Erro ao buscar configurações');
        // Só atualiza para array vazio se não houver dados
        if (!store.configuracoes || store.configuracoes.length === 0) {
            store.SetConfiguracoes([]);
        }
        return store.configuracoes || [];
    } finally {
        store.SetLoading(false);
    }
};

export const fetchConfiguracaoById = async (id: string): Promise<Configuracao | null> => {
    const store = useConfiguracoesStore.getState();
    try {
        store.SetLoading(true);
        store.SetError(null);
        const response = await configuracoesService.getById(id);
        const configuracao = response.data;
        store.SetConfiguracaoAtual(configuracao);
        return configuracao;
    } catch (error) {
        console.error('Erro ao buscar configuração:', error);
        store.SetError('Erro ao buscar configuração');
        return null;
    } finally {
        store.SetLoading(false);
    }
};

export const updateConfiguracao = async (id: string, data: Partial<Configuracao>): Promise<Configuracao | null> => {
    const store = useConfiguracoesStore.getState();
    try {
        store.SetLoading(true);
        store.SetError(null);
        const response = await configuracoesService.update(id, data);
        const configuracaoAtualizada = response.data;
        store.SetConfiguracaoAtual(configuracaoAtualizada);
        // Atualiza também na lista de configurações
        const configuracoes = store.configuracoes || [];
        const index = configuracoes.findIndex(c => c.Id === id);
        if (index !== -1) {
            configuracoes[index] = configuracaoAtualizada;
            store.SetConfiguracoes([...configuracoes]);
        }
        return configuracaoAtualizada;
    } catch (error) {
        console.error('Erro ao atualizar configuração:', error);
        store.SetError('Erro ao atualizar configuração');
        throw error;
    } finally {
        store.SetLoading(false);
    }
};

export const createConfiguracao = async (data: Partial<Configuracao>): Promise<Configuracao | null> => {
    const store = useConfiguracoesStore.getState();
    try {
        store.SetLoading(true);
        store.SetError(null);
        const response = await configuracoesService.create(data);
        const novaConfiguracao = response.data;
        store.SetConfiguracaoAtual(novaConfiguracao);
        // Adiciona à lista de configurações
        const configuracoes = store.configuracoes || [];
        store.SetConfiguracoes([...configuracoes, novaConfiguracao]);
        return novaConfiguracao;
    } catch (error) {
        console.error('Erro ao criar configuração:', error);
        store.SetError('Erro ao criar configuração');
        throw error;
    } finally {
        store.SetLoading(false);
    }
};

