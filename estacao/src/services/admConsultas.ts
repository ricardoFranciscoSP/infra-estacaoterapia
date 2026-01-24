import { api } from "@/lib/axios";

export const admConsultasService = () => {
    return {
        getConsultasRealizadas: () => api.get('/admin/consultas/realizadas'),
        getConsultasMensais: () => api.get('/admin/consultas/mensais'),
        getConsultasMensaisTodas: () => api.get('/admin/consultas/mensais-todas'),
        getConsultasCanceladas: () => api.get('/admin/consultas/canceladas'),
        getConsultasMesAtual: () => api.get('/admin/consultas/mes-atual'),
        getConsultasMesAtualLista: () => api.get('/admin/consultas/mes-atual-lista'),
        getConsultasPorData: (date: string) => api.get('/admin/consultas/por-data', { params: { date } }),
        getConsultasLista: (params?: { page?: number; limit?: number; status?: string }) =>
            api.get('/admin/consultas/lista', { params }),
        updateConsultaStatus: (
            id: string,
            payload: { status: string; repasse?: boolean; devolverSessao?: boolean }
        ) => api.patch(`/admin/consultas/${id}/status`, payload),
    };
}