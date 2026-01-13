import { useQuery, useMutation } from '@tanstack/react-query';
import { ConsultasRealizadas, getConsultasRealizadas, getConsultaById, updateConsulta, deleteConsulta, useAdmConsultasStore } from '@/store/admin/admConsultasStore';
import { useMemo } from 'react';
import { admConsultasService } from '@/services/admConsultas';

// Hook para buscar todas as consultas realizadas
export function useAdmConsultasRealizadas() {
    const query = useQuery<ConsultasRealizadas[]>({
        queryKey: ['consultasRealizadas'],
        queryFn: async () => {
            await getConsultasRealizadas();
            const raw = useAdmConsultasStore.getState().consultasRealizadas as unknown;
            return Array.isArray(raw) ? (raw as ConsultasRealizadas[]) : [];
        },
        retry: 1,
        staleTime: 5 * 60 * 1000,
        enabled: true,
    });

    return {
        consultas: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}

// Hook para buscar uma consulta específica por ID
export function useAdmConsultaById(id: string | undefined) {
    const query = useQuery<ConsultasRealizadas | null>({
        queryKey: ['consulta', id],
        queryFn: async () => {
            if (!id) return null;
            const consulta = await getConsultaById(id);
            return consulta;
        },
        enabled: !!id,
        retry: 1,
        staleTime: 5 * 60 * 1000,
    });

    return {
        consulta: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}

// Hook para atualizar consulta
export function useUpdateAdmConsulta() {
    return useMutation({
        mutationFn: async (data: { id: string, update: Partial<ConsultasRealizadas> }) => {
            return await updateConsulta(data.id, data.update);
        },
    });
}

// Hook para deletar consulta
export function useDeleteAdmConsulta() {
    return useMutation({
        mutationFn: async (id: string) => {
            return await deleteConsulta(id);
        },
    });
}

// Hook para agrupar consultas por mês (últimos 12 meses)
export function useAdmConsultasPorMes() {
    // Busca do endpoint dedicado de consultas mensais
    const query = useQuery<{ success: boolean; year: number; counts: number[]; total: number }>({
        queryKey: ['consultasMensais'],
        queryFn: async () => {
            const response = await admConsultasService().getConsultasMensais();
            const data = response.data;
            // Garante estrutura esperada
            return {
                success: !!data?.success,
                year: Number(data?.year) || new Date().getFullYear(),
                counts: Array.isArray(data?.counts) ? data.counts.map((n: unknown) => Number(n) || 0) : Array(12).fill(0),
                total: Number(data?.total) || 0,
            };
        },
        retry: 1,
        staleTime: 5 * 60 * 1000,
        enabled: true,
    });

    // Labels fixos Jan..Dez
    const labels = useMemo(() => {
        const base = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return base;
    }, []);

    const data = useMemo(() => {
        const counts = query.data?.counts || Array(12).fill(0);
        return counts;
    }, [query.data]);

    return {
        labels,
        data,
        consultas: undefined,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
        year: query.data?.year,
        total: query.data?.total,
    };
}

// Hook para buscar consultas canceladas (da tabela Consulta)
export function useAdmConsultasCanceladas() {
    const query = useQuery<number>({
        queryKey: ['consultasCanceladas'],
        queryFn: async () => {
            const response = await admConsultasService().getConsultasCanceladas();
            return Number(response.data?.total) || 0;
        },
        retry: 1,
        staleTime: 30 * 1000, // 30 segundos
        enabled: true,
    });

    return {
        total: query.data || 0,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}

// Hook para buscar consultas do mês atual (todas, independente do status)
export function useAdmConsultasMesAtual() {
    const query = useQuery<number>({
        queryKey: ['consultasMesAtual'],
        queryFn: async () => {
            const response = await admConsultasService().getConsultasMesAtual();
            return Number(response.data?.total) || 0;
        },
        retry: 1,
        staleTime: 30 * 1000, // 30 segundos
        enabled: true,
    });

    return {
        total: query.data || 0,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}

// Hook para buscar lista completa de consultas do mês atual
export function useAdmConsultasMesAtualLista() {
    const query = useQuery<ConsultasRealizadas[]>({
        queryKey: ['consultasMesAtualLista'],
        queryFn: async () => {
            try {
                // Tenta buscar do endpoint específico primeiro
                try {
                    const response = await admConsultasService().getConsultasMesAtualLista();
                    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
                        return response.data;
                    }
                } catch {
                    // Endpoint pode não existir, continua para fallback
                    console.log('Endpoint mes-atual-lista não disponível, usando fallback');
                }
                
                // Fallback: busca todas as consultas realizadas e filtra pelo mês atual
                const todasConsultas = await getConsultasRealizadas();
                const agora = new Date();
                const mesAtual = agora.getMonth();
                const anoAtual = agora.getFullYear();
                
                return todasConsultas.filter((consulta: ConsultasRealizadas) => {
                    if (!consulta.Date) return false;
                    try {
                        const dataConsulta = new Date(consulta.Date);
                        // Verifica se a data é válida
                        if (isNaN(dataConsulta.getTime())) return false;
                        return dataConsulta.getMonth() === mesAtual && dataConsulta.getFullYear() === anoAtual;
                    } catch {
                        return false;
                    }
                });
            } catch (error) {
                console.error('Erro ao buscar consultas do mês atual:', error);
                return [];
            }
        },
        retry: 1,
        staleTime: 30 * 1000, // 30 segundos
        enabled: true,
    });

    return {
        consultas: query.data || [],
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}

// Hook para buscar consultas mensais (TODAS, não apenas realizadas)
export function useAdmConsultasPorMesTodas() {
    const query = useQuery<{ success: boolean; year: number; counts: number[]; total: number }>({
        queryKey: ['consultasMensaisTodas'],
        queryFn: async () => {
            const response = await admConsultasService().getConsultasMensaisTodas();
            const data = response.data;
            return {
                success: !!data?.success,
                year: Number(data?.year) || new Date().getFullYear(),
                counts: Array.isArray(data?.counts) ? data.counts.map((n: unknown) => Number(n) || 0) : Array(12).fill(0),
                total: Number(data?.total) || 0,
            };
        },
        retry: 1,
        staleTime: 30 * 1000,
        enabled: true,
    });

    const labels = useMemo(() => {
        return ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    }, []);

    const data = useMemo(() => {
        const counts = query.data?.counts || Array(12).fill(0);
        return counts;
    }, [query.data]);

    return {
        labels,
        data,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
        year: query.data?.year,
        total: query.data?.total,
    };
}