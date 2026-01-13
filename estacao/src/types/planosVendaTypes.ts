export interface PlanoVendaResponse {
    id: string;
    nome: string;
    descricao?: string[];
    preco: number;
    type: string;
    status: string;
    duracao: number;
    destaque?: boolean;
}

export interface Planos {
    Id: string;
    Nome: string;
    Descricao?: string[];
    Preco: number;
    Status: string;
    ProductId: string;
    VindiPlanId: string;
    Tipo: string;
    Type?: string; // compatível com Plano
    Duracao?: number; // compatível com Plano
}

export interface PlanosResponse {
    data: Planos[];
    total: number;
    page: number;
    limit: number;
}
