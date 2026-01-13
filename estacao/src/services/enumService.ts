import { api } from "@/lib/axios";

export const enumService = {
    getEnums: () => api.get('/enums').then(res => res.data),
};