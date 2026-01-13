export interface Address {
    Id: string;
    UserId: string;
    Rua: string;
    Numero: string;
    Complemento?: string | null;
    Bairro: string;
    Cidade: string;
    Estado: string;
    Cep: string;
    CreatedAt: Date;
    UpdatedAt: Date;
}
