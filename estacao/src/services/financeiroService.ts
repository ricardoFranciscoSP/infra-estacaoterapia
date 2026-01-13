import { api } from "@/lib/axios";

export const financeiroService = () => {
    return {
        getPagamentos: () => api.get('/financeiro'),
    };
}
