import { create } from 'zustand';
import { calculoPagamento } from '@/types/configAgendaTypes';
import { admPsicologoService } from '@/services/admPsicologoService';

// Adicionar interface para erros da API
interface APIError {
    response?: {
        data?: {
            message?: string;
        };
    };
}

export interface HistoricoSessao {
    id: string;
    sessaoId: string;
    paciente: string;
    dataHora: string;
    valor: number;
    statusSessao: string;
    statusPagamento: string;
}

export interface PaginationInfo {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}

export interface GanhoMensal {
    mes: number;
    disponivel: number;
    retido: number;
    total: number;
}

export interface AtendimentoMensal {
    mes: number;
    recebidos: number;
    aReceber: number;
    total: number;
}

export interface ConsultaDetalhada {
    id: string;
    data: string;
    hora: string;
    paciente: string;
    valor: number;
    valorComissao: number;
}

export interface FaturaPeriodo {
    quantidade: number;
    total: number;
    periodo: string;
    pagamento: string;
    consultas: ConsultaDetalhada[];
}

interface financeiroState {
    calculoPagamento: calculoPagamento | null;
    historicoSessoes: HistoricoSessao[];
    pagination: PaginationInfo | null;
    ganhosMensais: GanhoMensal[];
    atendimentosMensais: AtendimentoMensal[];
    saldoDisponivelResgate: number;
    saldoRetido: number;
    faturaPeriodo: FaturaPeriodo | null;
    isLoading: boolean;
    isLoadingHistorico: boolean;
    isLoadingGanhos: boolean;
    isLoadingAtendimentos: boolean;
    isLoadingSaldo: boolean;
    isLoadingSaldoRetido: boolean;
    isLoadingFaturaPeriodo: boolean;
    error: string | null;
    obterPagamentos: () => Promise<void>;
    obterHistoricoSessoes: (mes?: number, ano?: number, page?: number, pageSize?: number) => Promise<void>;
    obterGanhosMensais: (ano?: number, mes?: number) => Promise<void>;
    obterAtendimentosMensais: (ano?: number, mes?: number) => Promise<void>;
    obterSaldoDisponivelResgate: () => Promise<void>;
    obterSaldoRetido: () => Promise<void>;
    obterFaturaPeriodo: () => Promise<void>;
}

const useFinanceiroStore = create<financeiroState>((set) => ({
    calculoPagamento: null,
    historicoSessoes: [],
    pagination: null,
    ganhosMensais: [],
    atendimentosMensais: [],
    saldoDisponivelResgate: 0,
    saldoRetido: 0,
    faturaPeriodo: null,
    isLoading: false,
    isLoadingHistorico: false,
    isLoadingGanhos: false,
    isLoadingAtendimentos: false,
    isLoadingSaldo: false,
    isLoadingSaldoRetido: false,
    isLoadingFaturaPeriodo: false,
    error: null,

    setCalculoPagamento: (calculo: calculoPagamento | null) => set({ calculoPagamento: calculo }),

    obterPagamentos: async () => {
        set({ isLoading: true, error: null });
        try {
            const result = await admPsicologoService().calcularPagamento();
            // Garante que o resultado tenha a estrutura esperada
            const pagamentoData: calculoPagamento = {
                totalPagamento: result.data?.totalPagamento || 0
            };
            set({ calculoPagamento: pagamentoData, isLoading: false });
        } catch (error: unknown) {
            const apiError = error as APIError;
            set({ error: apiError?.response?.data?.message || 'Erro ao obter pagamentos.', isLoading: false });
            // Em caso de erro, define valor padrão
            set({ calculoPagamento: { totalPagamento: 0 } });
        }
    },

    obterHistoricoSessoes: async (mes?: number, ano?: number, page?: number, pageSize?: number) => {
        set({ isLoadingHistorico: true, error: null });
        try {
            const result = await admPsicologoService().getHistoricoSessoes(mes, ano, page, pageSize);
            const response = result.data || { data: [], pagination: null };

            // Formata a data/hora usando o campo ScheduledAt vindo da tabela ReservaSessao
            const formatFromScheduledAt = (scheduledAt?: string, fallback?: string) => {
                if (!scheduledAt) return fallback || '';
                const d = new Date(scheduledAt);
                if (Number.isNaN(d.getTime())) return fallback || '';
                const pad = (n: number) => n.toString().padStart(2, '0');
                const dia = pad(d.getDate());
                const mesNum = pad(d.getMonth() + 1);
                const anoNum = d.getFullYear();
                const horas = pad(d.getHours());
                const minutos = pad(d.getMinutes());
                return `${dia}/${mesNum}/${anoNum} - ${horas}:${minutos}`;
            };

            const historicoMapeado = (response.data || []).map((item: HistoricoSessao & { ScheduledAt?: string; scheduledAt?: string; dataHora?: string }) => {
                const scheduled = item.ScheduledAt || item.scheduledAt;
                return {
                    ...item,
                    dataHora: formatFromScheduledAt(scheduled, item.dataHora),
                } as HistoricoSessao;
            });

            set({ 
                historicoSessoes: historicoMapeado, 
                pagination: response.pagination || null,
                isLoadingHistorico: false 
            });
        } catch (error: unknown) {
            const apiError = error as APIError;
            set({ 
                error: apiError?.response?.data?.message || 'Erro ao obter histórico de sessões.', 
                isLoadingHistorico: false,
                historicoSessoes: [],
                pagination: null
            });
        }
    },

    obterGanhosMensais: async (ano?: number, mes?: number) => {
        set({ isLoadingGanhos: true, error: null });
        try {
            const result = await admPsicologoService().getGanhosMensais(ano, mes);
            const ganhos = result.data || [];
            set({ ganhosMensais: ganhos, isLoadingGanhos: false });
        } catch (error: unknown) {
            const apiError = error as APIError;
            set({ 
                error: apiError?.response?.data?.message || 'Erro ao obter ganhos mensais.', 
                isLoadingGanhos: false,
                ganhosMensais: []
            });
        }
    },

    obterAtendimentosMensais: async (ano?: number, mes?: number) => {
        set({ isLoadingAtendimentos: true, error: null });
        try {
            const result = await admPsicologoService().getAtendimentosMensais(ano, mes);
            const atendimentos = result.data || [];
            set({ atendimentosMensais: atendimentos, isLoadingAtendimentos: false });
        } catch (error: unknown) {
            const apiError = error as APIError;
            set({ 
                error: apiError?.response?.data?.message || 'Erro ao obter atendimentos mensais.', 
                isLoadingAtendimentos: false,
                atendimentosMensais: []
            });
        }
    },

    obterSaldoDisponivelResgate: async () => {
        set({ isLoadingSaldo: true, error: null });
        try {
            const result = await admPsicologoService().getSaldoDisponivelResgate();
            const saldo = result.data?.saldoDisponivel || 0;
            set({ saldoDisponivelResgate: saldo, isLoadingSaldo: false });
        } catch (error: unknown) {
            const apiError = error as APIError;
            set({ 
                error: apiError?.response?.data?.message || 'Erro ao obter saldo disponível.', 
                isLoadingSaldo: false,
                saldoDisponivelResgate: 0
            });
        }
    },

    obterSaldoRetido: async () => {
        set({ isLoadingSaldoRetido: true, error: null });
        try {
            const result = await admPsicologoService().getSaldoRetido();
            const saldo = result.data?.saldoRetido || 0;
            set({ saldoRetido: saldo, isLoadingSaldoRetido: false });
        } catch (error: unknown) {
            const apiError = error as APIError;
            set({ 
                error: apiError?.response?.data?.message || 'Erro ao obter saldo retido.', 
                isLoadingSaldoRetido: false,
                saldoRetido: 0
            });
        }
    },

    obterFaturaPeriodo: async () => {
        set({ isLoadingFaturaPeriodo: true, error: null });
        try {
            console.log('[obterFaturaPeriodo] Iniciando busca...');
            const result = await admPsicologoService().getFaturaPeriodo();
            console.log('[obterFaturaPeriodo] Resposta recebida:', result.data);
            
            const fatura = result.data || { 
                quantidade: 0, 
                total: 0, 
                periodo: '', 
                pagamento: '',
                consultas: []
            };
            
            // Garantir que consultas seja um array
            if (!Array.isArray(fatura.consultas)) {
                fatura.consultas = [];
            }
            
            console.log('[obterFaturaPeriodo] Fatura processada:', fatura);
            console.log('[obterFaturaPeriodo] Quantidade:', fatura.quantidade);
            console.log('[obterFaturaPeriodo] Total:', fatura.total);
            console.log('[obterFaturaPeriodo] Consultas:', fatura.consultas?.length || 0);
            set({ faturaPeriodo: fatura, isLoadingFaturaPeriodo: false });
        } catch (error: unknown) {
            console.error('[obterFaturaPeriodo] Erro:', error);
            const apiError = error as APIError;
            const errorMessage = apiError?.response?.data?.message || 'Erro ao obter fatura do período.';
            set({ 
                error: errorMessage, 
                isLoadingFaturaPeriodo: false,
                faturaPeriodo: { 
                    quantidade: 0, 
                    total: 0, 
                    periodo: '', 
                    pagamento: '',
                    consultas: []
                }
            });
        }
    },
}));

export default useFinanceiroStore;
