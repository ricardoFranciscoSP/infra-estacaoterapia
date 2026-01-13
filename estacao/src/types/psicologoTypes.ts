export enum Sexo {
    Masculino = "Masculino",
    Feminino = "Feminino",
    NaoBinario = "Não Binário",
    PrefiroNaoDeclarar = "Prefiro Não Declarar"
}

export enum AgendaStatus {
    Disponivel = "Disponível",
    Indisponivel = "Indisponível",
    Bloqueado = "Bloqueado",
    Reservado = "Reservado",
    Cancelado = "Cancelado",
    Andamento = "Andamento",
    Concluido = "Concluído"
}

export interface Address {
    Id: string;
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

export interface EnderecoEmpresa {
    Id: string;
    PessoalJuridicaId: string;
    Rua: string;
    Numero?: string | null;
    Complemento?: string | null;
    Bairro: string;
    Cidade: string;
    Estado: string;
    Cep: string;
    CreatedAt?: string;
    UpdatedAt?: string;
}

export interface Image {
    Id: string;
    Url: string;
    CreatedAt: string;
    UpdatedAt: string;
}

export type ReviewMade = object;

export interface Reviews {
    Id: string;
    PsicologoId: string;
    PacienteId: string;
    Rating: number;
    Comment: string;
    CreatedAt: string;
    UpdatedAt: string;
}

export interface ReviewsReceived {
    Id: string;
    PsicologoId: string;
    PacienteId: string;
    Rating: number;
    Comentario: string;
    Status: string;
}

export interface ProfessionalProfiles {
    Id: string;
    UserId: string;
    AreasAtuacao: string;
    TipoPessoaJuridico: string[];
    TipoAtendimento: string[];
    ExperienciaClinica: string;
    Idiomas: string[];
    SobreMim: string;
    Abordagens: string[];
    Queixas: string[];
    CreatedAt: string;
    UpdatedAt: string;
    Documents: PsychologistDocument[];
    Formacoes: Formacao[];
    DadosBancarios?: DadosBancarios;
}

export interface PsychologistAgenda {
    Id: string;
    Data: string;
    Horario: string;
    Status: string;
}

export interface DadosBancarios {
    Id: string;
    PsicologoAutonomoId?: string;
    PessoalJuridicaId?: string;
    ChavePix: string;
    Banco?: string | null;
    Agencia?: string | null;
    Conta?: string | null;
    TipoConta?: string | null;
    CreatedAt?: string;
    UpdatedAt?: string;
}

export interface PessoalJuridica {
    CNPJ: string;
    RazaoSocial: string;
    NomeFantasia: string;
    InscricaoEstadual: string;
    SimplesNacional: boolean;
    DadosBancarios?: DadosBancarios;
    EnderecoEmpresa?: EnderecoEmpresa;
    DescricaoExtenso?: string | null;
}

export type Psicologo = {
    Id: string;
    id: string;
    Nome: string;
    nome: string;
    areasAtuacao?: string;
    Crp: string;
    Cpf: string;
    Rg: string;
    Sexo: string;
    Email: string;
    DataNascimento: string;
    Telefone?: string;
    Especialidades?: string[];
    Ativo?: boolean;
    TermsAccepted: boolean;
    PrivacyAccepted: boolean;
    Status: string;
    Role: string;
    IsOnboard: boolean;
    ResetPasswordToken?: string | null;
    DataAprovacao?: string | null;
    VindiCustomerId?: string | null;
    Pronome?: string | null;
    WhatsApp?: string | null;
    RacaCor?: string | null;
    CreatedAt: string;
    UpdatedAt: string;
    Address?: Address; // Troque de Address[] para Address
    ProfessionalProfiles?: ProfessionalProfiles[];
    PsicologoAgenda?: PsicologoAgenda[];
    PsychologistAgendas?: PsychologistAgenda[];
    PsychologistReviews?: Reviews[];
    PsychologistFavorites?: object[]; // sem detalhes, usar object
    Image?: Image[];
    Images?: Image[]; // API pode retornar Images (plural)
    PlanoCompra?: object[]; // sem detalhes, usar object
    ControleFinanceiro?: object[]; // sem detalhes, usar object
    Onboarding?: object[]; // sem detalhes, usar object
    Commission?: object[]; // sem detalhes, usar object
    ConsultaAvulsa?: object[]; // sem detalhes, usar object
    CancelamentosComoPsicologo?: object[]; // sem detalhes, usar object
    WorkSchedule?: WorkSchedule[];
    RefreshToken?: object[]; // sem detalhes, usar object
    NotificationStatus?: object[]; // sem detalhes, usar object
    Pendencias?: string[];
    Consultas?: object[]; // sem detalhes, usar object
    Financeiro?: object; // sem detalhes, usar object
    ReviewsReceived: ReviewsReceived[];
    PessoalJuridica?: PessoalJuridica; // já está correto, não precisa de []
    BillingAddress?: EnderecoCobranca | EnderecoCobranca[];
};

export type EnderecoCobranca = {
    Id: string;
    UserId: string;
    Rua: string;
    Numero: string;
    Complemento?: string | null;
    Bairro: string;
    Cidade: string;
    Estado: string;
    Cep: string;
    CreatedAt: string;
    UpdatedAt: string;
};

export type ProfessionalProfileV2 = {
    Id: string;
    UserId: string;
    TipoPessoaJuridico: string[];
    TipoAtendimento: string[];
    ExperienciaClinica?: string | null;
    Idiomas: string[];
    SobreMim?: string | null;
    Abordagens: string[];
    Queixas: string[];
    CriadoEm: string;
    AtualizadoEm: string;
    CreatedAt: string;
    UpdatedAt: string;
    Documents: PsychologistDocument[];
    Formacoes: Formacao[];
};

export type PsychologistDocument = {
    Id: string;
    ProfessionalProfileId: string;
    Url: string;
    Type?: string | null;
    Description?: string | null;
    CreatedAt: string;
    UpdatedAt: string;
};

export type Formacao = {
    Id: string;
    ProfessionalProfileId: string;
    Tipo: string;
    Instituicao: string;
    Periodo: string;
    Descricao?: string | null;
    Status: string;
    CreatedAt: string;
    UpdatedAt: string;
    Curso: string;
    TipoFormacao?: string | null;
    DataConclusao: string;
    DataInicio: string;
};

export type WorkSchedule = {
    Id: string;
    UserId: string;
    DiaDaSemana: string;
    HorarioInicio: string;
    HorarioFinal: string;
    Status: string;
    Breaks?: object; // sem detalhes, usar object
    CreatedAt: string;
    UpdatedAt: string;
};

export interface PsicologoStore {
    Psicologos: Psicologo[] | null;
    PsicologoSelecionado: Psicologo | null;
    SetPsicologos: (psicologos: Psicologo[]) => void;
    SetPsicologoSelecionado: (psicologo: Psicologo | null) => void;
}

export interface PsicologoAgenda {
    Id: string;
    Data: string;
    Horario: string;
    DiaDaSemana?: string;
    Status?: string;
    PacienteId?: string;
    PsicologoId?: string;
}

export interface ImagePsicologo {
    Url: string;
}

export interface PsicologoAtivo {
    Id: string;
    Nome: string;
    Crp: string;
    Images: Image[];
    Reviews: Reviews[];
    ProfessionalProfiles: ProfessionalProfiles[];
    PsychologistAgendas: PsychologistAgenda[];
    ReviewsReceived: ReviewsReceived[];
}

export interface PsicologoStoreState {
    Psicologos: PsicologoAtivo[] | null;
    PsicologoSelecionado: PsicologoAtivo | null;
    Psicologo: Psicologo | null;
}

export interface PsicologoStoreActions {
    SetPsicologos: (psicologos: PsicologoAtivo[] | null) => void;
    SetPsicologo: (psicologo: Psicologo | null) => void;
    SetPsicologoSelecionado: (psicologo: PsicologoAtivo | null) => void;
    SetVerPsicologos: (psicologos: PsicologoAtivo[] | null) => void;
}

export type ConsultasRealizadas = {
    totalConsultas: number;
};

export type taxaOcupacao = {
    percentualOcupacao: number
};
export type ConsultasPendentes = {
    totalPendentes: number
};

export type ProximasConsultas = {
    Id: string;
    Date: string;
    Time: string;
    Status: string;
    PacienteId: string;
    PsicologoId: string;
    AgendaId: string;
    CreatedAt: string;
    UpdatedAt: string;
    Paciente: {
        Id: string;
        Nome: string;
        Role: string;
    };
    Psicologo: {
        Id: string;
        Nome: string;
        Role: string;
    };
    Agenda: {
        Id: string;
        Data: string;
        Horario: string;
        DiaDaSemana: string;
        Status: string;
        PsicologoId: string;
        PacienteId: string;
        CreatedAt: string;
        UpdatedAt: string;
    };
}

export interface Enums {
    abordagem?: string[];
    queixa?: string[];
    statusFormacao?: string[];
}