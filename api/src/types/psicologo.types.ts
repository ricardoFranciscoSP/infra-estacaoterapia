import { Image } from "./image.types";
import { ProfessionalProfile } from "./professionalProfile.types";
import { PessoalJuridica } from "./pessoalJuridica.types";
import { Address } from "./address.types";
import { Financeiro, User } from "./permissions.types";

export interface Psicologo {
    Id: string;
    User: User;
    Address?: Address[];
    Images?: Image[];
    ProfessionalProfiles?: ProfessionalProfile[];
    PessoalJuridica?: PessoalJuridica | null;
    Review?: any;
    PlanoCompra?: any;
    Status: 'Ativo' | 'Inativo' | 'Bloqueado' | 'Pendente' | 'Deletado' | 'Em Análise';
    VindiCustomerId?: string | null;
    Sexo?: 'Masculino' | 'Feminino' | 'Não Binário' | 'Prefiro Não Declarar' | null;
    DataNascimento?: Date | string | null;
    TermsAccepted: boolean | string;
    PrivacyAccepted: boolean | string;
    AssinaturaPlano?: {
        Id: string;
        UserId: string;
        TipoPlano: string;
        PlanoAssinaturaId: string;
    } | null;
    Financeiro?: Financeiro | null;
}