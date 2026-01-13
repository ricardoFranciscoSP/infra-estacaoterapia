import { useMutation } from '@tanstack/react-query';
import { passwordResetService, GenerateResetLinkResponse, GenerateRandomPasswordResponse } from '@/services/passwordResetService';
import toast from 'react-hot-toast';

export function useGenerateResetLink() {
    const mutation = useMutation<GenerateResetLinkResponse, Error, string>({
        mutationFn: async (userId: string) => {
            const response = await passwordResetService.generateResetLink(userId);
            return response.data;
        },
        onSuccess: (data) => {
            toast.success(data.message || 'Link de redefinição gerado e enviado por e-mail com sucesso.');
        },
        onError: (error: Error & { response?: { data?: { error?: string } } }) => {
            console.error('Erro ao gerar link de redefinição:', error);
            const errorMessage = error.response?.data?.error || 'Erro ao gerar link de redefinição. Tente novamente.';
            toast.error(errorMessage);
        },
    });

    return {
        generateResetLink: mutation.mutateAsync,
        isLoading: mutation.isPending,
        isError: mutation.isError,
        error: mutation.error,
        data: mutation.data,
    };
}

export function useGenerateRandomPassword() {
    const mutation = useMutation<GenerateRandomPasswordResponse, Error, string>({
        mutationFn: async (userId: string) => {
            const response = await passwordResetService.generateRandomPassword(userId);
            return response.data;
        },
        onSuccess: (data) => {
            toast.success(data.message || 'Senha aleatória gerada e enviada por e-mail com sucesso.');
        },
        onError: (error: Error & { response?: { data?: { error?: string } } }) => {
            console.error('Erro ao gerar senha aleatória:', error);
            const errorMessage = error.response?.data?.error || 'Erro ao gerar senha aleatória. Tente novamente.';
            toast.error(errorMessage);
        },
    });

    return {
        generateRandomPassword: mutation.mutateAsync,
        isLoading: mutation.isPending,
        isError: mutation.isError,
        error: mutation.error,
        data: mutation.data,
    };
}

