import { Sexo, Pronome, UserStatus, Role, Prisma, PrismaClient } from "../generated/prisma";
import { ExperienciaClinica, ProfessionalProfileStatus } from "../generated/prisma";
import { Languages, TipoAtendimento, Abordagem, Queixa, TipoPessoaJuridica } from "../generated/prisma";
// RacaCor e GrauInstrucao são tipos de enum do Prisma
// Definir localmente baseado nos valores do enum
export type RacaCor = 'Branca' | 'Preta' | 'Parda' | 'Amarela' | 'Indigena' | 'PrefiroNaoInformar';
export type GrauInstrucao = 'EnsinoFundamentalIncompleto' | 'EnsinoFundamentalCompleto' | 'EnsinoMedioIncompleto' | 'EnsinoMedioCompleto' | 'EnsinoSuperiorIncompleto' | 'EnsinoSuperiorCompleto' | 'PosGraduacao' | 'Mestrado' | 'Doutorado' | 'PosDoutorado';

/**
 * Tipos para atualização de dados do usuário
 */

export interface UserUpdateData {
    Nome?: string;
    Email?: string;
    Cpf?: string;
    Telefone?: string;
    WhatsApp?: string | null;
    DataNascimento?: Date | string | null;
    Sexo?: Sexo | null;
    Pronome?: Pronome | null;
    RacaCor?: RacaCor | null;
    Rg?: string | null;
    Crp?: string | null;
    GoogleId?: string | null;
    TermsAccepted?: boolean;
    PrivacyAccepted?: boolean;
    IsOnboard?: boolean;
    Status?: UserStatus;
    Role?: Role;
    Password?: string;
    ResetPasswordToken?: string | null;
    VindiCustomerId?: string | null;
    PaymentToken?: string | null;
    PaymentProfileId?: string | null;
    SubscriptionId?: string | null;
    twoFASecret?: string | null;
    isTwoFAEnabled?: boolean;
    backupCodes?: string | null;
    LastLogin?: Date | string | null;
    DataAprovacao?: Date | string | null;
    AssinaturaContrato?: boolean | null;
}

export interface AddressUpdateData {
    Id?: string;
    Rua?: string;
    Numero?: string;
    Complemento?: string | null;
    Bairro?: string;
    Cidade?: string;
    Estado?: string;
    Cep?: string;
}

export interface BillingAddressUpdateData {
    Id?: string;
    Rua?: string;
    Numero?: string;
    Complemento?: string | null;
    Bairro?: string;
    Cidade?: string;
    Estado?: string;
    Cep?: string;
}

export interface PessoalJuridicaUpdateData {
    Id?: string;
    CNPJ?: string;
    RazaoSocial?: string;
    NomeFantasia?: string | null;
    InscricaoEstadual?: string | null;
    SimplesNacional?: boolean | null;
}

export interface ProfessionalProfileUpdateData {
    Id?: string;
    TipoPessoaJuridico?: TipoPessoaJuridica[];
    TipoAtendimento?: TipoAtendimento[];
    ExperienciaClinica?: ExperienciaClinica | null;
    Idiomas?: Languages[];
    SobreMim?: string | null;
    Abordagens?: Abordagem[];
    Queixas?: Queixa[];
    Status?: ProfessionalProfileStatus;
    GrauInstrucao?: GrauInstrucao | null;
}

export interface PsychologistDocumentUpdateData {
    Id?: string;
    Url?: string;
    Type?: string | null;
    Description?: string | null;
}

export interface UpdateUserPsicologoInput {
    Nome?: string;
    Email?: string;
    Cpf?: string;
    Telefone?: string;
    WhatsApp?: string | null;
    DataNascimento?: Date | string | null;
    Sexo?: Sexo | null;
    Pronome?: Pronome | null;
    RacaCor?: RacaCor | null;
    Rg?: string | null;
    Address?: AddressUpdateData | AddressUpdateData[];
    BillingAddress?: BillingAddressUpdateData | BillingAddressUpdateData[];
    PessoalJuridica?: PessoalJuridicaUpdateData;
    ProfessionalProfiles?: ProfessionalProfileUpdateData | ProfessionalProfileUpdateData[];
}

/**
 * Tipo para o Prisma Transaction Client
 */
export type PrismaTransactionClient = Omit<
    PrismaClient,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

