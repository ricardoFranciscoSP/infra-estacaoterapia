export type StatusPagamento = "pendente" | "pago" | "cancelado" | "falha";

export interface ControleFinanceiro {
    id: string;
    userId: string;
    planoCompraId?: string;
    valor: number;
    statusPagamento: StatusPagamento;
    recorrenciaId?: string;
    dataFim?: Date;
    // ...outros campos relevantes...
}
