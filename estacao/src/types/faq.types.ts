export interface FAQ {
    Id: string;
    Pergunta: string;
    Resposta: string;
    Status: string;
    Tipo: string;
    CreatedAt?: string;
    UpdatedAt?: string;
}

export interface FAQCreate {
    Pergunta: string;
    Resposta: string;
    Status?: string;
    Tipo?: string;
}

export interface FAQUpdate {
    Pergunta?: string;
    Resposta?: string;
    Status?: string;
    Tipo?: string;
}
