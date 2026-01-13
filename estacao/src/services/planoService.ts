import { api } from "@/lib/axios";

export interface PlanoAssinaturaData {
    Nome: string;
    Descricao: string | Record<string, unknown> | Array<unknown>;
    Preco: number;
    Duracao: number;
    Tipo: string;
    Status?: string;
    Destaque?: boolean;
    VindiPlanId?: string;
    ProductId?: string;
}

export interface PlanoAssinatura extends PlanoAssinaturaData {
    Id: string;
    AdminId?: string;
    CreatedAt: string;
    UpdatedAt: string;
}

export const planoService = () => {
    return {
        getPlanosPaciente: () => api.get<PlanoAssinatura[]>('/planos/paciente'),
        getPlanos: () => api.get<PlanoAssinatura[]>('/planos'),
        getPlanosId: (id: string) => api.get<PlanoAssinatura>(`/planos/${id}`),
        createPlano: (data: PlanoAssinaturaData[]) => api.post<{ message: string; createdPlanos: PlanoAssinatura[]; failedPlanos: string[] }>('/planos', data),
        updatePlano: (id: string, data: Partial<PlanoAssinaturaData>) => api.put<{ message: string; updatedPlano: PlanoAssinatura }>(`/planos/${id}`, data),
        deletePlano: (id: string) => api.delete<{ message: string }>(`/planos/${id}`),
    };
}