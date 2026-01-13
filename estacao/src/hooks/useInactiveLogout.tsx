// hooks/useInactiveLogout.ts
import { useEffect } from 'react';

const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 hora em milissegundos

interface UseInactiveLogoutProps {
    logoutFunction: () => void;
}

export function useInactiveLogout(logoutFunction: UseInactiveLogoutProps['logoutFunction']): void {
    useEffect(() => {
        let timeoutId: ReturnType<typeof setTimeout>;

        const resetTimeout = (): void => {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(logoutFunction, INACTIVITY_TIMEOUT);
        };

        const handleUserActivity = (): void => {
            resetTimeout();
        };

        // Eventos que indicam atividade do usuário
        const events: string[] = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

        events.forEach((event: string) => {
            window.addEventListener(event, handleUserActivity);
        });

        // Iniciar o primeiro timeout
        resetTimeout();

        // Limpeza ao desmontar
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            events.forEach((event: string) => {
                window.removeEventListener(event, handleUserActivity);
            });
        };
    }, [logoutFunction]);
}