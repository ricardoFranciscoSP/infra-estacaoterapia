import { queryClient } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { useReservaSessaoStore, fetchReservaSessaoById } from '@/store/reservaSessaoStore';
import { reservaSessaoService } from '@/services/reservaSessaoService';

/**
 * Hook para buscar dados da ReservaSessao diretamente da tabela
 * 
 * IMPORTANTE: Este é o ÚNICO lugar correto para obter os tokens do Agora:
 * - AgoraTokenPatient: Token exclusivo da sala do paciente
 * - AgoraTokenPsychologist: Token exclusivo da sala do psicólogo
 * 
 * NUNCA buscar esses tokens de outras entidades (Consulta, Agenda, etc)
 * NUNCA usar tokens alternativos (TokenPaciente, TokenPsicologo, etc)
 * 
 * @param id - ID da consulta para buscar a ReservaSessao
 * @returns Dados da ReservaSessao incluindo os tokens corretos
 */
export function useReservaSessao(id: string | undefined) {
    const store = useReservaSessaoStore();

    const query = useQuery({
        queryKey: ['reserva-sessao', id],
        queryFn: async () => {
            if (!id) return null;
            const result = await fetchReservaSessaoById(id);
            // Garante que sempre retorna null em vez de undefined
            const data = result ?? null;
            queryClient.setQueryData(['reserva-sessao', id], data);
            return data;
        },
        enabled: !!id && id.trim() !== '', // Só executa se tiver um ID válido
        retry: 1,
        staleTime: 30 * 1000, // 30 segundos
        refetchOnWindowFocus: true,
        refetchInterval: (query) => {
            // Só refaz fetch se houver dados (evita loops quando não encontra)
            // E apenas a cada 30 segundos (reduzido de 10 para economizar recursos)
            const hasData = query.state.data !== null && query.state.data !== undefined;
            return hasData ? 30 * 1000 : false; // Se não tem dados, não refaz automaticamente
        },
        initialData: id ? (store.reservaSessao?.find(r => r.Id === id) ?? null) : null
    });

    return {
        reservaSessao: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
        reagendarReservaSessao: store.reagendarReservaSessao,
    };
}

/**
 * Hook para buscar todos os dados relacionados a uma consulta: ReservaSessao, Agenda e Consulta
 * @param consultationId ID da consulta
 * @returns Dados completos da consulta com todas as relações
 */
export function useConsultaCompleta(consultationId: string | undefined) {
    const query = useQuery({
        queryKey: ['consulta-completa', consultationId],
        queryFn: async () => {
            if (!consultationId) return null;
            const response = await reservaSessaoService().getConsultaCompleta(consultationId);
            if (response.data?.success) {
                return response.data.data;
            }
            return null;
        },
        enabled: !!consultationId && consultationId.trim() !== '',
        retry: 1,
        staleTime: 30 * 1000,
        refetchOnWindowFocus: true,
    });

    return {
        data: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
} 