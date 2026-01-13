// Enums alinhados ao Prisma
export enum Sexo {
    Masculino = "Masculino",
    Feminino = "Feminino",
    NaoBinario = "NaoBinario",
    PrefiroNaoDeclarar = "PrefiroNaoDeclarar"
}

export enum UserStatus {
    Ativo = "Ativo",
    Inativo = "Inativo",
    Bloqueado = "Bloqueado",
    Pendente = "Pendente",
    Deletado = "Deletado",
    EmAnalise = "EmAnalise"
}

export enum Role {
    Admin = "Admin",
    Patient = "Patient",
    Psychologist = "Psychologist",
    Management = "Management"
}

// Endereço residencial do paciente (conforme Address[])
export interface Address {
    Id: string;
    UserId?: string;
    Rua: string;
    Numero: string;
    Complemento?: string;
    Bairro: string;
    Cidade: string;
    Estado: string;
    Cep: string;
    CreatedAt: string;
    UpdatedAt: string;
}

// Endereço de cobrança (BillingAddress[])
export interface BillingAddress {
    Id: string;
    UserId?: string;
    Rua: string;
    Numero: string;
    Complemento?: string;
    Bairro: string;
    Cidade: string;
    Estado: string;
    Cep: string;
    CreatedAt: string;
    UpdatedAt: string;
}

// Imagem do paciente
export interface Image {
    Id: string;
    Url: string;
    CreatedAt: string;
    UpdatedAt: string;
}

// Avaliação feita pelo paciente
export interface Review {
    Id: string;
    UserId?: string;
    PsicologoId?: string;
    Rating?: number;
    Comentario?: string;
    Status?: string;
    CreatedAt?: string;
    UpdatedAt?: string;
}

// Notificação
export interface NotificationStatus {
    Id: string;
    UserId: string;
    Status: string;
    Tipo: string | null;
    NotificationId: string;
    CreatedAt: string;
    UpdatedAt: string;
}

// Onboarding
export interface Onboarding {
    Id: string;
    UserId: string;
    Step: string;
    Completed: boolean;
    CreatedAt: string;
    UpdatedAt: string;
}

// RefreshToken
export interface RefreshToken {
    Id: string;
    UserId: string;
    Token: string;
    ExpiresAt: string;
    Status: string;
    RevokedAt: string | null;
    CreatedAt: string;
    UpdatedAt: string;
}

// Consulta do paciente
export interface ConsultaPaciente {
    Id: string;
    // Adicione outros campos conforme necessário
    Data?: string;
    Profissional?: string;
    Status?: string;
}

// Dados principais do paciente (conforme objeto retornado)
export interface Paciente {
    Id: string;
    Nome: string;
    Email: string;
    Cpf: string;
    Crp?: string | null;
    GoogleId?: string | null;
    Telefone: string;
    DataNascimento?: string | null;
    Sexo?: Sexo | null;
    TermsAccepted: boolean;
    PrivacyAccepted: boolean;
    Status: UserStatus | string;
    Role: Role | string;
    IsOnboard: boolean;
    ResetPasswordToken?: string | null;
    DataAprovacao?: string | null;
    VindiCustomerId?: string | null;
    Pronome?: string | null;
    LastLogin?: string;
    CreatedAt: string;
    UpdatedAt: string;
    Address: Address[];
    BillingAddress: BillingAddress[];
    Images: Image[];
    ReviewsMade: Review[];
    FavoritesGiven: unknown[];
    PlanoAssinaturas: unknown[];
    FinanceiroEntries: unknown[];
    Onboardings: Onboarding[];
    CreditosAvulsos: unknown[];
    NotificationStatus: NotificationStatus[];
    ConsultaPacientes: ConsultaPaciente[];
    CancelamentosPac: unknown[];
    WorkSchedules: unknown[];
    RefreshTokens: RefreshToken[];
}

// Store para pacientes
export interface PacienteStore {
    pacientes: Paciente[] | null;
    pacienteSelecionado: Paciente | null;
    setPacientes: (pacientes: Paciente[]) => void;
    setPacienteSelecionado: (paciente: Paciente) => void;
}

// Imagem do paciente (simples)
export interface ImagePaciente {
    url: string;
}

// Agenda do paciente (consultas agendadas)
export interface PacienteAgenda {
    id: string;
    data: string;
    horario: string;
    diaDaSemana: string;
    status: string;
}

// Estado do store do paciente
export interface PacienteStoreState {
    pacientes: Paciente[] | null;
    pacienteSelecionado: Paciente | null;
}

// Ações do store do paciente
export interface PacienteStoreActions {
    setPacientes: (pacientes: Paciente[]) => void;
    setPacienteSelecionado: (paciente: Paciente | null) => void;
}

// Dados para atualização do paciente
export type PacienteUpdate = {
    Nome?: string;
    Email?: string;
    Telefone?: string;
    DataNascimento?: string | null;
    Sexo?: Sexo | null;
    Pronome?: string | null;
    Address?: Address[];
    BillingAddress?: BillingAddress[];
};