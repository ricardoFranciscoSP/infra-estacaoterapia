/**
 * Serviço para buscar relatórios completos do admin
 */

import { api } from "@/lib/axios";

export interface ComprehensiveReportFilters {
    startDate?: string;
    endDate?: string;
    status?: string;
    role?: string;
    userId?: string;
    psicologoId?: string;
    pacienteId?: string;
    search?: string;
    planoId?: string;
    tipoPlano?: string;
}

export interface ComprehensiveReportResponse<T> {
    data: T[];
    total: number;
}

/**
 * 1) Relatório Base de Cadastro de Clientes Ativos e Inativos
 */
export interface ClienteCadastroData {
    [key: string]: unknown;
}

export async function getClientesCadastroReport(
    filters: ComprehensiveReportFilters = {},
    format?: "excel" | "pdf"
): Promise<Blob | ComprehensiveReportResponse<ClienteCadastroData>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value));
    });
    if (format) params.append("format", format);

    const response = await api.get(`/admin/reports/clientes-cadastro?${params.toString()}`, {
        responseType: format ? "blob" : "json",
    });

    return format ? response.data : response.data;
}

/**
 * 2) Relatório Base de Credenciamento de Psicólogos Ativos e Inativos
 */
export interface PsicologoCredenciamentoData {
    [key: string]: unknown;
}

export async function getPsicologosCredenciamentoReport(
    filters: ComprehensiveReportFilters = {},
    format?: "excel" | "pdf"
): Promise<Blob | ComprehensiveReportResponse<PsicologoCredenciamentoData>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value));
    });
    if (format) params.append("format", format);

    const response = await api.get(`/admin/reports/psicologos-credenciamento?${params.toString()}`, {
        responseType: format ? "blob" : "json",
    });

    return format ? response.data : response.data;
}

/**
 * 3) Relatório Aquisição e Movimentações de Planos
 */
export interface PlanoMovimentacaoData {
    [key: string]: unknown;
}

export async function getPlanosMovimentacaoReport(
    filters: ComprehensiveReportFilters = {},
    format?: "excel" | "pdf"
): Promise<Blob | ComprehensiveReportResponse<PlanoMovimentacaoData>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value));
    });
    if (format) params.append("format", format);

    const response = await api.get(`/admin/reports/planos-movimentacao?${params.toString()}`, {
        responseType: format ? "blob" : "json",
    });

    return format ? response.data : response.data;
}

/**
 * 4) Relatório Acesso à Plataforma e Reset de Senha – Cliente PF e Psicólogos
 */
export interface AcessoResetData {
    [key: string]: unknown;
}

export async function getAcessoResetReport(
    filters: ComprehensiveReportFilters = {},
    format?: "excel" | "pdf"
): Promise<Blob | ComprehensiveReportResponse<AcessoResetData>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value));
    });
    if (format) params.append("format", format);

    const response = await api.get(`/admin/reports/acesso-reset?${params.toString()}`, {
        responseType: format ? "blob" : "json",
    });

    return format ? response.data : response.data;
}

/**
 * 5) Relatório Sessões – Histórico Completo
 */
export interface SessaoHistoricoData {
    [key: string]: unknown;
}

export async function getSessoesHistoricoReport(
    filters: ComprehensiveReportFilters = {},
    format?: "excel" | "pdf"
): Promise<Blob | ComprehensiveReportResponse<SessaoHistoricoData>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value));
    });
    if (format) params.append("format", format);

    const response = await api.get(`/admin/reports/sessoes-historico?${params.toString()}`, {
        responseType: format ? "blob" : "json",
    });

    return format ? response.data : response.data;
}

/**
 * 6) Relatório Avaliações de Sessões
 */
export interface AvaliacaoSessaoData {
    [key: string]: unknown;
}

export async function getAvaliacoesSessoesReport(
    filters: ComprehensiveReportFilters = {},
    format?: "excel" | "pdf"
): Promise<Blob | ComprehensiveReportResponse<AvaliacaoSessaoData>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value));
    });
    if (format) params.append("format", format);

    const response = await api.get(`/admin/reports/avaliacoes-sessoes?${params.toString()}`, {
        responseType: format ? "blob" : "json",
    });

    return format ? response.data : response.data;
}

/**
 * 7) Relatório Transacional de Faturamento por Cliente PF
 */
export interface FaturamentoClienteData {
    [key: string]: unknown;
}

export async function getFaturamentoClienteReport(
    filters: ComprehensiveReportFilters = {},
    format?: "excel" | "pdf"
): Promise<Blob | ComprehensiveReportResponse<FaturamentoClienteData>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value));
    });
    if (format) params.append("format", format);

    const response = await api.get(`/admin/reports/faturamento-cliente?${params.toString()}`, {
        responseType: format ? "blob" : "json",
    });

    return format ? response.data : response.data;
}

/**
 * 8) Relatório Acesso à Plataforma e Reset de Senha – Psicólogo
 */
export interface AcessoResetPsicologoData {
    [key: string]: unknown;
}

export async function getAcessoResetPsicologoReport(
    filters: ComprehensiveReportFilters = {},
    format?: "excel" | "pdf"
): Promise<Blob | ComprehensiveReportResponse<AcessoResetPsicologoData>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value));
    });
    if (format) params.append("format", format);

    const response = await api.get(`/admin/reports/acesso-reset-psicologo?${params.toString()}`, {
        responseType: format ? "blob" : "json",
    });

    return format ? response.data : response.data;
}

/**
 * 9) Relatório Agenda do Psicólogo
 */
export interface AgendaPsicologoData {
    [key: string]: unknown;
}

export async function getAgendaPsicologoReport(
    filters: ComprehensiveReportFilters = {},
    format?: "excel" | "pdf"
): Promise<Blob | ComprehensiveReportResponse<AgendaPsicologoData>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value));
    });
    if (format) params.append("format", format);

    const response = await api.get(`/admin/reports/agenda-psicologo?${params.toString()}`, {
        responseType: format ? "blob" : "json",
    });

    return format ? response.data : response.data;
}

/**
 * 10) Relatório Carteira e Pagamento dos Psicólogos
 */
export interface CarteiraPagamentoPsicologoData {
    [key: string]: unknown;
}

export async function getCarteiraPagamentoPsicologoReport(
    filters: ComprehensiveReportFilters = {},
    format?: "excel" | "pdf"
): Promise<Blob | ComprehensiveReportResponse<CarteiraPagamentoPsicologoData>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value));
    });
    if (format) params.append("format", format);

    const response = await api.get(`/admin/reports/carteira-pagamento-psicologo?${params.toString()}`, {
        responseType: format ? "blob" : "json",
    });

    return format ? response.data : response.data;
}

/**
 * 11) Relatório de Objetivos do Onboarding dos Pacientes
 */
export interface OnboardingObjetivosData {
    [key: string]: unknown;
}

export async function getOnboardingObjetivosReport(
    filters: ComprehensiveReportFilters = {},
    format?: "excel" | "pdf"
): Promise<Blob | ComprehensiveReportResponse<OnboardingObjetivosData>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value));
    });
    if (format) params.append("format", format);

    const response = await api.get(`/admin/reports/onboarding-objetivos?${params.toString()}`, {
        responseType: format ? "blob" : "json",
    });

    return format ? response.data : response.data;
}
