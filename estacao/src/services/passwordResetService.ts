import { api } from '@/lib/axios';
import { AxiosResponse } from 'axios';

export interface GenerateResetLinkResponse {
    message: string;
    resetLink?: string;
    expiresAt?: string;
}

export interface GenerateRandomPasswordResponse {
    message: string;
    password?: string;
    warning?: string;
}

export const passwordResetService = {
    generateResetLink: async (userId: string): Promise<AxiosResponse<GenerateResetLinkResponse>> =>
        api.post(`/admin/password-reset/generate-link/${userId}`),
    
    generateRandomPassword: async (userId: string): Promise<AxiosResponse<GenerateRandomPasswordResponse>> =>
        api.post(`/admin/password-reset/generate-random/${userId}`),
};

