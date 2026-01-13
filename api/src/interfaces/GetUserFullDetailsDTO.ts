export interface GetUserDetailsDTO {
    Id: string;
    Nome: string;
    Email: string;
    Cpf: string;
    Telefone: string;
    DataNascimento: Date | null;
    Status: string;
    Sexo: string;
    Role: string;
    DataAprovacao?: string | null;
    Address: Array<{
        Id: string;
        UserId: string;
        Cep: string;
        Rua: string;
        Numero: string;
        Complemento: string | null;
        Bairro: string;
        Cidade: string;
        Estado: string;
    }>;
    Image: {
        Id: string;
        UserId: string;
        Url: string;
        CreatedAt?: Date;
    } | null;

}
