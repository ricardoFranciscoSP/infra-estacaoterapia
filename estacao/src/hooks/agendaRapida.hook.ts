
import { useAgendaStore } from '@/store/agendaStore';
import { usePsicologoStore, verPsicologos } from '@/store/psicologoStore';
import { useState } from 'react';


// Hook padrão Zustand para psicólogos ativos
export function useAgendamentoRapidoPsicologos() {
    const psicologos = usePsicologoStore(state => state.Psicologos) ?? [];
    const [isLoading, setIsLoading] = useState(false);
    const [isError, setIsError] = useState(false);

    async function refetch() {
        setIsLoading(true);
        setIsError(false);
        try {
            await verPsicologos();
        } catch {
            setIsError(true);
        } finally {
            setIsLoading(false);
        }
    }

    return {
        psicologos,
        isLoading,
        isError,
        refetch,
    };
}

// Hook padrão Zustand para agendas por psicólogo
export function useAgendamentoRapidoAgendasPorPsicologo(psicologoId: string | undefined) {
    const agendasPorPsicologo = useAgendaStore(state => state.agendasPorPsicologo) ?? [];
    const [isLoading, setIsLoading] = useState(false);
    const [isError, setIsError] = useState(false);

    async function refetch() {
        if (!psicologoId) return [];
        setIsLoading(true);
        setIsError(false);
        try {
            await useAgendaStore.getState().fetchAgendasPorPsicologo(psicologoId);
        } catch {
            setIsError(true);
        } finally {
            setIsLoading(false);
        }
        return useAgendaStore.getState().agendasPorPsicologo;
    }

    return {
        agendasPorPsicologo,
        isLoading,
        isError,
        refetch,
    };
}
