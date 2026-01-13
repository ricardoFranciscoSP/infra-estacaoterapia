export interface Address {
    id?: string;
    userId: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    type: 'principal' | 'billing';
    createdAt?: Date;
    updatedAt?: Date;
}
