/**
 * Hook para buscar relatórios completos
 */

import { useQuery } from "@tanstack/react-query";
import {
    getClientesCadastroReport,
    getPsicologosCredenciamentoReport,
    getPlanosMovimentacaoReport,
    getAcessoResetReport,
    getAcessoResetPsicologoReport,
    getSessoesHistoricoReport,
    getAvaliacoesSessoesReport,
    getFaturamentoClienteReport,
    getAgendaPsicologoReport,
    getCarteiraPagamentoPsicologoReport,
    getOnboardingObjetivosReport,
    ComprehensiveReportFilters,
} from "@/services/admComprehensiveReports";

export function useClientesCadastroReport(filters: ComprehensiveReportFilters = {}) {
    return useQuery({
        queryKey: ["comprehensive-reports", "clientes-cadastro", filters],
        queryFn: () => getClientesCadastroReport(filters),
        staleTime: 30 * 1000,
    });
}

export function usePsicologosCredenciamentoReport(filters: ComprehensiveReportFilters = {}) {
    return useQuery({
        queryKey: ["comprehensive-reports", "psicologos-credenciamento", filters],
        queryFn: () => getPsicologosCredenciamentoReport(filters),
        staleTime: 30 * 1000,
    });
}

export function usePlanosMovimentacaoReport(filters: ComprehensiveReportFilters = {}) {
    return useQuery({
        queryKey: ["comprehensive-reports", "planos-movimentacao", filters],
        queryFn: () => getPlanosMovimentacaoReport(filters),
        staleTime: 30 * 1000,
    });
}

export function useAcessoResetReport(filters: ComprehensiveReportFilters = {}) {
    return useQuery({
        queryKey: ["comprehensive-reports", "acesso-reset", filters],
        queryFn: () => getAcessoResetReport(filters),
        staleTime: 30 * 1000,
    });
}

export function useSessoesHistoricoReport(filters: ComprehensiveReportFilters = {}) {
    return useQuery({
        queryKey: ["comprehensive-reports", "sessoes-historico", filters],
        queryFn: () => getSessoesHistoricoReport(filters),
        staleTime: 30 * 1000,
    });
}

export function useAvaliacoesSessoesReport(filters: ComprehensiveReportFilters = {}) {
    return useQuery({
        queryKey: ["comprehensive-reports", "avaliacoes-sessoes", filters],
        queryFn: () => getAvaliacoesSessoesReport(filters),
        staleTime: 30 * 1000,
    });
}

export function useFaturamentoClienteReport(filters: ComprehensiveReportFilters = {}) {
    return useQuery({
        queryKey: ["comprehensive-reports", "faturamento-cliente", filters],
        queryFn: () => getFaturamentoClienteReport(filters),
        staleTime: 30 * 1000,
    });
}

export function useAcessoResetPsicologoReport(filters: ComprehensiveReportFilters = {}) {
    return useQuery({
        queryKey: ["comprehensive-reports", "acesso-reset-psicologo", filters],
        queryFn: () => getAcessoResetPsicologoReport(filters),
        staleTime: 30 * 1000,
    });
}

export function useAgendaPsicologoReport(filters: ComprehensiveReportFilters = {}) {
    return useQuery({
        queryKey: ["comprehensive-reports", "agenda-psicologo", filters],
        queryFn: () => getAgendaPsicologoReport(filters),
        staleTime: 30 * 1000,
    });
}

export function useCarteiraPagamentoPsicologoReport(filters: ComprehensiveReportFilters = {}) {
    return useQuery({
        queryKey: ["comprehensive-reports", "carteira-pagamento-psicologo", filters],
        queryFn: () => getCarteiraPagamentoPsicologoReport(filters),
        staleTime: 30 * 1000,
    });
}

export function useOnboardingObjetivosReport(filters: ComprehensiveReportFilters = {}) {
    return useQuery({
        queryKey: ["comprehensive-reports", "onboarding-objetivos", filters],
        queryFn: () => getOnboardingObjetivosReport(filters),
        staleTime: 30 * 1000,
    });
}

