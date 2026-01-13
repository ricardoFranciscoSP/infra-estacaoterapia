export interface PessoalJuridica {
    Id: string;
    CNPJ: string;
    PsicologoId: string;
    RazaoSocial: string;
    NomeFantasia?: string | null;
    InscricaoEstadual?: string | null;
    SimplesNacional?: boolean | null;
    CreatedAt: Date;
    UpdatedAt: Date;
}
