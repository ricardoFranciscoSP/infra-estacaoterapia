'use client';

import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/axios';
import type { AxiosErrorResponse } from '@/types/axiosError.types';

interface CheckTokensResponse {
    success: boolean;
    tokensExist: boolean;
    tokensGenerated?: boolean;
    message: string;
    consultaId: string;
    patientTokenExists: boolean;
    psychologistTokenExists: boolean;
    error?: string;
}

interface UseCheckTokensReturn {
    checkAndGenerateTokens: (consultaId: string, onSuccess?: () => void | Promise<void>) => Promise<CheckTokensResponse | null>;
    isLoading: boolean;
    error: string | null;
}

/**
 * Hook para verificar se os tokens Agora foram gerados
 * Se não foram, gera automaticamente
 * Garante que cada ReservaSessao seja única
 */
export function useCheckTokens(): UseCheckTokensReturn {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const checkAndGenerateTokens = useCallback(
        async (consultaId: string, onSuccess?: () => void | Promise<void>): Promise<CheckTokensResponse | null> => {
            if (!consultaId) {
                const errMsg = 'ID da consulta é obrigatório';
                setError(errMsg);
                toast.error(errMsg);
                return null;
            }

            setIsLoading(true);
            setError(null);

            try {
                console.log(`[useCheckTokens] Verificando tokens para consulta: ${consultaId}`);

                // A rota no backend está montada como /room/check-and-generate-tokens
                const response = await api.post('/room/check-and-generate-tokens', { consultaId });
                const data: CheckTokensResponse = response.data;

                if (data.success && data.tokensExist) {
                    console.log(`✅ [useCheckTokens] Tokens verificados/gerados com sucesso:`, {
                        consultaId: data.consultaId,
                        patientTokenExists: data.patientTokenExists,
                        psychologistTokenExists: data.psychologistTokenExists,
                        tokensGenerated: data.tokensGenerated,
                    });

                    if (data.tokensGenerated) {
                        toast.success('Tokens foram gerados com sucesso!');
                    }

                    // Chama callback de sucesso se fornecido (útil para fazer refetch da reserva)
                    if (onSuccess) {
                        try {
                            await onSuccess();
                        } catch (callbackError) {
                            console.error('[useCheckTokens] Erro no callback onSuccess:', callbackError);
                        }
                    }

                    return data;
                } else {
                    const errMsg = data.message || 'Não foi possível garantir que os tokens existem';
                    setError(errMsg);
                    toast.error(errMsg);
                    console.warn(`[useCheckTokens] Falha:`, data);
                    return null;
                }
            } catch (err: unknown) {
                const axiosError = err as AxiosErrorResponse;
                const errorMsg = axiosError?.response?.data?.error || axiosError?.response?.data?.message || (err instanceof Error ? err.message : 'Erro ao verificar tokens');
                const statusCode = axiosError?.response?.status;
                
                setError(errorMsg);
                console.error(`[useCheckTokens] Erro na requisição:`, {
                    message: errorMsg,
                    status: statusCode,
                    error: err
                });

                if (statusCode === 401) {
                    toast.error('Você não está autenticado');
                } else if (statusCode === 403) {
                    toast.error('Você não tem acesso a esta consulta');
                } else if (statusCode === 404) {
                    toast.error('Consulta não encontrada');
                } else {
                    toast.error(errorMsg);
                }

                return null;
            } finally {
                setIsLoading(false);
            }
        },
        []
    );

    return {
        checkAndGenerateTokens,
        isLoading,
        error,
    };
}
