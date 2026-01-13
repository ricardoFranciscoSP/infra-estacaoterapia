import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Financeiro } from '@/types/financeiroTypes';

export interface ControleConsultaMensal {
    Id?: string;
    Status: string;
    MesReferencia: number;
    AnoReferencia: number;
    CicloPlanoId?: string;
    CreatedAt?: string;
    UpdatedAt?: string;
}

export interface Consulta {
    Id: string;
    Status: string;
    DataConsulta?: string;
    CreatedAt?: string;
    UpdatedAt?: string;
}

export interface CicloPlano {
    Id: string;
    AssinaturaPlanoId: string;
    UserId: string;
    CicloInicio: string;
    CicloFim: string;
    Status: string;
    ConsultasDisponiveis: number;
    ConsultasUsadas: number;
    ControleConsultaMensal?: ControleConsultaMensal[];
    Financeiro?: Financeiro[];
    Consultas?: Consulta[];
}

export function useCiclosPlano(assinaturaPlanoId: string | null | undefined) {
    return useQuery<CicloPlano[]>({
        queryKey: ['ciclos-plano', assinaturaPlanoId],
        queryFn: async () => {
            if (!assinaturaPlanoId) return [];
            const response = await api.get(`/ciclos/assinatura/${assinaturaPlanoId}`);
            return response.data.ciclos || [];
        },
        enabled: !!assinaturaPlanoId,
        staleTime: 5 * 60 * 1000,
    });
}

export function useCicloAtivo(assinaturaPlanoId: string | null | undefined) {
    return useQuery<CicloPlano | null>({
        queryKey: ['ciclo-ativo', assinaturaPlanoId],
        queryFn: async () => {
            if (!assinaturaPlanoId) return null;
            const response = await api.get(`/ciclos/assinatura/${assinaturaPlanoId}/ativo`);
            return response.data.ciclo || null;
        },
        enabled: !!assinaturaPlanoId,
        staleTime: 2 * 60 * 1000,
    });
}

