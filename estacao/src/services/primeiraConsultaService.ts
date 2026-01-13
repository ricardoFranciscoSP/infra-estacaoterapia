import { api } from "@/lib/axios";

export interface PrimeiraCompraData {
    Id: string;
    Valor: number;
    Data: string;
}

export const primeiraConsultaService = () => {
    return {
        getPrimeiraCompra: () => api.get('/primeira-consulta/verificar'),
        realizarPrimeiraCompra: (data: PrimeiraCompraData) => api.post('/primeira-consulta/comprar', data),
    };
}