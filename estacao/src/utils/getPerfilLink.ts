import { NextRouter } from 'next/router';

export function getPerfilLink(
    router: NextRouter | undefined,
    p: { id: string | number }
) {
    let path = router?.asPath || router?.pathname;
    if (!path && typeof window !== "undefined") {
        path = window.location.pathname;
    }
    path = path || "";
    if (path.startsWith("/painel")) {
        return `/painel/psicologo/${p.id}`;
    }
    return `/psicologo/${p.id}`;
}
