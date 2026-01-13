// hooks/useFileUrl.ts
import { api } from '@/lib/axios';
import { useState, useEffect } from 'react';

interface UseFileUrlOptions {
    fileId: string;
    type: 'psychologist' | 'patient';
    autoFetch?: boolean;
}

export function useFileUrl({ fileId, type, autoFetch = true }: UseFileUrlOptions) {
    const [url, setUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expiresAt, setExpiresAt] = useState<Date | null>(null);

    const fetchUrl = async () => {
        try {
            setLoading(true);
            setError(null);

            const endpoint = type === 'psychologist'
                ? `/files/psychologist/documents/${fileId}`
                : `/files/patient/documents/${fileId}`;

            const response = await api.get(endpoint);

            setUrl(response.data.url);
            setExpiresAt(new Date(response.data.expiresAt));
        } catch (err: unknown) {
            const errorMessage = err instanceof Error && 'response' in err
                ? (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Erro ao carregar arquivo'
                : 'Erro ao carregar arquivo';
            setError(errorMessage);
            setUrl(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (autoFetch && fileId) {
            fetchUrl();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fileId, type, autoFetch]);

    return { url, loading, error, expiresAt, refetch: fetchUrl };
}

