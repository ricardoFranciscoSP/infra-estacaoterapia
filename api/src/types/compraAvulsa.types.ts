export interface CreateCompraAvulsa {
    userId: string;
    planoId: string;
    quantidade: number;
    valor: number;
    metodoPagamento: string;
}