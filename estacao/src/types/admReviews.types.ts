export type User = {
    Id: string;
    Nome: string;
    Email: string;
};

export type Psicologo = {
    Id: string;
    Nome: string;
};

export type Reviews = {
    Id: string;
    UserId?: string; // Paciente que avaliou
    PsicologoId: string; // Psicólogo avaliado
    Rating: number;
    Comentario?: string;
    Status: string;
    CreatedAt: string; // DateTime em formato ISO
    UpdatedAt: string; // DateTime em formato ISO
    User?: User;
    Psicologo?: Psicologo;
    MostrarNaHome?: boolean;
    MostrarNaPsicologo?: boolean;
}

export type ReviewsResponse = {
    success: boolean;
    message?: string;
    data?: Reviews;
}

export type ReviewUpdate = {
    Id: string;
    Rating?: number;
    Comentario?: string;
    Status?: string;
    MostrarNaHome?: boolean;
    MostrarNaPsicologo?: boolean;
    Reviews?: Reviews[];
}

export interface ReviewsStoreState {
    reviews: Reviews[] | null;
}

// Ações do store do paciente
export interface ReviewsStoreActions {
    setReviews: (reviews: Reviews[]) => void;
}