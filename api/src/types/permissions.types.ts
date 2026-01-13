// src/enums/permissions.ts
export enum Module {
    Users = 'Users',
    Reports = 'Reports',
    Plans = 'Plans',
    Payments = 'Payments',
    Sessions = 'Sessions',
    Profiles = 'Profiles',
    Evaluations = 'Evaluations',
    Onboarding = 'Onboarding',
    Finance = 'Finance',
    Agenda = 'Agenda',
    Notifications = 'Notifications',
    Promotions = 'Promotions',
    SystemSettings = 'SystemSettings',
    Psychologists = 'Psychologists',
    Patients = 'Patients',
    Clients = 'Clients',
    Contracts = 'Contracts',
    Reviews = 'Reviews',
    Cancelamentos = 'Cancelamentos',
    WorkSchedule = 'WorkSchedule',
    RedesSociais = 'RedesSociais',
    Faq = 'Faq',
    Configuracoes = 'Configuracoes',
    Permission = 'Permission',
    Admin = 'Admin',
}

export enum ActionType {
    Read = 'Read',
    Create = 'Create',
    Update = 'Update',
    Delete = 'Delete',
    Manage = 'Manage',
    Approve = 'Approve',
}

export enum Role {
    Admin = 'Admin',
    Patient = 'Patient',
    Psychologist = 'Psychologist',
    Management = 'Management',
    Finance = 'Finance',
}

export enum AgendaStatus {
    Disponivel = 'Disponivel',
    Indisponivel = 'Indisponivel',
    Bloqueado = 'Bloqueado',
    Reservado = 'Reservado',
    Cancelado = 'Cancelado',
    Andamento = 'Andamento',
    Concluido = 'Concluido',
    Cancelled_by_patient = 'Cancelled_by_patient',
    Cancelled_by_psychologist = 'Cancelled_by_psychologist',
    Cancelled_no_show = 'Cancelled_no_show',
    Reagendada = 'Reagendada'
}

export type Consulta = {
    Id: string;
    Status: string;
    CreatedAt: Date;
    UpdatedAt: Date;
    PsicologoId: string | null;
    PacienteId: string | null;
    Date: Date;
    Time: string;
    GoogleEventId: string | null;
    AgendaId: string | null;
}

export type RedesSociais = {
    Id: string;
    CreatedAt: Date;
    UpdatedAt: Date;
    Facebook: string | null;
    Instagram: string | null;
    Linkedin: string | null;
    X: string | null;
    Tiktok: string | null;
    Youtube: string | null;
}

export enum ConsultaAvulsaStatus {
    Ativa = 'Ativa',
    Concluida = 'Concluida',
    Cancelada = 'Cancelada',
    Expirada = 'Expirada',
    Pendente = 'Pendente',
}

export enum TipoFatura {
    ConsultaAvulsa = 'ConsultaAvulsa',
    Plano = 'Plano',
    PrimeiraConsulta = 'PrimeiraConsulta'
}

export enum FaturaStatus {
    Paid = "Paid",
    Pending = "Pending",
    Failed = "Failed",
    Canceled = "Canceled"
}

export enum AutorTipoCancelamento {
    Paciente = "Paciente",
    Psicologo = "Psicologo",
    Admin = "Admin",
    Management = "Management",
    Sistema = "Sistema"
}

export type PermissionData = {
    id?: string;
    module: Module;
    action: ActionType;
    role: Role;
};

export enum ControleFinanceiroStatus {
    AguardandoPagamento = 'AguardandoPagamento',
    Cancelado = 'Cancelado',
    EmMonitoramento = 'EmMonitoramento',
    Reprovado = 'Reprovado',
    Aprovado = 'Aprovado',
    EmDisputa = 'EmDisputa',
    Chargeback = 'Chargeback',
    Multa = 'Multa'
}

export type Financeiro = {
    Id: string;
    UserId: string;
    PlanoAssinaturaId: string | null;
    Valor: number;
    DataVencimento: Date;
    Status: ControleFinanceiroStatus;
    FaturaId: string | null;
    Tipo: TipoFatura;
    CreatedAt: Date;
    UpdatedAt: Date;
}

export type User = {
    id: string;
    nome: string;
    email: string;
    cpf: string;
    crp: string | null;
    telefone: string;
    dataNascimento: Date;
    password: string;
    role: Role
}
