import { api } from "@/lib/axios";
import { Fatura } from "@/store/controleFaturaStore";

export const controleFaturaService = () => {
    return {
        criarControleFatura: (data: Omit<Fatura, 'Id' | 'CreatedAt' | 'UpdatedAt'>) => api.post('/controle-fatura', data),
        updateStatus: (id: string, status: { status: string }) => api.put(`/controle-fatura/${id}/status`, status),
        getById: (id: string) => api.get(`/controle-fatura/${id}`),
        getByUserId: (userId: string) => api.get(`/controle-fatura/user/${userId}`),
        listar: () => api.get('/controle-fatura'),
        delete: (id: string) => api.delete(`/controle-fatura/${id}`),
    };
}