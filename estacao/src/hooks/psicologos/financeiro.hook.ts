import { useQuery } from '@tanstack/react-query';
import useFinanceiroStore, { HistoricoSessao, GanhoMensal, AtendimentoMensal } from '@/store/psicologos/financeiroStore';
import { calculoPagamento } from '@/types/configAgendaTypes';

export function useObterPagamentos() {
    const obterPagamentos = useFinanceiroStore(state => state.obterPagamentos);
    // Não ler calculoPagamento diretamente, pois pode estar desatualizado

    const query = useQuery<calculoPagamento>({
        queryKey: ['pagamentos'],
        queryFn: async () => {
            await obterPagamentos();
            // Buscar o valor atualizado do store após o await
            const calculoAtual = useFinanceiroStore.getState().calculoPagamento;
            if (calculoAtual && typeof calculoAtual.totalPagamento === 'number') {
                return calculoAtual;
            }
            return { totalPagamento: 0 };
        },
        enabled: true,
        retry: 1,
        staleTime: 5 * 60 * 1000,
    });

    return {
        calculoPagamento: query.data ?? { totalPagamento: 0 },
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}

export function useHistoricoSessoes(mes?: number, ano?: number, page?: number, pageSize?: number) {
    const obterHistoricoSessoes = useFinanceiroStore(state => state.obterHistoricoSessoes);
    const isLoadingHistorico = useFinanceiroStore(state => state.isLoadingHistorico);
    const pagination = useFinanceiroStore(state => state.pagination);

    const query = useQuery<HistoricoSessao[]>({
        queryKey: ['historico-sessoes', mes, ano, page, pageSize],
        queryFn: async () => {
            await obterHistoricoSessoes(mes, ano, page, pageSize);
            // Buscar o valor atualizado do store após o await
            const historicoAtual = useFinanceiroStore.getState().historicoSessoes;
            return historicoAtual;
        },
        enabled: true,
        retry: 1,
        staleTime: 2 * 60 * 1000, // 2 minutos
    });

    return {
        historicoSessoes: query.data ?? [],
        pagination: pagination,
        isLoading: query.isLoading || isLoadingHistorico,
        isError: query.isError,
        refetch: query.refetch,
    };
}

export function useGanhosMensais(ano?: number, mes?: number) {
    const obterGanhosMensais = useFinanceiroStore(state => state.obterGanhosMensais);
    const isLoadingGanhos = useFinanceiroStore(state => state.isLoadingGanhos);

    const query = useQuery<GanhoMensal[]>({
        queryKey: ['ganhos-mensais', ano, mes],
        queryFn: async () => {
            await obterGanhosMensais(ano, mes);
            // Buscar o valor atualizado do store após o await
            const ganhosAtual = useFinanceiroStore.getState().ganhosMensais;
            return ganhosAtual;
        },
        enabled: true,
        retry: 1,
        staleTime: 5 * 60 * 1000, // 5 minutos
    });

    return {
        ganhosMensais: query.data ?? [],
        isLoading: query.isLoading || isLoadingGanhos,
        isError: query.isError,
        refetch: query.refetch,
    };
}

export function useAtendimentosMensais(ano?: number, mes?: number) {
    const obterAtendimentosMensais = useFinanceiroStore(state => state.obterAtendimentosMensais);
    const isLoadingAtendimentos = useFinanceiroStore(state => state.isLoadingAtendimentos);

    const query = useQuery<AtendimentoMensal[]>({
        queryKey: ['atendimentos-mensais', ano, mes],
        queryFn: async () => {
            await obterAtendimentosMensais(ano, mes);
            // Buscar o valor atualizado do store após o await
            const atendimentosAtual = useFinanceiroStore.getState().atendimentosMensais;
            return atendimentosAtual;
        },
        enabled: true,
        retry: 1,
        staleTime: 5 * 60 * 1000, // 5 minutos
    });

    return {
        atendimentosMensais: query.data ?? [],
        isLoading: query.isLoading || isLoadingAtendimentos,
        isError: query.isError,
        refetch: query.refetch,
    };
}

export function useSaldoDisponivelResgate() {
    const obterSaldoDisponivelResgate = useFinanceiroStore(state => state.obterSaldoDisponivelResgate);
    const isLoadingSaldo = useFinanceiroStore(state => state.isLoadingSaldo);

    const query = useQuery<number>({
        queryKey: ['saldo-disponivel-resgate'],
        queryFn: async () => {
            await obterSaldoDisponivelResgate();
            // Buscar o valor atualizado do store após o await
            const saldoAtual = useFinanceiroStore.getState().saldoDisponivelResgate;
            return saldoAtual;
        },
        enabled: true,
        retry: 1,
        staleTime: 2 * 60 * 1000, // 2 minutos
    });

    return {
        saldoDisponivelResgate: query.data ?? 0,
        isLoading: query.isLoading || isLoadingSaldo,
        isError: query.isError,
        refetch: query.refetch,
    };
}

export function useSaldoRetido() {
    const obterSaldoRetido = useFinanceiroStore(state => state.obterSaldoRetido);
    const isLoadingSaldoRetido = useFinanceiroStore(state => state.isLoadingSaldoRetido);

    const query = useQuery<number>({
        queryKey: ['saldo-retido'],
        queryFn: async () => {
            await obterSaldoRetido();
            // Buscar o valor atualizado do store após o await
            const saldoAtual = useFinanceiroStore.getState().saldoRetido;
            return saldoAtual;
        },
        enabled: true,
        retry: 1,
        staleTime: 2 * 60 * 1000, // 2 minutos
    });

    return {
        saldoRetido: query.data ?? 0,
        isLoading: query.isLoading || isLoadingSaldoRetido,
        isError: query.isError,
        refetch: query.refetch,
    };
}