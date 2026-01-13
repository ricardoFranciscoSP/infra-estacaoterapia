import { api } from './axios';

export async function fetchMe() {
    try {
        const { data } = await api.get('/users/me');
        // Suporta resposta { user: {...} } ou apenas {...}
        const user = data?.user ?? data;
        return user;
    } catch (error) {
        throw error;
    }
}

export async function logout() {
    try {
        const response = await api.post('/auth/logout', {});

        const data = response.data;

        if (response.status === 200 && data.success) {
            // Limpar cookies usando js-cookie
            if (typeof window !== 'undefined') {
                const { default: Cookies } = await import('js-cookie');
                Cookies.remove('user-data-client', { path: '/' });
                Cookies.remove('onboarding-data-client', { path: '/' });
                Cookies.remove('token', { path: '/' });
                Cookies.remove('refreshToken', { path: '/' });
                Cookies.remove('role', { path: '/' });
                sessionStorage.clear();
            }

            return { success: true };
        }

        return { success: false, error: data.error };
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
        return { success: false, error: 'Erro ao fazer logout' };
    }
}