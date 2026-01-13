// Tipos para o módulo administrativo financeiro

export type ControleFinanceiroStatus = 
  | 'AguardandoPagamento'
  | 'Cancelado'
  | 'EmMonitoramento'
  | 'Reprovado'
  | 'Aprovado'
  | 'EmDisputa'
  | 'Chargeback'
  | 'Multa';

export type FinanceiroPsicologoStatus = 
  | 'pendente'
  | 'processando'
  | 'aprovado'
  | 'cancelado'
  | 'retido'
  | 'pago'
  | 'PagamentoEmAnalise';

export type TipoFatura = 
  | 'Mensal'
  | 'Trimestral'
  | 'Semestral'
  | 'Anual'
  | 'Avulso'
  | 'Multa'
  | 'Primeira';

// Financeiro (pagamentos de pacientes)
export interface Financeiro {
  Id: string;
  UserId: string;
  PlanoAssinaturaId: string | null;
  Valor: number;
  DataVencimento: string;
  Status: ControleFinanceiroStatus;
  FaturaId: string | null;
  Tipo: TipoFatura;
  CreatedAt: string;
  UpdatedAt: string;
  CicloPlanoId: string | null;
  PlanoAssinatura?: {
    Id: string;
    Nome: string;
  };
  Fatura?: {
    Id: string;
    CodigoFatura: string | null;
    DataEmissao: string;
    DataVencimento: string;
    Status: string;
  };
  User?: {
    Id: string;
    Nome: string;
    Email: string;
  };
}

// FinanceiroPsicologo (pagamentos para psicólogos)
export interface FinanceiroPsicologo {
  Id: string;
  UserId: string;
  Periodo: string | null;
  ConsultasRealizadas: number | null;
  DataPagamento: string | null;
  Valor: number;
  Status: FinanceiroPsicologoStatus;
  DataVencimento: string;
  UrlDocumentoStorage: string | null;
  Tipo: string;
  CreatedAt: string;
  UpdatedAt: string;
  User?: {
    Id: string;
    Nome: string;
    Email: string;
    CRP?: string;
  };
  ReservaSessao?: Array<{
    Id: string;
    DataConsulta: string;
  }>;
}

// Psicólogo com informações financeiras
export interface PsicologoFinanceiro {
  Id: string;
  Nome: string;
  Email: string;
  CRP: string | null;
  Status: string;
  TipoPessoa: 'Autônomo' | 'Pessoa Jurídica';
  SaldoDisponivel: number;
  SaldoRetido: number;
  TotalPago: number;
  TotalPendente: number;
  TotalReprovado: number;
  UltimoPagamento: string | null;
  DocumentosPendentes: number;
  FormularioSaqueCompleto: boolean;
  ProfessionalProfileId: string | null;
}

// Relatório Financeiro
export interface RelatorioFinanceiro {
  periodo: {
    inicio: string;
    fim: string;
  };
  resumo: {
    totalEntradas: number;
    totalSaidas: number;
    totalRepasses: number;
    saldoLiquido: number;
  };
  porStatus: {
    aprovado: number;
    pendente: number;
    reprovado: number;
    processando: number;
  };
  porPsicologo: Array<{
    psicologoId: string;
    nome: string;
    totalPago: number;
    totalPendente: number;
    consultas: number;
  }>;
  porPeriodo: Array<{
    mes: number;
    ano: number;
    entradas: number;
    saidas: number;
  }>;
}

// Filtros para relatórios
export interface FiltroRelatorio {
  dataInicio?: string;
  dataFim?: string;
  psicologoId?: string;
  status?: FinanceiroPsicologoStatus | ControleFinanceiroStatus;
  tipo?: TipoFatura | string;
}

// DTOs para operações
export interface AprovarPagamentoDTO {
  financeiroPsicologoId: string;
  observacoes?: string;
  dataPagamento?: string;
}

export interface ReprovarPagamentoDTO {
  financeiroPsicologoId: string;
  motivo: string;
}

export interface BaixarPagamentoDTO {
  financeiroPsicologoId: string;
  comprovanteUrl?: string;
  observacoes?: string;
}

// Notificação administrativa
export interface NotificacaoFinanceira {
  Id: string;
  Tipo: 'Aprovacao' | 'Reprovacao' | 'Pendencia' | 'Documento';
  Titulo: string;
  Mensagem: string;
  PsicologoId: string;
  PsicologoNome: string;
  FinanceiroPsicologoId?: string;
  CreatedAt: string;
  Lida: boolean;
}

// Documento fiscal
export interface DocumentoFiscal {
  Id: string;
  PsicologoId: string;
  PsicologoNome: string;
  Tipo: 'NotaFiscal' | 'Recibo' | 'Comprovante' | 'Outro';
  Url: string;
  NomeArquivo: string;
  Status: 'Pendente' | 'Aprovado' | 'Reprovado';
  Observacoes?: string;
  CreatedAt: string;
  UpdatedAt: string;
}

// Estatísticas do dashboard
export interface EstatisticasFinanceiras {
  totalPsicologos: number;
  psicologosPagos: number;
  psicologosPendentes: number;
  psicologosReprovados: number;
  totalEntradas: number;
  totalSaidas: number;
  totalRepasses: number;
  saldoLiquido: number;
  pedidosSaquePendentes: number;
  documentosPendentes: number;
}

// Resposta da API
export interface FinanceiroResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Paginação
export interface Paginacao {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ListaPaginada<T> {
  items: T[];
  paginacao: Paginacao;
}

