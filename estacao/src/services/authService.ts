import { api } from "@/lib/axios";
import { RegisterData } from "@/store/authStore";

export const authService = () => {
    return {
        getUser: () => api.get('/auth/user'),
        register: (data: RegisterData) => api.post('/auth/register', data),
        login: (email: string, password: string) =>
            api.post('/auth/login', { email, password }),
        forgot: (email: string) => api.post('/auth/forgot-password', { email }),
        reset: (token: string, password: string) => api.post('/auth/reset-password', { token, newPassword: password }),
        logout: () => api.post('/auth/logout'),
    };
}