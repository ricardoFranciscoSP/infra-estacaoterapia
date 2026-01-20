export interface ISolicitacao {
    Id: string;
    Title: string;
    UserId: string;
    User?: {
        Id: string;
        Nome: string;
        Email: string;
    };
    Tipo: string;
    Status: string;
    Protocol: string;
    Descricao?: string; // opcional
    Documentos?: string; // opcional
    Log?: string; // opcional
    SLA?: number; // opcional
    PublicoTodos?: boolean;
    PublicoPacientes?: boolean;
    PublicoPsicologos?: boolean;
    PublicoFinanceiro?: boolean;
    DestinatariosIds?: string[];
    CreatedAt: Date;
    UpdatedAt: Date;
}
