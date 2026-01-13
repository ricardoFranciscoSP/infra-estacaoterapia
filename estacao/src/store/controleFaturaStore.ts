import { controleFaturaService } from '@/services/controleFatura';
import { create } from 'zustand';

// Enum de exemplo, ajuste conforme sua definição real
export type FaturaStatus = 'PENDENTE' | 'PAID' | 'CANCELADA'; // ajuste conforme seu enum real
export type TipoFatura = 'RECORRENTE' | 'UNICA'; // ajuste conforme seu enum real

export interface Fatura {
    Id: string;
    CodigoFatura?: string;
    Valor: number;
    Status: FaturaStatus;
    DataEmissao: Date;
    DataVencimento: Date;
    Tipo: TipoFatura;
    CustomerId?: string;
    UserId?: string;
    CreatedAt: Date;
    UpdatedAt: Date;
}

interface ControleFaturaState {
    faturas: Fatura[];
    fatura: Fatura | null;
    loading: boolean;
    error: string | null;
    fetchFaturas: () => Promise<void>;
    criarControleFatura: (data: Omit<Fatura, 'Id' | 'CreatedAt' | 'UpdatedAt' | 'Financeiros'>) => Promise<void>;
    updateControleFaturaStatus: (id: string, status: FaturaStatus) => Promise<void>;
    getControleFaturaById: (id: string) => Promise<void>;
    getControleFaturasByUserId: (userId: string) => Promise<void>;
    listarControlesFatura: () => Promise<void>;
    deleteControleFatura: (id: string) => Promise<void>;
}

export const useControleFaturaStore = create<ControleFaturaState>((set) => ({
    faturas: [],
    fatura: null,
    loading: false,
    error: null,

    fetchFaturas: async () => {
        set({ loading: true, error: null });
        try {
            const data = await controleFaturaService().listar();
            set({ faturas: data.data as Fatura[], loading: false });
        } catch (error: unknown) {
            set({ error: (error as Error)?.message || 'Erro ao buscar faturas', loading: false });
        }
    },

    criarControleFatura: async (data) => {
        set({ loading: true, error: null });
        try {
            await controleFaturaService().criarControleFatura(data);
            await useControleFaturaStore.getState().fetchFaturas();
            set({ loading: false });
        } catch (error: unknown) {
            set({ error: (error as Error)?.message || 'Erro ao criar fatura', loading: false });
        }
    },

    updateControleFaturaStatus: async (id, status) => {
        set({ loading: true, error: null });
        try {
            await controleFaturaService().updateStatus(id, { status });
            await useControleFaturaStore.getState().fetchFaturas();
            set({ loading: false });
        } catch (error: unknown) {
            set({ error: (error as Error)?.message || 'Erro ao atualizar status', loading: false });
        }
    },

    getControleFaturaById: async (id) => {
        set({ loading: true, error: null });
        try {
            const data = await controleFaturaService().getById(id);
            set({ fatura: data.data as Fatura, loading: false });
        } catch (error: unknown) {
            set({ error: (error as Error)?.message || 'Erro ao buscar fatura', loading: false });
        }
    },

    getControleFaturasByUserId: async (userId) => {
        set({ loading: true, error: null });
        try {
            const data = await controleFaturaService().getByUserId(userId);
            set({ faturas: data.data as Fatura[], loading: false });
        } catch (error: unknown) {
            set({ error: (error as Error)?.message || 'Erro ao buscar faturas do usuário', loading: false });
        }
    },

    listarControlesFatura: async () => {
        set({ loading: true, error: null });
        try {
            const data = await controleFaturaService().listar();
            set({ faturas: data.data as Fatura[], loading: false });
        } catch (error: unknown) {
            set({ error: (error as Error)?.message || 'Erro ao listar faturas', loading: false });
        }
    },

    deleteControleFatura: async (id) => {
        set({ loading: true, error: null });
        try {
            await controleFaturaService().delete(id);
            await useControleFaturaStore.getState().fetchFaturas();
            set({ loading: false });
        } catch (error: unknown) {
            set({ error: (error as Error)?.message || 'Erro ao deletar fatura', loading: false });
        }
    },
}));