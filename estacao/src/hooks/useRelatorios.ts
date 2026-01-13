import { useQuery } from '@tanstack/react-query';
import { relatoriosService } from '@/services/relatoriosService';
import {
    ReportFilters,
    UsuarioAtivoReport,
    PlanoReport,
    UsuarioInativoReport,
    FaturamentoReport,
    RepasseReport,
    AvaliacaoReport,
    SessaoReport,
    AgendaReport,
    ReportSummary,
} from '@/types/relatorios';

/**
 * Hook para buscar usuários ativos
 */
export function useUsuariosAtivos(filters?: ReportFilters) {
    return useQuery<UsuarioAtivoReport[]>({
        queryKey: ['relatorios', 'usuarios-ativos', filters],
        queryFn: async () => {
            const response = await relatoriosService.getUsuariosAtivos(filters);
            return response.data.data;
        },
        staleTime: 2 * 60 * 1000, // 2 minutos
    });
}

/**
 * Hook para buscar planos
 */
export function usePlanos(filters?: ReportFilters) {
    return useQuery<PlanoReport[]>({
        queryKey: ['relatorios', 'planos', filters],
        queryFn: async () => {
            const response = await relatoriosService.getPlanos(filters);
            return response.data.data;
        },
        staleTime: 2 * 60 * 1000,
    });
}

/**
 * Hook para buscar usuários inativos
 */
export function useUsuariosInativos(filters?: ReportFilters) {
    return useQuery<UsuarioInativoReport[]>({
        queryKey: ['relatorios', 'usuarios-inativos', filters],
        queryFn: async () => {
            const response = await relatoriosService.getUsuariosInativos(filters);
            return response.data.data;
        },
        staleTime: 2 * 60 * 1000,
    });
}

/**
 * Hook para buscar faturamento
 */
export function useFaturamento(filters?: ReportFilters) {
    return useQuery<FaturamentoReport[]>({
        queryKey: ['relatorios', 'faturamento', filters],
        queryFn: async () => {
            const response = await relatoriosService.getFaturamento(filters);
            return response.data.data;
        },
        staleTime: 2 * 60 * 1000,
    });
}

/**
 * Hook para buscar repasse
 */
export function useRepasse(filters?: ReportFilters) {
    return useQuery<RepasseReport[]>({
        queryKey: ['relatorios', 'repasse', filters],
        queryFn: async () => {
            const response = await relatoriosService.getRepasse(filters);
            return response.data.data;
        },
        staleTime: 2 * 60 * 1000,
    });
}

/**
 * Hook para buscar avaliações
 */
export function useAvaliacoes(filters?: ReportFilters) {
    return useQuery<AvaliacaoReport[]>({
        queryKey: ['relatorios', 'avaliacoes', filters],
        queryFn: async () => {
            const response = await relatoriosService.getAvaliacoes(filters);
            return response.data.data;
        },
        staleTime: 2 * 60 * 1000,
    });
}

/**
 * Hook para buscar sessões
 */
export function useSessoes(filters?: ReportFilters) {
    return useQuery<SessaoReport[]>({
        queryKey: ['relatorios', 'sessoes', filters],
        queryFn: async () => {
            const response = await relatoriosService.getSessoes(filters);
            return response.data.data;
        },
        staleTime: 2 * 60 * 1000,
    });
}

/**
 * Hook para buscar agenda
 */
export function useAgenda(filters?: ReportFilters) {
    return useQuery<AgendaReport[]>({
        queryKey: ['relatorios', 'agenda', filters],
        queryFn: async () => {
            const response = await relatoriosService.getAgenda(filters);
            return response.data.data;
        },
        staleTime: 2 * 60 * 1000,
    });
}

/**
 * Hook para buscar resumo geral
 */
export function useReportSummary(filters?: ReportFilters) {
    return useQuery<ReportSummary>({
        queryKey: ['relatorios', 'summary', filters],
        queryFn: async () => {
            const response = await relatoriosService.getSummary(filters);
            return response.data.data;
        },
        staleTime: 2 * 60 * 1000,
    });
}

