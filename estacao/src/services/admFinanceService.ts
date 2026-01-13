import { api } from '@/lib/axios';
import type {
  FinanceiroPsicologo,
  Financeiro,
  PsicologoFinanceiro,
  RelatorioFinanceiro,
  EstatisticasFinanceiras,
  FiltroRelatorio,
  AprovarPagamentoDTO,
  ReprovarPagamentoDTO,
  BaixarPagamentoDTO,
  ListaPaginada,
} from '@/types/admFinanceTypes';
import type { Psicologo } from '@/types/psicologoTypes';

export const admFinanceService = () => {
  return {
    /**
     * Lista pagamentos de psicólogos
     */
    listarPagamentosPsicologos: (filtros?: {
      dataInicio?: string;
      dataFim?: string;
      psicologoId?: string;
      status?: string;
      tipo?: string;
      page?: number;
      pageSize?: number;
    }) => {
      const params = new URLSearchParams();
      if (filtros?.dataInicio) params.append('dataInicio', filtros.dataInicio);
      if (filtros?.dataFim) params.append('dataFim', filtros.dataFim);
      if (filtros?.psicologoId) params.append('psicologoId', filtros.psicologoId);
      if (filtros?.status) params.append('status', filtros.status);
      if (filtros?.tipo) params.append('tipo', filtros.tipo);
      if (filtros?.page) params.append('page', filtros.page.toString());
      if (filtros?.pageSize) params.append('pageSize', filtros.pageSize.toString());

      return api.get<{ success: boolean; data: ListaPaginada<FinanceiroPsicologo> }>(
        `/admin/financeiro/psicologos?${params.toString()}`
      );
    },

    /**
     * Lista pagamentos de pacientes (entradas)
     */
    listarPagamentosPacientes: (filtros?: {
      dataInicio?: string;
      dataFim?: string;
      status?: string;
      tipo?: string;
      page?: number;
      pageSize?: number;
    }) => {
      const params = new URLSearchParams();
      if (filtros?.dataInicio) params.append('dataInicio', filtros.dataInicio);
      if (filtros?.dataFim) params.append('dataFim', filtros.dataFim);
      if (filtros?.status) params.append('status', filtros.status);
      if (filtros?.tipo) params.append('tipo', filtros.tipo);
      if (filtros?.page) params.append('page', filtros.page.toString());
      if (filtros?.pageSize) params.append('pageSize', filtros.pageSize.toString());

      return api.get<{ success: boolean; data: ListaPaginada<Financeiro> }>(
        `/admin/financeiro/pacientes?${params.toString()}`
      );
    },

    /**
     * Lista psicólogos com informações financeiras
     */
    listarPsicologosComFinanceiro: (filtros?: {
      status?: string;
      page?: number;
      pageSize?: number;
    }) => {
      const params = new URLSearchParams();
      if (filtros?.status) params.append('status', filtros.status);
      if (filtros?.page) params.append('page', filtros.page.toString());
      if (filtros?.pageSize) params.append('pageSize', filtros.pageSize.toString());

      return api.get<{ success: boolean; data: ListaPaginada<PsicologoFinanceiro> }>(
        `/admin/financeiro/psicologos-lista?${params.toString()}`
      );
    },

    /**
     * Aprova um pagamento de psicólogo
     */
    aprovarPagamento: (data: AprovarPagamentoDTO) => {
      return api.post<{ success: boolean; data: FinanceiroPsicologo; message?: string }>(
        '/admin/financeiro/aprovar-pagamento',
        data
      );
    },

    /**
     * Reprova um pagamento de psicólogo
     */
    reprovarPagamento: (data: ReprovarPagamentoDTO) => {
      return api.post<{ success: boolean; data: FinanceiroPsicologo; message?: string }>(
        '/admin/financeiro/reprovar-pagamento',
        data
      );
    },

    /**
     * Baixa um pagamento (marca como pago)
     */
    baixarPagamento: (data: BaixarPagamentoDTO) => {
      return api.post<{ success: boolean; data: FinanceiroPsicologo; message?: string }>(
        '/admin/financeiro/baixar-pagamento',
        data
      );
    },

    /**
     * Obtém estatísticas financeiras
     */
    obterEstatisticas: () => {
      return api.get<{ success: boolean; data: EstatisticasFinanceiras }>(
        '/admin/financeiro/estatisticas'
      );
    },

    /**
     * Gera relatório financeiro
     */
    gerarRelatorio: (filtros?: FiltroRelatorio) => {
      const params = new URLSearchParams();
      if (filtros?.dataInicio) params.append('dataInicio', filtros.dataInicio);
      if (filtros?.dataFim) params.append('dataFim', filtros.dataFim);
      if (filtros?.psicologoId) params.append('psicologoId', filtros.psicologoId);

      return api.get<{ success: boolean; data: RelatorioFinanceiro }>(
        `/admin/financeiro/relatorio?${params.toString()}`
      );
    },

    /**
     * Obtém detalhes completos de um psicólogo (somente leitura para financeiro)
     */
    obterDetalhesPsicologo: (id: string) => {
      return api.get<{ success: boolean; data: Psicologo }>(
        `/admin/financeiro/psicologos/${id}`
      );
    },
  };
};

