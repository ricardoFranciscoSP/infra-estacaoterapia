import { useQuery } from '@tanstack/react-query';
import { auditoriaService } from '@/services/auditoriaService';
import { FiltrosAuditoria, PaginatedAuditResult } from '@/types/auditoria';

export function useAudits(filtros: FiltrosAuditoria = {}) {
    const query = useQuery<PaginatedAuditResult>({
        queryKey: ['audits', filtros],
        queryFn: async () => {
            const response = await auditoriaService.list(filtros);
            // A API retorna { success: true, data: PaginatedAuditResult }
            return response.data.data;
        },
        staleTime: 30 * 1000, // 30 segundos
        gcTime: 5 * 60 * 1000, // 5 minutos
        refetchOnWindowFocus: false,
    });

    return {
        audits: query.data?.audits ?? [],
        pagination: query.data?.pagination ?? {
            total: 0,
            page: 1,
            limit: 50,
            totalPages: 0,
        },
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch,
    };
}
