export interface GetUserBasicDTO {
    Id: string;
    Nome: string;
    Email: string;
    Cpf?: string;
    Telefone?: string;
    IsOnboard: boolean;
    Role?: string;
    Status?: string;
    VindiCustomerId?: string; // Adicionado para incluir o ID do cliente Vindi
    PlanoCompra: {
        Status: string;
    } | null;
    Address: boolean;
    Image: {
        Id: string;
        Url: string;
    } | null;
    Onboardings: {
        Id: string;
        Completed: string;
        Step: string;
    }[];
}
