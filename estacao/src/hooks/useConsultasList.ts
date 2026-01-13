import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { ConsultaApi } from '@/types/consultasTypes';
import { obterProximaConsultaReservada } from '@/utils/consultasUtils';

export function useConsultasList() {
    const query = useQuery<ConsultaApi[]>({
        queryKey: ['reservas/consultas-agendadas'],
        queryFn: async () => {
            const res = await api.get('/reservas/consultas-agendadas');
            // A API retorna { success, nextReservation, consultaAtual, futuras, total } ou { success: false, error }
            // Se success for false ou não houver consultas, retorna array vazio
            if (!res.data || res.data.success === false) {
                return [];
            }

            const consultasResult: ConsultaApi[] = [];
            
            // Prioriza nextReservation se existir - confia no backend que já validou
            if (res.data.nextReservation) {
                // Adiciona nextReservation como primeira (consulta atual)
                consultasResult.push(res.data.nextReservation);
            }
            
            // IMPORTANTE: Adiciona também as futuras para mostrar abaixo da atual
            // Isso garante que a próxima consulta apareça abaixo do card da atual
            if (res.data.futuras && Array.isArray(res.data.futuras) && res.data.futuras.length > 0) {
                // Filtra para não duplicar a nextReservation
                const futurasSemDuplicata = res.data.futuras.filter((f: { Id: string }) => {
                    if (res.data.nextReservation) {
                        return f.Id !== res.data.nextReservation.Id;
                    }
                    return true;
                });
                consultasResult.push(...futurasSemDuplicata);
            }
            
            // Se não tiver nextReservation mas tiver consultaAtual, adiciona
            if (!res.data.nextReservation && res.data.consultaAtual) {
                consultasResult.push(res.data.consultaAtual);
            }
            
            // Se já tem resultados, retorna
            if (consultasResult.length > 0) {
                return consultasResult;
            }

            // Fallback: Se não tiver nextReservation, usa consultaAtual ou futuras
            const proximaConsulta = obterProximaConsultaReservada(
                res.data.consultaAtual,
                res.data.futuras
            );

            // Se encontrou uma consulta próxima, retorna como array com um único item
            if (proximaConsulta) {
                // Busca a consulta completa (consultaAtual ou futuras) que corresponde ao Id
                const consultaCompleta = res.data.consultaAtual?.Id === proximaConsulta.Id
                    ? res.data.consultaAtual
                    : res.data.futuras?.find((f: ConsultaApi) => f.Id === proximaConsulta.Id);

                return consultaCompleta ? [consultaCompleta] : [];
            }

            return [];
        },
        retry: 1,
        staleTime: 5 * 60 * 1000, // Cache por 5 minutos em vez de sempre fresco
        refetchOnWindowFocus: true, // Atualiza quando a janela ganha foco
        // REMOVIDO: refetchInterval - evita polling contínuo a cada 30s
        // As atualizações agora vêm via WebSocket (socket.io) quando há mudanças
    });

    return {
        consultas: query.data || [],
        setConsultas: () => { }, // Mantido para compatibilidade, mas não faz nada
        fetchConsultas: query.refetch,
        loading: query.isLoading,
        error: query.isError ? 'Erro ao buscar consultas' : null
    };
}
