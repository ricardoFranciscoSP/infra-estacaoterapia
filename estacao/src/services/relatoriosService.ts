import { api } from "@/lib/axios";
import { AxiosResponse } from "axios";
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
    ReportResponse,
} from "@/types/relatorios";

export const relatoriosService = {
    /**
     * Busca usuários ativos
     */
    getUsuariosAtivos: (filters?: ReportFilters): Promise<AxiosResponse<ReportResponse<UsuarioAtivoReport[]>>> => {
        const params = new URLSearchParams();
        if (filters?.startDate) params.append('startDate', filters.startDate);
        if (filters?.endDate) params.append('endDate', filters.endDate);
        if (filters?.status) params.append('status', filters.status);
        if (filters?.role) params.append('role', filters.role);
        if (filters?.userId) params.append('userId', filters.userId);
        if (filters?.search) params.append('search', filters.search);

        const queryString = params.toString();
        return api.get(`/reports/usuarios-ativos${queryString ? `?${queryString}` : ''}`);
    },

    /**
     * Busca planos
     */
    getPlanos: (filters?: ReportFilters): Promise<AxiosResponse<ReportResponse<PlanoReport[]>>> => {
        const params = new URLSearchParams();
        if (filters?.startDate) params.append('startDate', filters.startDate);
        if (filters?.endDate) params.append('endDate', filters.endDate);
        if (filters?.status) params.append('status', filters.status);
        if (filters?.search) params.append('search', filters.search);

        const queryString = params.toString();
        return api.get(`/reports/planos${queryString ? `?${queryString}` : ''}`);
    },

    /**
     * Busca usuários inativos
     */
    getUsuariosInativos: (filters?: ReportFilters): Promise<AxiosResponse<ReportResponse<UsuarioInativoReport[]>>> => {
        const params = new URLSearchParams();
        if (filters?.startDate) params.append('startDate', filters.startDate);
        if (filters?.endDate) params.append('endDate', filters.endDate);
        if (filters?.status) params.append('status', filters.status);
        if (filters?.role) params.append('role', filters.role);
        if (filters?.userId) params.append('userId', filters.userId);
        if (filters?.search) params.append('search', filters.search);

        const queryString = params.toString();
        return api.get(`/reports/usuarios-inativos${queryString ? `?${queryString}` : ''}`);
    },

    /**
     * Busca faturamento
     */
    getFaturamento: (filters?: ReportFilters): Promise<AxiosResponse<ReportResponse<FaturamentoReport[]>>> => {
        const params = new URLSearchParams();
        if (filters?.startDate) params.append('startDate', filters.startDate);
        if (filters?.endDate) params.append('endDate', filters.endDate);
        if (filters?.status) params.append('status', filters.status);
        if (filters?.userId) params.append('userId', filters.userId);
        if (filters?.search) params.append('search', filters.search);

        const queryString = params.toString();
        return api.get(`/reports/faturamento${queryString ? `?${queryString}` : ''}`);
    },

    /**
     * Busca repasse
     */
    getRepasse: (filters?: ReportFilters): Promise<AxiosResponse<ReportResponse<RepasseReport[]>>> => {
        const params = new URLSearchParams();
        if (filters?.startDate) params.append('startDate', filters.startDate);
        if (filters?.endDate) params.append('endDate', filters.endDate);
        if (filters?.status) params.append('status', filters.status);
        if (filters?.userId) params.append('userId', filters.userId);
        if (filters?.search) params.append('search', filters.search);

        const queryString = params.toString();
        return api.get(`/reports/repasse${queryString ? `?${queryString}` : ''}`);
    },

    /**
     * Busca avaliações
     */
    getAvaliacoes: (filters?: ReportFilters): Promise<AxiosResponse<ReportResponse<AvaliacaoReport[]>>> => {
        const params = new URLSearchParams();
        if (filters?.startDate) params.append('startDate', filters.startDate);
        if (filters?.endDate) params.append('endDate', filters.endDate);
        if (filters?.status) params.append('status', filters.status);
        if (filters?.userId) params.append('userId', filters.userId);
        if (filters?.search) params.append('search', filters.search);

        const queryString = params.toString();
        return api.get(`/reports/avaliacoes${queryString ? `?${queryString}` : ''}`);
    },

    /**
     * Busca sessões
     */
    getSessoes: (filters?: ReportFilters): Promise<AxiosResponse<ReportResponse<SessaoReport[]>>> => {
        const params = new URLSearchParams();
        if (filters?.startDate) params.append('startDate', filters.startDate);
        if (filters?.endDate) params.append('endDate', filters.endDate);
        if (filters?.status) params.append('status', filters.status);
        if (filters?.userId) params.append('userId', filters.userId);
        if (filters?.search) params.append('search', filters.search);

        const queryString = params.toString();
        return api.get(`/reports/sessoes${queryString ? `?${queryString}` : ''}`);
    },

    /**
     * Busca agenda
     */
    getAgenda: (filters?: ReportFilters): Promise<AxiosResponse<ReportResponse<AgendaReport[]>>> => {
        const params = new URLSearchParams();
        if (filters?.startDate) params.append('startDate', filters.startDate);
        if (filters?.endDate) params.append('endDate', filters.endDate);
        if (filters?.status) params.append('status', filters.status);
        if (filters?.userId) params.append('userId', filters.userId);
        if (filters?.search) params.append('search', filters.search);

        const queryString = params.toString();
        return api.get(`/reports/agenda${queryString ? `?${queryString}` : ''}`);
    },

    /**
     * Busca resumo geral
     */
    getSummary: (filters?: ReportFilters): Promise<AxiosResponse<ReportResponse<ReportSummary>>> => {
        const params = new URLSearchParams();
        if (filters?.startDate) params.append('startDate', filters.startDate);
        if (filters?.endDate) params.append('endDate', filters.endDate);

        const queryString = params.toString();
        return api.get(`/reports/summary${queryString ? `?${queryString}` : ''}`);
    },
};

