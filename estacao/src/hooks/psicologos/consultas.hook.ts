import { useQuery } from '@tanstack/react-query';
import { ConsultasPendentes, ConsultasRealizadas, taxaOcupacao, ProximasConsultas } from '@/types/psicologoTypes';
import useConsultasPsicologoStore from '@/store/psicologos/consultasStore';
import { admPsicologoService } from '@/services/admPsicologoService';

export function useObterConsultasRealizadas() {
    const obterConsultas = useConsultasPsicologoStore(state => state.fetchConsultasRealizadas);
    const query = useQuery<ConsultasRealizadas>({
        queryKey: ['consultas'],
        queryFn: async () => {
            await obterConsultas();
            // Buscar o valor atualizado do store após o await
            const consultasAtual = useConsultasPsicologoStore.getState().consultasRealizadas;
            if (consultasAtual && typeof consultasAtual.totalConsultas === 'number') {
                return consultasAtual;
            }
            return { totalConsultas: 0 };
        },
        enabled: true,
        retry: 1,
        staleTime: 5 * 60 * 1000,
    });

    return {
        totalConsultas: query.data ?? { totalConsultas: 0 },
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}

import dayjs from 'dayjs';

export function useObterTaxaOcupacao() {
    // Calcula o primeiro e último dia do mês atual
    const dataInicio = dayjs().startOf('month').format('YYYY-MM-DD');
    const dataFim = dayjs().endOf('month').format('YYYY-MM-DD');

    const query = useQuery<taxaOcupacao>({
        queryKey: ['taxaOcupacao', dataInicio, dataFim],
        queryFn: async () => {
            const { data } = await admPsicologoService().taxaOcupacao(dataInicio, dataFim);
            if (data && typeof data.percentualOcupacao === 'number') {
                return data;
            }
            return { percentualOcupacao: 0 };
        },
        enabled: true,
        retry: 1,
        staleTime: 5 * 60 * 1000,
    });

    return {
        taxaOcupacao: query.data ?? { percentualOcupacao: 0 },
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}

export function useObterConsultasPendentes() {
    const obterConsultasPendentes = useConsultasPsicologoStore(state => state.fetchConsultasPendentes);
    const query = useQuery<ConsultasPendentes>({
        queryKey: ['consultasPendentes'], // <-- ajuste aqui!
        queryFn: async () => {
            await obterConsultasPendentes();
            // Buscar o valor atualizado do store após o await
            const consultasPendentesAtual = useConsultasPsicologoStore.getState().consultasPendentes;
            if (consultasPendentesAtual && typeof consultasPendentesAtual.totalPendentes === 'number') {
                return consultasPendentesAtual;
            }
            return {
                totalPendentes: 0
            };
        },
        enabled: true,
        retry: 1,
        staleTime: 5 * 60 * 1000,
    });

    return {
        consultasPendentes: query.data ?? {
            totalPendentes: 0
        },
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}

export function useObterProximasConsultas() {
    const obterProximasConsultas = useConsultasPsicologoStore(state => state.fetchProximasConsultas);
    const query = useQuery<ProximasConsultas[]>({
        queryKey: ['proximasConsultas'],
        queryFn: async () => {
            await obterProximasConsultas();
            const proximasConsultasAtual = useConsultasPsicologoStore.getState().proximasConsultas;
            if (Array.isArray(proximasConsultasAtual)) {
                return proximasConsultasAtual;
            }
            return [];
        },
        enabled: true,
        retry: 1,
        staleTime: 30 * 1000, // 30 segundos - dados considerados frescos
        refetchInterval: 60 * 1000, // Atualiza automaticamente a cada 60 segundos
        refetchIntervalInBackground: true, // Continua atualizando mesmo quando a aba está em background
        refetchOnWindowFocus: true, // Atualiza quando a janela recebe foco
    });

    return {
        proximasConsultas: query.data ?? [],
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}

/**
 * Hook para buscar a próxima consulta do psicólogo no formato com nextReservation
 * Similar ao endpoint de pacientes
 */
export function useObterProximaConsultaPsicologo() {
    const query = useQuery<{
        success: boolean;
        nextReservation?: ProximasConsultas;
        consultaAtual?: ProximasConsultas;
        futuras?: ProximasConsultas[];
        total?: number;
        idProximaConsulta?: string;
        error?: string;
    }>({
        queryKey: ['proximaConsultaPsicologo'],
        queryFn: async () => {
            const result = await admPsicologoService().proximaConsulta();
            return result.data;
        },
        enabled: true,
        retry: 1,
        staleTime: 0, // Sempre busca dados frescos
        refetchOnWindowFocus: true, // Atualiza quando a janela recebe foco
        refetchInterval: 5 * 1000, // Atualiza automaticamente a cada 5 segundos para mostrar consulta em andamento sempre
    });

    return {
        proximaConsulta: query.data?.nextReservation || null,
        consultaAtual: query.data?.consultaAtual || null,
        futuras: query.data?.futuras || [],
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}

/**
 * Hook para buscar a contagem de consultas do psicólogo no mês atual
 */
export function useObterConsultasNoMes(mes?: number, ano?: number) {
    const mesAtual = mes ?? new Date().getMonth() + 1;
    const anoAtual = ano ?? new Date().getFullYear();

    const query = useQuery<{ success: boolean; mes: number; ano: number; total: number }>({
        queryKey: ['consultasNoMes', mesAtual, anoAtual],
        queryFn: async () => {
            const result = await admPsicologoService().contarConsultasPorMes(mesAtual, anoAtual);
            return result.data;
        },
        enabled: true,
        retry: 1,
        staleTime: 5 * 60 * 1000, // 5 minutos
    });

    return {
        totalConsultasNoMes: query.data?.total ?? 0,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}

/**
 * Hook para buscar histórico de consultas com filtros
 */
// Tipo para consulta do histórico
type ConsultaHistoricoItem = {
    Id: string;
    Date: string;
    Time: string;
    Status: string;
    Paciente?: {
        Nome?: string;
    };
    Psicologo?: {
        Nome?: string;
    };
};

export function useObterHistoricoConsultas(filtros?: {
    status?: 'todos' | 'efetuada' | 'cancelada';
    buscaPaciente?: string;
    dataInicial?: string;
    dataFinal?: string;
    page?: number;
    pageSize?: number;
}) {
    const query = useQuery<{
        success: boolean;
        data: ConsultaHistoricoItem[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
    }>({
        queryKey: ['historicoConsultas', filtros],
        queryFn: async () => {
            const result = await admPsicologoService().listarHistoricoConsultas(filtros);
            return result.data;
        },
        enabled: true,
        retry: 1,
        staleTime: 30 * 1000, // 30 segundos
    });

    return {
        consultas: query.data?.data ?? [],
        total: query.data?.total ?? 0,
        page: query.data?.page ?? 1,
        pageSize: query.data?.pageSize ?? 10,
        totalPages: query.data?.totalPages ?? 0,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}
