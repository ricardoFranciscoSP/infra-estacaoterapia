export interface IConfirmarPagamentoDTO {
    controleFinanceiroId: string;
    statusPagamento: string;
    transacaoId?: string;
}

export interface IAtualizarStatusRecorrenciaDTO {
    recorrenciaId: string;
    statusPagamento: string;
}

export interface IControleFinanceiroService {
    confirmarPagamento(data: IConfirmarPagamentoDTO): Promise<any>;
    atualizarStatusRecorrencia(data: IAtualizarStatusRecorrenciaDTO): Promise<any>;
    listarPagamentos(userId: string): Promise<any[]>;
    excluirPagamento(controleFinanceiroId: string): Promise<void>;
    verificarEAtualizarStatus(): Promise<number>;
}
