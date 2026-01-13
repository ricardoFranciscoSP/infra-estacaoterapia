export interface IFinanceiroService {
    calcularPagamento(psicologoId: string, filtro?: { mes?: number; ano?: number }): Promise<{ totalPagamento: number; periodo: string; }>;
    gerarRelatorioFinanceiro(): Promise<string>;
    processarPagamento(psicologoId: string, valorSolicitado: number): Promise<boolean>;
}


