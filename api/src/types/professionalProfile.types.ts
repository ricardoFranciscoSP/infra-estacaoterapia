export interface ProfessionalProfile {
    Id: string;
    UserId: string;
    AreasAtuacao: string;
    TipoPessoaJuridico: string[]; // Enum values
    TipoAtendimento: string[]; // Enum values
    ExperienciaClinica?: string | null;
    Idiomas: string[]; // Enum values
    SobreMim?: string | null;
    Abordagens: string[]; // Enum values
    Queixas: string[]; // Enum values
    CreatedAt: Date;
    UpdatedAt: Date;
}
