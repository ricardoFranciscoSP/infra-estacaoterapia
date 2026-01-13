import { create } from 'zustand';
import { admFinanceService } from '@/services/admFinanceService';
import type {
  FinanceiroPsicologo,
  Financeiro,
  PsicologoFinanceiro,
  RelatorioFinanceiro,
  EstatisticasFinanceiras,
  FiltroRelatorio,
} from '@/types/admFinanceTypes';

interface AdmFinanceState {
  // Estado
  pagamentosPsicologos: FinanceiroPsicologo[];
  pagamentosPacientes: Financeiro[];
  psicologos: PsicologoFinanceiro[];
  relatorio: RelatorioFinanceiro | null;
  estatisticas: EstatisticasFinanceiras | null;
  
  // Paginação
  paginacaoPsicologos: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  paginacaoPacientes: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  paginacaoListaPsicologos: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };

  // Loading
  isLoadingPagamentosPsicologos: boolean;
  isLoadingPagamentosPacientes: boolean;
  isLoadingPsicologos: boolean;
  isLoadingRelatorio: boolean;
  isLoadingEstatisticas: boolean;

  // Errors
  errorPagamentosPsicologos: string | null;
  errorPagamentosPacientes: string | null;
  errorPsicologos: string | null;
  errorRelatorio: string | null;
  errorEstatisticas: string | null;

  // Actions
  fetchPagamentosPsicologos: (filtros?: {
    dataInicio?: string;
    dataFim?: string;
    psicologoId?: string;
    status?: string;
    tipo?: string;
    page?: number;
    pageSize?: number;
  }) => Promise<void>;
  
  fetchPagamentosPacientes: (filtros?: {
    dataInicio?: string;
    dataFim?: string;
    status?: string;
    tipo?: string;
    page?: number;
    pageSize?: number;
  }) => Promise<void>;
  
  fetchPsicologos: (filtros?: {
    status?: string;
    page?: number;
    pageSize?: number;
  }) => Promise<void>;
  
  fetchRelatorio: (filtros?: FiltroRelatorio) => Promise<void>;
  
  fetchEstatisticas: () => Promise<void>;
  
  aprovarPagamento: (financeiroPsicologoId: string, observacoes?: string, dataPagamento?: string) => Promise<void>;
  
  reprovarPagamento: (financeiroPsicologoId: string, motivo: string) => Promise<void>;
  
  baixarPagamento: (financeiroPsicologoId: string, comprovanteUrl?: string) => Promise<void>;
  
  clearErrors: () => void;
  reset: () => void;
}

const service = admFinanceService();

export const useAdmFinanceStore = create<AdmFinanceState>((set, get) => ({
  // Estado inicial
  pagamentosPsicologos: [],
  pagamentosPacientes: [],
  psicologos: [],
  relatorio: null,
  estatisticas: null,
  
  paginacaoPsicologos: {
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
  },
  paginacaoPacientes: {
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
  },
  paginacaoListaPsicologos: {
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
  },

  isLoadingPagamentosPsicologos: false,
  isLoadingPagamentosPacientes: false,
  isLoadingPsicologos: false,
  isLoadingRelatorio: false,
  isLoadingEstatisticas: false,

  errorPagamentosPsicologos: null,
  errorPagamentosPacientes: null,
  errorPsicologos: null,
  errorRelatorio: null,
  errorEstatisticas: null,

  // Actions
  fetchPagamentosPsicologos: async (filtros) => {
    set({ isLoadingPagamentosPsicologos: true, errorPagamentosPsicologos: null });
    try {
      const response = await service.listarPagamentosPsicologos(filtros);
      if (response.data.success && response.data.data) {
        set({
          pagamentosPsicologos: response.data.data.items,
          paginacaoPsicologos: response.data.data.paginacao,
          isLoadingPagamentosPsicologos: false,
        });
      } else {
        throw new Error('Erro ao buscar pagamentos de psicólogos');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      set({
        errorPagamentosPsicologos: errorMessage,
        isLoadingPagamentosPsicologos: false,
      });
    }
  },

  fetchPagamentosPacientes: async (filtros) => {
    set({ isLoadingPagamentosPacientes: true, errorPagamentosPacientes: null });
    try {
      const response = await service.listarPagamentosPacientes(filtros);
      if (response.data.success && response.data.data) {
        set({
          pagamentosPacientes: response.data.data.items,
          paginacaoPacientes: response.data.data.paginacao,
          isLoadingPagamentosPacientes: false,
        });
      } else {
        throw new Error('Erro ao buscar pagamentos de pacientes');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      set({
        errorPagamentosPacientes: errorMessage,
        isLoadingPagamentosPacientes: false,
      });
    }
  },

  fetchPsicologos: async (filtros) => {
    set({ isLoadingPsicologos: true, errorPsicologos: null });
    try {
      console.log('[AdmFinanceStore] Buscando psicólogos com filtros:', filtros);
      const response = await service.listarPsicologosComFinanceiro(filtros);
      console.log('[AdmFinanceStore] Resposta recebida:', response.data);
      if (response.data.success && response.data.data) {
        set({
          psicologos: response.data.data.items,
          paginacaoListaPsicologos: response.data.data.paginacao,
          isLoadingPsicologos: false,
        });
        console.log('[AdmFinanceStore] Psicólogos atualizados:', response.data.data.items.length);
      } else {
        const errorMsg = 'Erro ao buscar psicólogos';
        console.error('[AdmFinanceStore] Erro na resposta:', {
          error: errorMsg,
          fullResponse: response.data,
          status: response.status,
        });
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('[AdmFinanceStore] Erro ao buscar psicólogos:', error);
      let errorMessage = 'Erro desconhecido';
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: string; message?: string }; status?: number } };
        errorMessage = axiosError.response?.data?.error || 
                      axiosError.response?.data?.message || 
                      `Erro ${axiosError.response?.status || 'desconhecido'}`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      set({
        errorPsicologos: errorMessage,
        isLoadingPsicologos: false,
      });
    }
  },

  fetchRelatorio: async (filtros) => {
    set({ isLoadingRelatorio: true, errorRelatorio: null });
    try {
      const response = await service.gerarRelatorio(filtros);
      if (response.data.success && response.data.data) {
        set({
          relatorio: response.data.data,
          isLoadingRelatorio: false,
        });
      } else {
        throw new Error('Erro ao gerar relatório');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      set({
        errorRelatorio: errorMessage,
        isLoadingRelatorio: false,
      });
    }
  },

  fetchEstatisticas: async () => {
    set({ isLoadingEstatisticas: true, errorEstatisticas: null });
    try {
      const response = await service.obterEstatisticas();
      if (response.data.success && response.data.data) {
        set({
          estatisticas: response.data.data,
          isLoadingEstatisticas: false,
        });
      } else {
        throw new Error('Erro ao buscar estatísticas');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      set({
        errorEstatisticas: errorMessage,
        isLoadingEstatisticas: false,
      });
    }
  },

  aprovarPagamento: async (financeiroPsicologoId, observacoes, dataPagamento) => {
    try {
      await service.aprovarPagamento({ financeiroPsicologoId, observacoes, dataPagamento });
      // Recarrega os dados após aprovação
      await get().fetchPagamentosPsicologos();
      await get().fetchEstatisticas();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao aprovar pagamento';
      throw new Error(errorMessage);
    }
  },

  reprovarPagamento: async (financeiroPsicologoId, motivo) => {
    try {
      await service.reprovarPagamento({ financeiroPsicologoId, motivo });
      // Recarrega os dados após reprovação
      await get().fetchPagamentosPsicologos();
      await get().fetchEstatisticas();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao reprovar pagamento';
      throw new Error(errorMessage);
    }
  },

  baixarPagamento: async (financeiroPsicologoId, comprovanteUrl) => {
    try {
      await service.baixarPagamento({ financeiroPsicologoId, comprovanteUrl });
      // Recarrega os dados após baixa
      await get().fetchPagamentosPsicologos();
      await get().fetchEstatisticas();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao baixar pagamento';
      throw new Error(errorMessage);
    }
  },

  clearErrors: () => {
    set({
      errorPagamentosPsicologos: null,
      errorPagamentosPacientes: null,
      errorPsicologos: null,
      errorRelatorio: null,
      errorEstatisticas: null,
    });
  },

  reset: () => {
    set({
      pagamentosPsicologos: [],
      pagamentosPacientes: [],
      psicologos: [],
      relatorio: null,
      estatisticas: null,
      paginacaoPsicologos: {
        page: 1,
        pageSize: 50,
        total: 0,
        totalPages: 0,
      },
      paginacaoPacientes: {
        page: 1,
        pageSize: 50,
        total: 0,
        totalPages: 0,
      },
      paginacaoListaPsicologos: {
        page: 1,
        pageSize: 50,
        total: 0,
        totalPages: 0,
      },
      isLoadingPagamentosPsicologos: false,
      isLoadingPagamentosPacientes: false,
      isLoadingPsicologos: false,
      isLoadingRelatorio: false,
      isLoadingEstatisticas: false,
      errorPagamentosPsicologos: null,
      errorPagamentosPacientes: null,
      errorPsicologos: null,
      errorRelatorio: null,
      errorEstatisticas: null,
    });
  },
}));

