import { api } from "@/lib/axios";
import { AxiosResponse } from "axios";

export interface GerarAgendaResultado {
    psicologoId: string;
    criados?: number;
    error?: string;
}

export interface GerarAgendaResponse {
    message: string;
    resultados: GerarAgendaResultado[];
}

export const gerarAgendaService = {
    // Gerar agenda manualmente
    gerarManual: (): Promise<AxiosResponse<GerarAgendaResponse>> => 
        api.post('/agenda/gerar-manual'),
};

