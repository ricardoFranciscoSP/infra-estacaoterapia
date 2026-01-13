// services/auditoriaService.ts
import { api } from "@/lib/axios";
import { AxiosResponse } from "axios";
import { AuditoriaItem, FiltrosAuditoria, PaginatedAuditResult } from "@/types/auditoria";

export interface AuditListResponse {
    success: boolean;
    data: PaginatedAuditResult;
}

export const auditoriaService = {
    /**
     * Busca registros de auditoria com filtros e paginação
     * @param filtros Objeto com filtros e paginação
     * @returns Promise com resposta paginada
     */
    async list(filtros: FiltrosAuditoria = {}): Promise<AxiosResponse<{ success: boolean; data: PaginatedAuditResult }>> {
        const queryParams = new URLSearchParams();
        
        if (filtros.page) queryParams.append('page', filtros.page.toString());
        if (filtros.limit) queryParams.append('limit', filtros.limit.toString());
        if (filtros.actionType) queryParams.append('actionType', filtros.actionType);
        if (filtros.module) queryParams.append('module', filtros.module);
        if (filtros.status) queryParams.append('status', filtros.status);
        if (filtros.userId) queryParams.append('userId', filtros.userId);
        if (filtros.search) queryParams.append('search', filtros.search);
        if (filtros.startDate) queryParams.append('startDate', filtros.startDate);
        if (filtros.endDate) queryParams.append('endDate', filtros.endDate);

        const queryString = queryParams.toString();
        return api.get(`/audit${queryString ? `?${queryString}` : ''}`);
    },

    /**
     * Busca um registro de auditoria por ID
     * @param id ID do registro
     * @returns Promise com registro de auditoria
     */
    async getById(id: string): Promise<AxiosResponse<{ success: boolean; data: AuditoriaItem }>> {
        return api.get(`/audit/${id}`);
    },

    /**
     * Exporta registros de auditoria para CSV
     * @param registros Array de registros a serem exportados
     * @returns String CSV
     */
    exportarParaCSV(registros: AuditoriaItem[]): string {
        const headers = ["ID", "Data/Hora", "Usuário ID", "Módulo", "Ação", "Detalhes", "IP", "Status"];
        const rows = registros.map((item) => {
            const timestamp = typeof item.Timestamp === 'string' 
                ? new Date(item.Timestamp).toLocaleString('pt-BR')
                : item.Timestamp.toLocaleString('pt-BR');
            return [
                item.Id,
                timestamp,
                item.UserId,
                item.Module,
                item.ActionType,
                item.Description,
                item.IpAddress || '-',
                item.Status || '-',
            ];
        });

        const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell)}"`).join(",")).join("\n");
        return csv;
    },

    /**
     * Baixa arquivo CSV
     * @param registros Array de registros a serem exportados
     * @param nomeArquivo Nome do arquivo (padrão: auditoria.csv)
     */
    baixarCSV(registros: AuditoriaItem[], nomeArquivo = "auditoria.csv"): void {
        const csv = this.exportarParaCSV(registros);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", nomeArquivo);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    /**
     * Exporta registros de auditoria para Excel usando o endpoint do backend
     * @param filtros Filtros aplicados na busca
     */
    async exportarParaExcel(filtros: FiltrosAuditoria = {}): Promise<void> {
        try {
            const queryParams = new URLSearchParams();
            
            if (filtros.actionType) queryParams.append('actionType', filtros.actionType);
            if (filtros.module) queryParams.append('module', filtros.module);
            if (filtros.status) queryParams.append('status', filtros.status);
            if (filtros.userId) queryParams.append('userId', filtros.userId);
            if (filtros.search) queryParams.append('search', filtros.search);
            if (filtros.startDate) queryParams.append('startDate', filtros.startDate);
            if (filtros.endDate) queryParams.append('endDate', filtros.endDate);

            const queryString = queryParams.toString();
            const response = await api.get(`/audit/export/excel${queryString ? `?${queryString}` : ''}`, {
                responseType: 'blob',
            });

            const blob = new Blob([response.data], { 
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `relatorio_auditoria_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Erro ao exportar para Excel:', error);
            throw error;
        }
    },

    /**
     * Exporta registros de auditoria para PDF usando o endpoint do backend
     * @param filtros Filtros aplicados na busca
     */
    async exportarParaPDF(filtros: FiltrosAuditoria = {}): Promise<void> {
        try {
            const queryParams = new URLSearchParams();
            
            if (filtros.actionType) queryParams.append('actionType', filtros.actionType);
            if (filtros.module) queryParams.append('module', filtros.module);
            if (filtros.status) queryParams.append('status', filtros.status);
            if (filtros.userId) queryParams.append('userId', filtros.userId);
            if (filtros.search) queryParams.append('search', filtros.search);
            if (filtros.startDate) queryParams.append('startDate', filtros.startDate);
            if (filtros.endDate) queryParams.append('endDate', filtros.endDate);

            const queryString = queryParams.toString();
            const response = await api.get(`/audit/export/pdf${queryString ? `?${queryString}` : ''}`, {
                responseType: 'blob',
            });

            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `relatorio_auditoria_${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Erro ao exportar para PDF:', error);
            throw error;
        }
    },
};
