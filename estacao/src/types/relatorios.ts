export type Role = "Admin" | "Patient" | "Psychologist" | "Management" | "Finance";
export type UserStatus = "Ativo" | "Inativo" | "Bloqueado" | "Pendente" | "Deletado" | "EmAnalise" | "EmAnaliseContrato";
export type ConsultaStatus = 
    | "Agendada"
    | "EmAndamento"
    | "Realizada"
    | "PacienteNaoCompareceu"
    | "PsicologoNaoCompareceu"
    | "CanceladaPacienteNoPrazo"
    | "CanceladaPsicologoNoPrazo"
    | "ReagendadaPacienteNoPrazo"
    | "ReagendadaPsicologoNoPrazo"
    | "CanceladaPacienteForaDoPrazo"
    | "CanceladaPsicologoForaDoPrazo"
    | "CanceladaForcaMaior"
    | "CanceladaNaoCumprimentoContratualPaciente"
    | "ReagendadaPsicologoForaDoPrazo"
    | "CanceladaNaoCumprimentoContratualPsicologo"
    | "PsicologoDescredenciado"
    | "CanceladoAdministrador"
    | "Reservado"
    | "Cancelado";
export type PlanoCompraStatus = "AguardandoPagamento" | "Ativo" | "Expirado" | "Cancelado";
export type ControleFinanceiroStatus = 
    | "AguardandoPagamento"
    | "Cancelado"
    | "EmMonitoramento"
    | "Reprovado"
    | "Aprovado"
    | "EmDisputa"
    | "Chargeback"
    | "Multa";

export interface ReportFilters {
    startDate?: string;
    endDate?: string;
    status?: string;
    role?: Role;
    userId?: string;
    search?: string;
}

export interface UsuarioAtivoReport {
    Id: string;
    Nome: string;
    Email: string;
    Role: Role;
    Status: UserStatus;
    DataNascimento: string | null;
    Telefone: string;
    CreatedAt: string;
    LastLogin: string | null;
    TotalConsultas: number;
    PlanoAtivo?: {
        Nome: string;
        Status: PlanoCompraStatus;
    } | null;
}

export interface PlanoReport {
    Id: string;
    Nome: string;
    Preco: number;
    Duracao: number;
    Tipo: string;
    Status: string;
    TotalAssinaturas: number;
    AssinaturasAtivas: number;
    AssinaturasInativas: number;
    ReceitaTotal: number;
    CreatedAt: string;
}

export interface UsuarioInativoReport {
    Id: string;
    Nome: string;
    Email: string;
    Role: Role;
    Status: UserStatus;
    CreatedAt: string;
    LastLogin: string | null;
    DiasInativo: number;
    TotalConsultas: number;
}

export interface FaturamentoReport {
    Id: string;
    UserId: string;
    NomeUsuario: string;
    Email: string;
    Valor: number;
    DataVencimento: string;
    Status: ControleFinanceiroStatus;
    Tipo: string;
    FaturaId: string | null;
    CreatedAt: string;
    PlanoNome?: string | null;
}

export interface RepasseReport {
    Id: string;
    PsicologoId: string;
    NomePsicologo: string;
    Email: string;
    Periodo: string | null;
    ConsultasRealizadas: number | null;
    Valor: number;
    Status: string;
    DataPagamento: string | null;
    DataVencimento: string;
    Tipo: string;
    CreatedAt: string;
}

export interface AvaliacaoReport {
    Id: string;
    PsicologoId: string;
    NomePsicologo: string;
    PacienteId: string | null;
    NomePaciente: string | null;
    Rating: number;
    Comentario: string | null;
    Status: string;
    MostrarNaHome: boolean | null;
    MostrarNaPsicologo: boolean | null;
    CreatedAt: string;
}

export interface SessaoReport {
    Id: string;
    Date: string;
    Time: string;
    Status: ConsultaStatus;
    PacienteId: string | null;
    NomePaciente: string | null;
    PsicologoId: string | null;
    NomePsicologo: string | null;
    Valor: number | null;
    Faturada: boolean;
    CreatedAt: string;
}

export interface AgendaReport {
    Id: string;
    Data: string;
    Horario: string;
    DiaDaSemana: string;
    Status: string;
    PsicologoId: string;
    NomePsicologo: string;
    PacienteId: string | null;
    NomePaciente: string | null;
    CreatedAt: string;
}

export interface ReportSummary {
    totalUsuariosAtivos: number;
    totalUsuariosInativos: number;
    totalPlanos: number;
    totalFaturamento: number;
    totalRepasse: number;
    totalAvaliacoes: number;
    totalSessoes: number;
    totalAgendamentos: number;
}

export type ReportType = 
    | "usuarios-ativos"
    | "planos"
    | "usuarios-inativos"
    | "faturamento"
    | "repasse"
    | "avaliacoes"
    | "sessoes"
    | "agenda";

export interface ReportResponse<T> {
    success: boolean;
    data: T;
}

