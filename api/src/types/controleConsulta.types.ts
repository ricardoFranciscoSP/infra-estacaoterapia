export type ControleConsultaStatus = 'Ativo' | 'AguardandoPagamento' | 'Completo';

export interface ControleConsultaJobData {
    controleConsultaId: string;
    assinaturaPlanoId: string;
    mesReferencia: string;
    validade: Date;
    saldoConsultas: number;
    status: ControleConsultaStatus;
    usuarioId: string;
}

export interface RenovacaoJobData {
    controleConsultaId: string;
    usuarioId: string;
    assinaturaPlanoId: string;
    mesReferencia: string;
}

export interface PagamentoJobData {
    controleConsultaId: string;
    usuarioId: string;
    assinaturaPlanoId: string;
    mesReferencia: string;
    faturaId: string;
    valor?: number;
    dataEmissao?: string;
    dataVencimento?: string;
    tipo?: string;
    customerId?: string;
}

export interface NotificacaoJobData {
    usuarioId: string;
    mensagem: string;
    validade: Date;
}
