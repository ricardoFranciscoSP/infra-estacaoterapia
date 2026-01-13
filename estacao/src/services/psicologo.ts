import { api } from "@/lib/axios";

export const psicologoService = () => {
    return {
        getPsicologo: () => api.get('/psicologos'),
        getPsicologoAtivos: () => api.get('/psicologos/ativos-resumo'),
        getPsicologoId: (id: string) => api.get(`/psicologos/${id}`),
        getPsicologoByFilter: (queryString: string) => api.get(`/psicologos/filter?${queryString}`),
    };
}