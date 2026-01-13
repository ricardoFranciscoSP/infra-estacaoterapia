import { useCallback, useState } from "react";
import { pacientePlanoService } from '@/services/planoPacienteService';
import type { PrimeiraCompraDTO } from '@/hooks/primeiraConsultaHook';

const service = pacientePlanoService();

// Store com estado e métodos ajustados
export function usePrimeiraConsultaService() {
    const [primeiraCompra, setPrimeiraCompra] = useState<{ jaComprou: boolean } | undefined>(undefined);

    // Buscar primeira compra
    const fetchPrimeiraCompra = useCallback(async () => {
        const response = await service.getPrimeiraCompra();
        setPrimeiraCompra(response.data);
        return response.data;
    }, []);

    // Realizar primeira compra
    const realizarPrimeiraCompra = useCallback(async (dados: PrimeiraCompraDTO) => {
        const response = await service.primeiraCompra(dados);

        // Atualiza o estado local após a compra
        if (response.data && !response.data.error) {
            setPrimeiraCompra({ jaComprou: true });
        }
        return response.data;
    }, []);

    return {
        primeiraCompra,
        fetchPrimeiraCompra,
        realizarPrimeiraCompra
    };
}

// Export nomeado para compatibilidade
export const usePrimeiraCompraStore = usePrimeiraConsultaService;
