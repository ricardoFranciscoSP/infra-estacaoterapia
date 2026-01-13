export interface Financeiro {
    Id: string;
    PlanoAssinaturaId: string;
    Valor: number;
    Status: string;
    FaturaId: string;
    DataVencimento: string;
    CreatedAt?: string;
    Tipo: string;
    PlanoAssinatura?: {
        Nome: string;
    };
    Fatura?: {
        Id: string;
        DataEmissao: string;
        DataVencimento: string;
        Status: string;
    };
}

export interface PagamentoResponse {
    pagamentos: Financeiro[];
}
