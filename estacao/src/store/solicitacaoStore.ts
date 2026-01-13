import { create } from 'zustand';
import { solicitacaoService } from '@/services/solicitacoesService';
import { Solicitacao, CreateSolicitacaoData, FilterSolicitacoesParams } from '@/types/solicitacaoTypes';

// Estado e ações do store
export interface SolicitacaoStoreState {
    Solicitacoes: Solicitacao[] | null;
    SolicitacaoSelecionada: Solicitacao | null;
}

export interface SolicitacaoStoreActions {
    SetSolicitacoes: (solicitacoes: Solicitacao[] | null) => void;
    SetSolicitacaoSelecionada: (solicitacao: Solicitacao | null) => void;
}

// Store com estado e ações
export const useSolicitacaoStore = create<SolicitacaoStoreState & SolicitacaoStoreActions>((set) => ({
    Solicitacoes: null,
    SolicitacaoSelecionada: null,
    SetSolicitacoes: (solicitacoes: Solicitacao[] | null) => set({ Solicitacoes: solicitacoes }),
    SetSolicitacaoSelecionada: (solicitacao: Solicitacao | null) => set({ SolicitacaoSelecionada: solicitacao }),
}));

// Funções para buscar, criar, atualizar e deletar solicitações usando o service
export const fetchSolicitacoes = async (): Promise<Solicitacao[]> => {
    try {
        const response = await solicitacaoService.getSolicitacoes();
        const solicitacoes = response.data.solicitacoes || [];
        useSolicitacaoStore.getState().SetSolicitacoes(solicitacoes);
        return solicitacoes;
    } catch (error) {
        console.error('Erro ao buscar solicitações:', error);
        useSolicitacaoStore.getState().SetSolicitacoes([]);
        return [];
    }
};

// Buscar todas as solicitações (admin)
export const fetchAllSolicitacoes = async (): Promise<Solicitacao[]> => {
    try {
        const response = await solicitacaoService.getAllSolicitacoes();
        const solicitacoes = response.data.solicitacoes || [];
        useSolicitacaoStore.getState().SetSolicitacoes(solicitacoes);
        return solicitacoes;
    } catch (error) {
        console.error('Erro ao buscar todas as solicitações:', error);
        useSolicitacaoStore.getState().SetSolicitacoes([]);
        return [];
    }
};

export const fetchSolicitacaoById = async (id: string): Promise<Solicitacao | null> => {
    try {
        const response = await solicitacaoService.getSolicitacaoById(id);
        const solicitacao = response.data.solicitacao || null;
        if (solicitacao) {
            useSolicitacaoStore.getState().SetSolicitacaoSelecionada(solicitacao);
        }
        return solicitacao;
    } catch (error) {
        console.error('Erro ao buscar solicitação por ID:', error);
        return null;
    }
};

export const createSolicitacao = async (data: CreateSolicitacaoData): Promise<{ success: boolean; message: string }> => {
    try {
        const response = await solicitacaoService.createSolicitacao(data);
        if (response.data.success) {
            await fetchSolicitacoes();
        }
        return response.data;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao criar solicitação';
        console.error('Erro ao criar solicitação:', error);
        return { success: false, message: errorMessage };
    }
};

export const updateSolicitacaoStatus = async (solicitacaoId: string, status: string): Promise<{ success: boolean; message: string }> => {
    try {
        const response = await solicitacaoService.updateSolicitacaoStatus(solicitacaoId, status);
        if (response.data.success) {
            await fetchSolicitacoes();
        }
        return response.data;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao atualizar solicitação';
        console.error('Erro ao atualizar solicitação:', error);
        return { success: false, message: errorMessage };
    }
};

export const deleteSolicitacao = async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
        const response = await solicitacaoService.deleteSolicitacao(id);
        if (response.data.success) {
            await fetchSolicitacoes();
        }
        return response.data;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao deletar solicitação';
        console.error('Erro ao deletar solicitação:', error);
        return { success: false, message: errorMessage };
    }
};

export const filterSolicitacoes = async (params: FilterSolicitacoesParams): Promise<Solicitacao[]> => {
    try {
        const response = await solicitacaoService.filterSolicitacoes(params);
        const solicitacoes = response.data.solicitacoes || [];
        useSolicitacaoStore.getState().SetSolicitacoes(solicitacoes);
        return solicitacoes;
    } catch (error) {
        console.error('Erro ao filtrar solicitações:', error);
        return [];
    }
};
