import { api } from "@/lib/axios";

export interface InfoSimplesNomePayload {
    nome: string;
    uf: string;
    registro?: string;
}

export interface InfoSimplesApiResponse {
    success: boolean;
    data?: Record<string, unknown>;
    header?: Record<string, unknown>;
    siteReceipts?: string[];
    error?: {
        code?: number;
        message?: string;
        details?: string[];
    };
}

export const infoSimplesService = () => {
    return {
        consultarPorNome: (payload: InfoSimplesNomePayload) =>
            api.post<InfoSimplesApiResponse>("/infosimples/consultar-nome", payload),
    };
};
