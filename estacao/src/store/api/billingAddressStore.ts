import { api } from "@/lib/axios";

export type BillingAddressData = {
    userId: string;
    cep: string;
    rua: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
};

export const createBillingAddress = async (data: BillingAddressData) => {
    const response = await api.post("/users/billing-address", data);
    return response.data;
};

export const updateBillingAddress = async (id: string, data: BillingAddressData) => {
    const response = await api.put(`/users/billing-address/${id}`, data);
    return response.data;
};

export const fetchBillingAddress = async (userId: string) => {
    const response = await api.get(`/users/${userId}/billing-address`);
    return response.data;
};
