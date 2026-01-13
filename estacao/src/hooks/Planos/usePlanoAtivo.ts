import { useAuthStore } from '@/store/authStore';

export function usePlanoAtivo() {
    const user = useAuthStore((s) => s.user);
    const planoCompra = user?.PlanoCompra;
    const ultimoPlano = planoCompra && planoCompra.length > 0
        ? planoCompra[planoCompra.length - 1]
        : null;
    const planoAtivo = ultimoPlano && ultimoPlano.Status === 'ativo';
    return { planoAtivo, ultimoPlano, planoCompra };
}
