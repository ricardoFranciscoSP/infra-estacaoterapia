import { useAuthStore } from '@/store/authStore';

export function useAuth() {
    const user = useAuthStore((state) => state.user);
    const isLoading = useAuthStore((state) => state.isLoading);
    const socketConnected = useAuthStore((state) => state.socketConnected);
    const notifications = useAuthStore((state) => state.notifications);
    const fetchUser = useAuthStore((state) => state.fetchUser);
    const logout = useAuthStore((state) => state.logout);
    const login = useAuthStore((state) => state.login);
    const register = useAuthStore((state) => state.register);
    const forgot = useAuthStore((state) => state.forgot);
    const reset = useAuthStore((state) => state.reset);
    const setUser = useAuthStore((state) => state.setUser);

    return {
        user,
        isLoading,
        socketConnected,
        notifications,
        fetchUser,
        logout,
        login,
        register,
        forgot,
        reset,
        setUser,
    };
}


