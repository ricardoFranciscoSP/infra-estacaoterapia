import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePrimeiraCompraStore } from '@/store/primeiraCompraStore';

// Definição do tipo para os dados da primeira compra
export interface PrimeiraCompraDTO {
    userId: string;
    planoId: string;
    vindiProductId: string;
    quantidade: number;
    valor: number;
    endereco: {
        cep: string;
        rua: string;
        numero: string;
        complemento?: string;
        bairro: string;
        cidade: string;
        estado: string;
    };
    cartao: {
        numeroCartao: string;
        nomeTitular: string;
        validade: string;
        cvv: string;
        bandeira: string;
        last4: string;
        payment_company_code: string;
        payment_company_id: number | null;
        payment_method_code: string;
    };
    controleFatura: {
        CodigoFatura: string;
        Valor: number;
        Status: string;
        DataEmissao: Date;
        DataVencimento: Date;
        Tipo: string;
        vindiProductId: string;
    };
}

// Buscar primeira compra
export function usePrimeiraCompra() {
    const store = usePrimeiraCompraStore();

    const query = useQuery<{ jaComprou: boolean }>({
        queryKey: ['primeira-compra'],
        queryFn: async () => {
            const result = await store.fetchPrimeiraCompra();
            return {
                jaComprou: !!result?.jaComprou // força boolean
            };
        },
        retry: 1,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        initialData: store.primeiraCompra // usa o estado atual do store como fallback
    });

    return {
        primeiraCompra: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}

// Realizar primeira compra
export function useRealizarPrimeiraCompra() {
    const queryClient = useQueryClient();
    const store = usePrimeiraCompraStore();
    const mutation = useMutation({
        // Ajuste a tipagem do método no store para aceitar PrimeiraCompraDTO
        mutationFn: async (dados: PrimeiraCompraDTO) => {
            // Certifique-se de que store.realizarPrimeiraCompra aceita PrimeiraCompraDTO
            const result = await store.realizarPrimeiraCompra(dados);
            // Se a API retornar { error: true, message: ... }, lança erro para o onError
            if (result?.error) {
                throw new Error(result.message || "Erro ao realizar compra.");
            }
            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['primeira-compra'] });
        },
    });
    return {
        realizarPrimeiraCompra: mutation.mutate,
        isLoading: mutation.isPending,
        isError: mutation.isError,
        error: mutation.error,
    };
}