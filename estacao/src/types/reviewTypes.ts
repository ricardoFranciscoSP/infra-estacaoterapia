export interface Review {
    Id: string;
    PsicologoId: string;
    UserId: string;
    Rating: number;
    Comentario: string;
    Status: string;
    MostrarNaHome: boolean;
    MostrarNaPsicologo: boolean;
    CreatedAt: string;
    UpdatedAt: string;
    User: {
        Id: string;
        Nome: string;
        Email: string;
        Images: Array<{
            Id: string;
            UserId: string;
            Url: string;
            CreatedAt: string;
            UpdatedAt: string;
        }>;
    };
    Psicologo: {
        Id: string;
        Nome: string;
        Email: string;
        Images: Array<{
            Id: string;
            UserId?: string;
            Url: string;
            CreatedAt: string;
            UpdatedAt: string;
        }>;
    };
}