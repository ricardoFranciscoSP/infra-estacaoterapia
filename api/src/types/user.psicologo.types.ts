export enum TipoFormacao {
    Curso = "Curso",
    Graduacao = "Graduacao",
    PosGraduacao = "PosGraduacao",
    Mestrado = "Mestrado",
    Doutorado = "Doutorado",
    PosDoutorado = "PosDoutorado",
    Residencia = "Residencia",
    Especializacao = "Especializacao",
    CursoLivre = "CursoLivre",
    Certificacao = "Certificacao",
    Outro = "Outro"
}

export interface ProfessionalProfile {
    Id: string;
    TipoPessoaJuridico: string[];
    TipoAtendimento: string[];
    ExperienciaClinica?: string | null;
    Idiomas: string[];
    SobreMim?: string | null;
    Abordagens: string[];
    Queixas: string[];
    GrauInstrucao?: string | null;
    Documents?: PsychologistDocument[];
    Formacoes?: Formacao[];
}

export interface PsychologistDocument {
    Id: string;
    ProfessionalProfileId: string;
    Url: string;
    Type?: string | null;
    Description?: string | null;
    CreatedAt: Date | string | null;
    UpdatedAt: Date | string | null;
}

export interface Formacao {
    Id?: string | null; // Opcional para permitir criação de novas formações
    ProfessionalProfileId?: string; // Opcional pois será preenchido pelo backend
    TipoFormacao: string; // Aceita string para flexibilidade, será validado no backend
    Instituicao: string;
    Curso: string;
    DataInicio: string; // String no formato MM/YYYY
    DataConclusao?: string | null; // String no formato MM/YYYY ou vazio
    Status?: string;
    CreatedAt?: Date | string | null;
    UpdatedAt?: Date | string | null;
}

export interface Review {
    Id: string;
    UserId?: string | null;
    PsicologoId: string;
    Rating: number;
    Comentario?: string | null;
    Status: string;
    MostrarNaHome?: boolean | null;
    MostrarNaPsicologo?: boolean | null;
    CreatedAt: Date | string | null;
    UpdatedAt: Date | string | null;
}

export interface WorkScheduleBreak {
    inicio: string;
    fim: string;
}

export interface WorkSchedule {
    Id: string;
    UserId: string;
    DiaDaSemana: string;
    HorarioInicio: string;
    HorarioFim: string;
    Status: string;
    Breaks?: WorkScheduleBreak[] | null;
    CreatedAt: Date | string | null;
    UpdatedAt: Date | string | null;
}

export interface Address {
    Id: string;
    UserId: string;
    Rua: string;
    Numero: string;
    Complemento?: string | null;
    Bairro: string;
    Cidade: string;
    Estado: string;
    Cep: string;
    CreatedAt: Date | string | null;
    UpdatedAt: Date | string | null;
}

export interface BillingAddress {
    Id: string;
    UserId: string;
    Rua: string;
    Numero: string;
    Complemento?: string | null;
    Bairro: string;
    Cidade: string;
    Estado: string;
    Cep: string;
    CreatedAt: Date | string | null;
    UpdatedAt: Date | string | null;
}

export interface Image {
    Id: string;
    UserId: string;
    Url: string;
    CreatedAt: Date | string | null;
    UpdatedAt: Date | string | null;
}

export interface RefreshToken {
    Id: string;
    UserId: string;
    Token: string;
    ExpiresAt: Date | string | null;
    Status: string;
    RevokedAt?: Date | string | null;
    CreatedAt: Date | string | null;
    UpdatedAt: Date | string | null;
}

export interface Favorite {
    Id: string;
    PatientId: string;
    PsychologistId: string;
    CreatedAt: Date | string | null;
}

export interface PlanoAssinatura {
    Id: string;
    Nome: string;
    Descricao: string[];
    Preco: number;
    Duracao: number;
    Tipo: string;
    Status: string;
    Destaque?: boolean | null;
    VindiPlanId?: string | null;
    ProductId?: string | null;
    CreatedAt: Date | string | null;
    UpdatedAt: Date | string | null;
}

export interface AssinaturaPlano {
    Id: string;
    PlanoAssinaturaId: string;
    DataInicio: Date | string | null;
    DataFim?: Date | string | null;
    Status: string;
    CreatedAt: Date | string | null;
    UpdatedAt: Date | string | null;
}

export interface CicloPlano {
    Id: string;
    AssinaturaPlanoId: string;
    UserId: string;
    CicloInicio: Date | string;
    CicloFim: Date | string;
    Status: 'Pendente' | 'Ativo' | 'Cancelado' | 'Expirado';
    ConsultasDisponiveis: number;
    ConsultasUsadas: number;
    CreatedAt: Date | string | null;
    UpdatedAt: Date | string | null;
}

export interface Financeiro {
    Id: string;
    PlanoAssinaturaId?: string | null;
    Valor: number;
    DataVencimento: Date | string | null;
    Status: string;
    FaturaId?: string | null;
    Tipo: string;
    CicloPlanoId?: string | null;
    CreatedAt: Date | string | null;
    UpdatedAt: Date | string | null;
}

export interface Onboarding {
    Id: string;
    Step: string;
    Completed: boolean;
    CreatedAt: Date | string | null;
    UpdatedAt: Date | string | null;
}

export interface AdminActionLog {
    Id: string;
    ActionType: string;
    Module: string;
    Description: string;
    Timestamp: Date | string | null;
}

export interface CancelamentoSessao {
    Id: string;
    SessaoId: string;
    AutorId: string;
    Motivo: string;
    Protocolo: string;
    Tipo: string;
    Data: Date | string | null;
    PacienteId: string;
    PsicologoId: string;
    Horario: string;
    LinkDock?: string | null;
    Status: string;
}

export interface CreditoAvulso {
    Id: string;
    Valor: number;
    Status: string;
    Data: Date | string | null;
    ValidUntil?: Date | string | null;
    Quantidade: number;
    CodigoFatura?: string | null;
}

export interface Commission {
    Id: string;
    Valor: number;
    Status: string;
    Data: Date | string | null;
}

export interface ConsultaAvulsa {
    Id: string;
    PacienteId: string;
    PsicologoId?: string | null;
    Status: string;
    DataCriacao: Date | string | null;
    Quantidade: number;
    Validade?: Date | string | null;
}

export interface ControleConsultaMensal {
    Id: string;
    AssinaturaPlanoId: string;
    MesReferencia: number;
    AnoReferencia: number;
    Status: string;
    Validade: Date | string | null;
    ConsultasDisponiveis: number;
    CreatedAt: Date | string | null;
    UpdatedAt: Date | string | null;
}

export interface ConsultaParticipacao {
    Id: string;
    ConsultaId: string;
    TipoUsuario: string;
    EntradaEm?: Date | string | null;
    SaidaEm?: Date | string | null;
    DuracaoEmMin?: number | null;
}

export interface Document {
    Id: string;
    Url: string;
    Type?: string | null;
    Description?: string | null;
    DataHoraAceite: Date | string | null;
    IpNavegador: string;
    AssinaturaDigital?: string | null;
    CreatedAt: Date | string | null;
    UpdatedAt: Date | string | null;
}

export interface Solicitacoes {
    Id: string;
    Title: string;
    Tipo: string;
    Status: string;
    Protocol: string;
    Descricao?: string | null;
    Documentos?: string | null;
    Log?: string | null;
    SLA?: number | null;
    CreatedAt: Date | string | null;
    UpdatedAt: Date | string | null;
}

export interface LoginLog {
    Id: string;
    Email?: string | null;
    Ip?: string | null;
    UserAgent?: string | null;
    Success: boolean;
    Message?: string | null;
    CreatedAt: Date | string | null;
}

export interface PessoalJuridica {
    Id: string;
    CNPJ: string;
    RazaoSocial: string;
    NomeFantasia?: string | null;
    InscricaoEstadual?: string | null;
    SimplesNacional?: boolean | null;
    CreatedAt: Date | string | null;
    UpdatedAt: Date | string | null;
    DadosBancarios?: DadosBancarios | null;
}

export interface DadosBancarios {
    Id: string;
    PessoalJuridicaId: string; // Adicionado conforme model
    ChavePix: string;
    CreatedAt: Date | string | null;
    UpdatedAt: Date | string | null;
}

export interface Agenda {
    Id: string;
    Data: Date | string | null;
    Horario: string;
    DiaDaSemana: string;
    Status: string;
    PsicologoId: string;
    PacienteId?: string | null;
    CreatedAt: Date | string | null;
    UpdatedAt: Date | string | null;
}

export interface NotificationStatus {
    Id: string;
    UserId: string;
    Status: string;
    Tipo?: string | null;
    NotificationId: string;
    CreatedAt: Date | string | null;
    UpdatedAt: Date | string | null;
}

export interface UserPsicologo {
    Id: string;
    Nome: string;
    Email: string;
    Cpf: string;
    Crp?: string | null;
    GoogleId?: string | null;
    Telefone: string;
    WhatsApp?: string | null;
    DataNascimento?: Date | string | null;
    Sexo?: string | null;
    RacaCor?: string | null;
    Status: string;
    Role: string;
    DataAprovacao?: Date | string | null;
    Pronome?: string | null;
    Rg?: string | null;
    AssinaturaContrato?: boolean | null;
    twoFASecret?: string | null;
    isTwoFAEnabled: boolean;
    Address: {
        Id: string;
        UserId: string;
        Rua: string;
        Numero: string;
        Complemento?: string | null;
        Bairro: string;
        Cidade: string;
        Estado: string;
        Cep: string;
    };
    BillingAddress: BillingAddress | BillingAddress[] | null;
    Images: Image[];
    ProfessionalProfiles: ProfessionalProfile[];
    PessoalJuridica?: PessoalJuridica | null;
    Document: Document[];

}
