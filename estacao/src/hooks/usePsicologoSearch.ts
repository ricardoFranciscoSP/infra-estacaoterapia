import { usePsicologoStore, fetchPsicologoByFilter, verPsicologos } from '@/store/psicologoStore';
import { useState } from 'react';

interface PsicologoSearchFilters {
    queixas?: string[];
    abordagens?: string[];
    sexo?: 'feminino' | 'masculino' | 'outros' | null;
    atendimentos?: string[];
    idiomas?: string[];
    dataInicio?: string | null;
    dataFim?: string | null;
    periodo?: string;
    nome?: string;
}

export function usePsicologoSearch() {
    const { Psicologos, SetPsicologos } = usePsicologoStore();
    const [isLoading, setIsLoading] = useState(false);
    const [isError, setIsError] = useState(false);

    // Aceita objeto de filtros tipado
    const searchPsicologos = async (filtros: PsicologoSearchFilters): Promise<void> => {
        setIsLoading(true);
        setIsError(false);
        try {
            // Se todos os filtros estiverem "vazios", busca todos
            const isBuscaVazia = Object.values(filtros).every(v =>
                v === "" ||
                v === null ||
                v === undefined ||
                (Array.isArray(v) && v.length === 0)
            );
            if (isBuscaVazia) {
                await verPsicologos();
            } else {
                await fetchPsicologoByFilter(filtros);
            }
        } catch (error) {
            console.error('Erro ao buscar psicólogos:', error);
            setIsError(true);
            SetPsicologos([]);
        } finally {
            setIsLoading(false);
        }
    };

    return {
        psicologos: Psicologos,
        searchPsicologos,
        isLoading,
        isError,
    };
}
