import { api } from "@/lib/axios";

export type AddressData = {
    userId: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    type: 'principal' | 'billing';
};

export const createOrUpdateAddress = async (data: AddressData) => {
    const response = await api.post("/address", data);
    return response.data;
};

export const fetchAddresses = async (userId: string) => {
    const response = await api.get(`/address/user/${userId}`);
    return response.data;
};
