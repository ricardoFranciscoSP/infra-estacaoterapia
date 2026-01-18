import { Image } from "./image.types";
import { ProfessionalProfile } from "./professionalProfile.types";
import { PessoalJuridica } from "./pessoalJuridica.types";
import { Address } from "./address.types";
export interface User {
    Id: string;
    Nome: string;
    Email: string;
    Telefone: string;
    Password: string;
    Role: string;
    Crp: string | null;
    Cpf: string;
    GoogleId?: string | null;
    ResetPasswordToken?: string | null;
    ResetPasswordExpires?: Date | null;
    Address?: Address[];
    Images?: Image[];
    ProfessionalProfiles?: ProfessionalProfile[];
    PessoalJuridica?: PessoalJuridica | null;
    Review?: any;
    PlanoCompra?: any;
    Status:
        | 'Ativo'
        | 'Em Análise'
        | 'Pendente Documentação'
        | 'Análise Contrato'
        | 'Inativo'
        | 'Reprovado'
        | 'Descredenciado Voluntário'
        | 'Descredenciado Involuntário'
        | 'Bloqueado'
        | 'Pendente'
        | 'Deletado'
        | 'Em Análise Contrato';
    VindiCustomerId?: string | null;
    Sexo?: 'Masculino' | 'Feminino' | 'Não Binário' | 'Prefiro Não Declarar' | null;
    DataNascimento?: Date | string | null;
    TermsAccepted: boolean | string;
    PrivacyAccepted: boolean | string;
    CreatedAt: Date;
    UpdatedAt: Date;
    isTwoFAEnabled?: boolean;
}