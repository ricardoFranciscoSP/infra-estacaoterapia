// Tipos para AssinaturaPlano e CicloPlano

export type PlanoStatus = 'Ativo' | 'Cancelado' | 'AguardandoPagamento' | 'Pendente';
export type CicloStatus = 'Ativo' | 'Pendente' | 'Cancelado' | 'Expirado';

export interface ControleConsultaMensalType {
    Id: string;
    AssinaturaPlanoId: string;
    UserId: string;
    MesReferencia: number;
    AnoReferencia: number;
    ConsultasDisponiveis: number;
    ConsultasUsadas: number;
    Status: string;
    Validade: Date | null;
    CreatedAt: Date;
    UpdatedAt: Date;
}

export interface FinanceiroType {
    Id: string;
    UserId: string;
    PlanoAssinaturaId: string | null;
    Valor: number;
    DataVencimento: Date;
    Status: string;
    FaturaId: string | null;
    CicloPlanoId?: string | null;
    Tipo: string;
    CreatedAt: Date;
    UpdatedAt: Date;
}

export interface CicloPlanoType {
    Id: string;
    AssinaturaPlanoId: string;
    UserId: string;
    CicloInicio: Date | string;
    CicloFim: Date | string;
    Status: CicloStatus;
    ConsultasDisponiveis: number;
    ConsultasUsadas: number;
    CreatedAt: Date | string;
    UpdatedAt: Date | string;
    ControleConsultaMensal: ControleConsultaMensalType[];
    Financeiro: FinanceiroType[];
}

export interface PlanoAssinaturaType {
    Id: string;
    Nome: string;
    Descricao: string[];
    Preco: number;
    Duracao: number;
    Tipo: string;
    Status: string;
    Destaque: boolean | null;
    VindiPlanId: string | null;
    ProductId: string | null;
    CreatedAt: Date;
    UpdatedAt: Date;
}

export interface AssinaturaPlanoType {
    Id: string;
    UserId: string;
    PlanoAssinaturaId: string;
    DataInicio: Date | string;
    DataFim: Date | string | null;
    Status: PlanoStatus;
    VindiSubscriptionId: string | null;
    CreatedAt: Date | string;
    UpdatedAt: Date | string;
    Ciclos: CicloPlanoType[];
    ControleConsultaMensal: ControleConsultaMensalType[];
    Financeiro: FinanceiroType[];
    PlanoAssinatura: PlanoAssinaturaType | null;
}

