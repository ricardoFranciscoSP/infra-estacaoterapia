import { api } from '@/lib/axios';
import { AxiosResponse } from 'axios';

export interface User {
    Id: string;
    Nome: string;
    Email: string;
    Cpf: string;
    Role: 'Admin' | 'Patient' | 'Psychologist' | 'Management' | 'Finance';
    Status: string;
    Crp?: string | null;
    CreatedAt: string;
}

export interface ListUsersParams {
    search?: string;
    role?: 'Admin' | 'Patient' | 'Psychologist' | 'Management' | 'Finance' | 'Todos';
}

export const userService = {
    list: (params?: ListUsersParams): Promise<AxiosResponse<User[]>> => {
        const queryParams = new URLSearchParams();
        if (params?.search) queryParams.append('search', params.search);
        if (params?.role && params.role !== 'Todos') queryParams.append('role', params.role);
        
        const queryString = queryParams.toString();
        return api.get(`/admin/users${queryString ? `?${queryString}` : ''}`);
    },
    updateRole: (userId: string, role: User['Role']): Promise<AxiosResponse<{ success: boolean; message?: string }>> =>
        api.patch(`/admin/users/${userId}/role`, { role }),
};

