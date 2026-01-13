// Hook para buscar consulta por ID
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useConsultasStore, fetchConsultas, fetchConsultasFuturas, fetchConsultaById, fetchToken, fetchConsultasConcluidas, fetchConsultasAgendadas, fetchConsultasDia } from '@/store/consultasStore';
import { ConsultaDia, Futuras, HistoricoConsultas, Reserva, ConsultaApi, ConsultasAgendadasResponse } from '@/types/consultasTypes';
import { api } from '@/lib/axios';
import { joinUserRoom, onProximaConsultaAtualizada, offProximaConsultaAtualizada } from '@/lib/socket';

export function useConsultaById(id: string | number | undefined) {
    const setConsultas = useConsultasStore(state => state.setConsultas);

    // Valida se o ID é válido antes de habilitar a query
    const isValidId = id !== undefined && 
                      id !== null && 
                      id !== '' && 
                      String(id).trim() !== '' &&
                      typeof id === 'string' || typeof id === 'number';

    const query = useQuery<Reserva | null>({
        queryKey: ['consulta', id],
        queryFn: async () => {
            if (!isValidId || !id) {
                return null;
            }
            
            try {
                const data = await fetchConsultaById(String(id));
                if (data) {
                    setConsultas([data]);
                }
                return data;
            } catch (error) {
                console.error('🔴 [useConsultaById] Erro ao buscar consulta por ID:', error);
                // Retorna null em caso de erro para não quebrar a aplicação
                return null;
            }
        },
        enabled: isValidId,
        retry: 0, // Não tenta novamente em caso de erro
        staleTime: 5 * 60 * 1000,
        // Não refaz a query automaticamente em caso de erro
        refetchOnWindowFocus: false,
        refetchOnMount: false,
    });

    return {
        consulta: query.data ?? null,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}

export function useConsultas() {
    const setConsultas = useConsultasStore(state => state.setConsultas);

    const query = useQuery<Reserva[]>({
        queryKey: ['consultas'],
        queryFn: async () => {
            // fetchConsultas agora retorna os dados
            const data = await fetchConsultas();
            setConsultas(data);
            return data;
        },
        retry: 1,
        staleTime: 5 * 60 * 1000,
        enabled: false,
    });

    return {
        consultas: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}

// Hook para buscar consultas futuras
export function useConsultasFuturas() {
    const setConsultaFutura = useConsultasStore(state => state.setConsultaFutura);

    const query = useQuery<Futuras>({
        queryKey: ['consultasFuturas'],
        queryFn: async () => {
            const data = await fetchConsultasFuturas();
            setConsultaFutura(data);
            return data;
        },
        retry: 1,
        staleTime: 0, // Sempre busca dados frescos em áreas logadas
        gcTime: 0, // Não mantém cache em áreas logadas
        refetchOnWindowFocus: true, // Refetch quando a janela ganha foco
        refetchOnMount: true, // Sempre refetch ao montar o componente
        refetchOnReconnect: true, // Refetch ao reconectar
        enabled: true,
    });

    // Escuta atualizações em tempo real via WebSocket
    useEffect(() => {
        // Busca userId do localStorage (criptografado) ou tenta obter dos dados da consulta
        let userId: string | null = null;
        let cleanup: (() => void) | null = null;
        
        (async () => {
            try {
                const { encryptedLocalStorage } = await import('@/utils/encryptedStorage');
                const user = await encryptedLocalStorage.getObject<{ Id?: string; id?: string }>('user-data-client', true);
                if (user) {
                    userId = user?.Id || user?.id || null;
                }
            } catch {
                // Ignora erro - pode não ter dados criptografados ainda
            }
            
            // Fallback: tenta obter dos dados da consulta
            if (!userId) {
                const consultaAtualRaw = query.data?.consultaAtual;
                const consultaAtual = consultaAtualRaw && typeof consultaAtualRaw === 'object' && 'consultaAtual' in consultaAtualRaw
                  ? (consultaAtualRaw as { consultaAtual?: { PacienteId?: string; PsicologoId?: string } }).consultaAtual
                  : null;
                userId = query.data?.nextReservation?.PacienteId 
                    || query.data?.nextReservation?.PsicologoId
                    || consultaAtual?.PacienteId
                    || consultaAtual?.PsicologoId
                    || query.data?.futuras?.[0]?.PacienteId
                    || query.data?.futuras?.[0]?.PsicologoId
                    || null;
            }
            
            if (!userId) return;

            joinUserRoom(userId);

            const handler = () => {
                // Força refetch quando recebe atualização
                query.refetch();
            };

            onProximaConsultaAtualizada(handler);
            
            cleanup = () => {
                offProximaConsultaAtualizada();
            };
        })();
        
        return () => {
            if (cleanup) cleanup();
        };
    }, [query.data, query.refetch, query]);

    return {
        consultasFuturas: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}

// Novo hook para consultas futuras
// Hook para buscar todas as consultas agendadas (não só a próxima)
export function useConsultasAgendadas() {
    const setConsultaAgendada = useConsultasStore(state => state.setConsultaAgendada);

    const query = useQuery<Futuras[]>({
        queryKey: ['consultasAgendadas'],
        queryFn: async () => {
            const data = await fetchConsultasAgendadas();
            setConsultaAgendada(data);
            return data;
        },
        retry: 1,
        staleTime: 5 * 60 * 1000,
        enabled: true,
    });

    return {
        consultasAgendadas: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}

export function useConsultaToken(channel: string | undefined) {
    const setToken = useConsultasStore(state => state.setToken);
    const query = useQuery({
        queryKey: ['consultaToken', channel],
        queryFn: async () => {
            if (!channel) return null;
            // Chama o método corretamente
            const token = await fetchToken(channel);
            setToken(token);
            return token;
        },
        retry: 1,
        staleTime: 5 * 60 * 1000,
        // Ativa o hook automaticamente quando channel existe
        enabled: !!channel,
    });

    return {
        token: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}

export function useConsultasConcluidas() {
    const setConsultaConcluida = useConsultasStore(state => state.setConsultaConcluida);

    const query = useQuery<HistoricoConsultas>({
        queryKey: ['consultasConcluidas'],
        queryFn: async () => {
            // A função fetchConsultasConcluidas já trata erros e retorna dados vazios se necessário
            const data = await fetchConsultasConcluidas();
            setConsultaConcluida(data);
            return data;
        },
        retry: (failureCount, error) => {
            // Não tenta novamente se for timeout ou erro 500
            const axiosError = error as { 
                response?: { status?: number }; 
                code?: string;
                message?: string;
            };
            const isTimeout = axiosError?.code === 'ECONNABORTED' || 
                             axiosError?.message?.includes('timeout');
            const isServerError = axiosError?.response?.status === 500;
            
            if (isTimeout || isServerError) {
                return false; // Não retry para timeout ou erro 500
            }
            // Para outros erros, tenta apenas 1 vez
            return failureCount < 1;
        },
        staleTime: 5 * 60 * 1000, // Cache de 5 minutos (não precisa buscar constantemente)
        enabled: true, // Habilitado para buscar automaticamente
        refetchOnWindowFocus: false, // Desabilita refetch automático para evitar erros repetidos
        refetchOnMount: true, // Busca ao montar o componente
        refetchOnReconnect: false, // Não busca ao reconectar para evitar loops
        // Não marca como erro se retornar dados vazios (evita mostrar estado de erro na UI)
    });

    return {
        consultasConcluidas: query.data,
        isLoading: query.isLoading,
        // Não marca como erro se for timeout ou 500 (a função já retorna dados vazios)
        isError: false, // Sempre false, pois fetchConsultasConcluidas sempre retorna dados válidos (mesmo que vazios)
        refetch: query.refetch,
    };
}



export function useConsultasDia() {
    const setConsultaDia = useConsultasStore(state => state.setConsultaDia);

    const query = useQuery<ConsultaDia>({
        queryKey: ['consultasDia'],
        queryFn: async () => {
            const data = await fetchConsultasDia();
            console.log('Dados da consulta do dia ou próximas:', data);
            setConsultaDia(data);
            return data;
        },
        retry: 1,
        staleTime: 5 * 60 * 1000,
        enabled: false,
    });

    return {
        consultasDia: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}

/**
 * Hook para buscar a consulta atual em andamento
 * Retorna a consulta que está com status "Andamento" e dentro da janela de 1 hora
 */
export function useConsultaAtual() {
    const query = useQuery<ConsultaApi | null>({
        queryKey: ['consultaAtualEmAndamento'],
        queryFn: async () => {
            try {
                const res = await api.get('/reservas/consultas-agendadas');
                
                if (!res.data || res.data.success === false) {
                    return null;
                }

                const data = res.data as ConsultasAgendadasResponse;
                
                // Retorna consultaAtualEmAndamento se existir
                return data.consultaAtualEmAndamento || null;
            } catch (error) {
                console.error('Erro ao buscar consulta atual em andamento:', error);
                return null;
            }
        },
        retry: 1,
        staleTime: 5 * 60 * 1000, // Evita requisições contínuas (5 min)
        gcTime: 0, // Não mantém cache além do necessário em áreas logadas
        refetchOnWindowFocus: true, // Atualiza quando a janela ganha foco
        refetchOnMount: true, // Refetch ao montar para obter estado inicial
        refetchOnReconnect: true, // Refetch ao reconectar
        // REMOVIDO: refetchInterval - atualizações em tempo real via WebSocket
    });

    // Escuta atualizações em tempo real via WebSocket
    useEffect(() => {
        // Busca userId do localStorage (criptografado) ou tenta obter dos dados da consulta
        let userId: string | null = null;
        let cleanup: (() => void) | null = null;
        
        (async () => {
            try {
                const { encryptedLocalStorage } = await import('@/utils/encryptedStorage');
                const user = await encryptedLocalStorage.getObject<{ Id?: string; id?: string }>('user-data-client', true);
                if (user) {
                    userId = user?.Id || user?.id || null;
                }
            } catch {
                // Ignora erro - pode não ter dados criptografados ainda
            }
            
            // Fallback: tenta obter dos dados da consulta
            if (!userId) {
                userId = query.data?.PacienteId || query.data?.PsicologoId || null;
            }
            
            if (!userId) return;

            joinUserRoom(userId);

            const handler = () => {
                // Força refetch imediato quando recebe atualização via WebSocket
                // Isso garante atualização instantânea quando uma consulta termina e outra começa
                query.refetch();
            };

            onProximaConsultaAtualizada(handler);
            
            cleanup = () => {
                offProximaConsultaAtualizada();
            };
        })();
        
        return () => {
            if (cleanup) cleanup();
        };
    }, [query.data, query.refetch, query]);

    return {
        consultaAtual: query.data ?? null,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}