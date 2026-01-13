import { create } from 'zustand';
import { financeiroService } from '@/services/financeiroService';
import { Financeiro } from '@/types/financeiroTypes';

const service = financeiroService();

interface FinanceiroStore {
    financeiros: Financeiro[];
    setFinanceiros: (financeiros: Financeiro[]) => void;
    clearFinanceiros: () => void;
}

export const useFinanceiroStore = create<FinanceiroStore>((set) => ({
    financeiros: [],
    setFinanceiros: (financeiros) => set({ financeiros: Array.isArray(financeiros) ? financeiros : [] }),
    clearFinanceiros: () => set({ financeiros: [] }),
}));

export const fetchFinanceiros = async () => {
    console.debug('Fetching pagamentos...');
    try {
        const response = await service.getPagamentos();
        const pagamentos = Array.isArray(response.data.pagamentos)
            ? response.data.pagamentos
            : [];
        useFinanceiroStore.getState().setFinanceiros(pagamentos);
        return response.data;
    } catch (error) {
        console.error('Falha ao buscar pagamentos:', error);
        useFinanceiroStore.getState().clearFinanceiros();
        return { pagamentos: [] };
    }
};

