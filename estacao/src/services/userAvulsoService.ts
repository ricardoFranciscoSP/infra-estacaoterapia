import { api } from "@/lib/axios";

export interface ConsultaAvulsa {
    Id: string;
    UserId: string;
    Data: string;
    Status: string;
    Valor: number;
    Quantidade: number;
    CreatedAt: string;
    UpdatedAt: string;
}

export interface CreditoAvulso {
    Id: string;
    UserId: string;
    Quantidade: number;
    Status: string;
    Valor: number;
    CreatedAt: string;
    UpdatedAt: string;
    diasRestantes?: number;
    ValidUntil?: string;
}

export async function getConsultaAvulsa(): Promise<ConsultaAvulsa[]> {
    const { data } = await api.get('/users/consulta-avulsa');
    return data;
}

export async function getCreditoAvulso(): Promise<CreditoAvulso[]> {
    const { data } = await api.get('/users/credito-avulso');
    return data;
}
