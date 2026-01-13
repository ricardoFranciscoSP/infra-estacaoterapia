// hooks/useProtectedRoute.ts
"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { parseCookies } from "nookies";
import { useAuth } from "@/hooks/authHook";

export function useProtectedRoute(requiredRole?: string) {
    const router = useRouter();
    const { user, fetchUser, isLoading } = useAuth();
    const hasCheckedRef = useRef(false);
    const fetchAttemptedRef = useRef(false);
    const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Limpa timeout anterior se existir
        if (redirectTimeoutRef.current) {
            clearTimeout(redirectTimeoutRef.current);
            redirectTimeoutRef.current = null;
        }

        // Se está carregando, não faz nada - aguarda o carregamento completo
        if (isLoading) {
            hasCheckedRef.current = false;
            return;
        }

        // Verifica se há token de autenticação antes de redirecionar
        const hasToken = typeof window !== 'undefined'
            ? !!parseCookies().token
            : false;

        // Se não há usuário, busca do backend (apenas uma vez)
        if (!user) {
            if (!fetchAttemptedRef.current) {
                fetchAttemptedRef.current = true;
                fetchUser().catch((error) => {
                    console.error('[useProtectedRoute] Erro ao buscar usuário:', error);
                });
            }

            // Só redireciona se não houver token (usuário realmente não está logado)
            if (!hasToken) {
                // Aguarda um pouco antes de redirecionar para dar tempo do fetchUser completar
                redirectTimeoutRef.current = setTimeout(() => {
                    // Verifica novamente se ainda não há usuário e não há token
                    const stillNoToken = typeof window !== 'undefined'
                        ? !parseCookies().token
                        : true;

                    if (stillNoToken) {
                        console.warn('[useProtectedRoute] Usuário não encontrado e sem token, redirecionando para login');
                        router.replace("/login");
                    }
                }, 3000); // Aguarda 3 segundos
            }

            return;
        }

        // Se usuário existe, mas não tem Role, redireciona para login
        if (!user.Role) {
            console.warn('[useProtectedRoute] Usuário sem Role, redirecionando para login');
            router.replace("/login");
            return;
        }

        // Verificação especial para Finance: só pode acessar /adm-finance
        if (user.Role === "Finance") {
            const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
            if (!currentPath.startsWith('/adm-finance') &&
                currentPath !== '/adm-login' &&
                currentPath !== '/no-permission' &&
                !currentPath.startsWith('/_next') &&
                !currentPath.startsWith('/api')) {
                console.log('[useProtectedRoute] Finance tentando acessar rota não autorizada:', currentPath);
                router.replace("/no-permission");
                return;
            }
        }

        // Se role não bate com o esperado, redireciona para permissão negada
        // IMPORTANTE: Esta verificação é apenas para role, não para status
        // A verificação de status (Ativo/EmAnalise) é feita no ClientPainelLayout
        if (requiredRole && user.Role !== requiredRole) {
            console.log('[useProtectedRoute] Role não corresponde:', {
                requiredRole,
                userRole: user.Role,
                userStatus: user.Status,
                userId: user.Id
            });
            router.replace("/no-permission");
            return;
        }

        // Se chegou aqui, o role está correto
        // O status será verificado no ClientPainelLayout
        hasCheckedRef.current = true;
        fetchAttemptedRef.current = true;
    }, [user, router, requiredRole, fetchUser, isLoading]);

    // Cleanup do timeout ao desmontar
    useEffect(() => {
        return () => {
            if (redirectTimeoutRef.current) {
                clearTimeout(redirectTimeoutRef.current);
            }
        };
    }, []);
}