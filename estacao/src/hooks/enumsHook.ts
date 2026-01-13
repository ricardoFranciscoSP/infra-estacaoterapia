import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useEnumStore } from '@/store/enumStore';

// Hook para buscar enums usando React Query e Zustand
export function useEnums() {
    const enums = useEnumStore((state) => state.enums);
    const setEnums = useEnumStore((state) => state.setEnums);
    const fetchEnums = useEnumStore((state) => state.fetchEnums);

    // Força o queryFn a ser executado sempre que o componente montar
    const query = useQuery({
        queryKey: ['enums'],
        queryFn: async () => {
            // Busca na API via store e retorna o resultado mais recente
            const data = await fetchEnums();
            return data;
        },
        staleTime: 60 * 60 * 1000, // 1h em cache
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
    });

    React.useEffect(() => {
        if (query.data) {
            setEnums(query.data);
        }
    }, [query.data, setEnums]);

    return {
        enums: (query.data ?? enums) as import('@/types/enumsType').EnumsResponse,
        isLoading: query.isLoading,
        refetch: query.refetch,
    };
}

