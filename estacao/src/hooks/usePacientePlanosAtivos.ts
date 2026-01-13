import { useQuery } from '@tanstack/react-query';
import { Plano } from '@/store/planoStore';
import { api } from '@/lib/axios';

export function usePacientePlanosAtivos() {
    return useQuery<Plano[], Error>({
        queryKey: ['planos-ativos-paciente'],
        queryFn: async () => {
            const res = await api.get('/planos/paciente');
            return res.data as Plano[];
        },
    });
}
