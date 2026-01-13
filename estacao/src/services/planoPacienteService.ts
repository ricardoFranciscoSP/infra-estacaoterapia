import { api } from "@/lib/axios";
import { Plano } from "@/store/planoStore";
import type { PrimeiraCompraDTO } from "@/hooks/primeiraConsultaHook";

export interface CancelarPlanoPayload {
    assinaturaPlanoId: string;
}

export interface UpgradePlanoPayload {
    assinaturaPlanoAtualId: string;
    novoPlanoId: string;
    tokenObj?: {
        gateway_token: string;
        payment_company_code: string;
    };
    companyInfo?: {
        payment_company_code: string;
        payment_company_id: number;
    };
}

export interface DowngradePlanoPayload {
    assinaturaPlanoAtualId: string;
    novoPlanoId: string;
    tokenObj?: {
        gateway_token: string;
        payment_company_code: string;
    };
    companyInfo?: {
        payment_company_code: string;
        payment_company_id: number;
    };
}

export const pacientePlanoService = () => {
    return {
        getPlanos: () => api.get('/compra-planos'),
        comprarPlano: (plano: Plano) => api.post('/compra-planos', plano),
        cancelarPlano: (payload: CancelarPlanoPayload) => api.post('/compra-planos/cancelar', payload),
        upgradePlano: (payload: UpgradePlanoPayload) => api.post('/compra-planos/upgrade', payload),
        downgradePlano: (payload: DowngradePlanoPayload) => api.post('/compra-planos/downgrade', payload),
        primeiraCompra: (dados: PrimeiraCompraDTO) => api.post('/primeira-consulta/comprar', dados),
        getPrimeiraCompra: () => api.get('/primeira-consulta/verificar'),
        getPlanosId: (id: string) => api.get(`/planos/${id}`),
    };
}
