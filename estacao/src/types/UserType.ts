export type AddressType = {
    cep: string;
    endereco: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    estado: string;
    [key: string]: unknown;
};

export type UserType = {
    Id?: string;
    VindiCustomerId?: string;
    Address?: AddressType[];
    [key: string]: unknown;
};

export interface Notificacao {
    Id: string;
    Title: string;
    Message: string;
    CreatedAt: string;
    IsForAllUsers: boolean;
    Lida: boolean;
}