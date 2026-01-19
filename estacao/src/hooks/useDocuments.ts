// hooks/useDocuments.ts
import { documentsFilesService } from '@/services/documentsFiles';
import { useState, useEffect, useCallback, useMemo } from 'react';

export interface Document {
    id: string;
    fileName: string;
    type: string;
    url: string | null;
    expiresAt: string | null;
    createdAt: string;
    updatedAt: string;
    description: string;
    error: string | null;
    fileExists: boolean;
}

export interface UseDocumentsReturn {
    documents: Document[];
    loading: boolean;
    error: string | null;
    psychologistName: string | null;
    refetch: () => Promise<void>;
    refreshDocumentUrl: (documentId: string) => Promise<{ url: string | null; expiresAt: string | null } | null>;
    downloadDocument: (documentId: string) => Promise<void>;
    deleteDocument: (documentId: string) => Promise<void>;
    getDocumentThumbnail: (documentId: string, size?: number) => Promise<string | null>;
    validateDocuments: (documentIds: string[]) => Promise<void>;
    isUrlExpired: (expiresAt: string | null) => boolean;
    formatExpirationTime: (expiresAt: string | null) => string;
}

export function useDocuments(profileId: string | undefined): UseDocumentsReturn {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [psychologistName, setPsychologistName] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Memoizar o service para evitar recriação desnecessária
    const service = useMemo(() => documentsFilesService(), []);

    /**
     * Buscar todos os documentos do psicólogo
     */
    const fetchDocuments = useCallback(async () => {
        if (!profileId || profileId === "") {
            setDocuments([]);
            setLoading(false);
            return;
        }

        console.log('[useDocuments] Buscando documentos para profileId:', profileId);

        try {
            setLoading(true);
            setError(null);

            const response = await service.listDocumentsByProfile(profileId);
            setDocuments(response.data.documents);
            setPsychologistName(response.data.psychologist);

            console.log('[useDocuments] Documentos carregados:', response.data.documents.length);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error && 'response' in err
                ? (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Erro ao carregar documentos'
                : 'Erro ao carregar documentos';
            setError(errorMessage);
            console.error('[useDocuments] Erro ao buscar documentos:', err);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profileId]);    /**
     * Atualizar URL de um documento específico (quando expirar)
     */
    const refreshDocumentUrl = useCallback(async (documentId: string) => {
        try {
            const response = await service.getDocument(documentId);

            // Atualiza apenas o documento específico
            setDocuments(prev => prev.map(doc =>
                doc.id === documentId
                    ? {
                        ...doc,
                        url: response.data.url,
                        expiresAt: response.data.expiresAt,
                        fileExists: true,
                        error: null
                    }
                    : doc
            ));
            return { url: response.data.url ?? null, expiresAt: response.data.expiresAt ?? null };
        } catch (err: unknown) {
            console.error('Erro ao atualizar URL do documento:', err);

            // Marca o documento com erro
            setDocuments(prev => prev.map(doc =>
                doc.id === documentId
                    ? { ...doc, error: 'Erro ao renovar URL', fileExists: false }
                    : doc
            ));
            return null;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Baixar documento com nome amigável
     */
    const downloadDocument = useCallback(async (documentId: string) => {
        try {
            const response = await service.downloadDocument(documentId);

            // Abre o download em nova aba
            window.open(response.data.downloadUrl, '_blank');
        } catch (err: unknown) {
            console.error('Erro ao baixar documento:', err);
            const errorMessage = err instanceof Error && 'response' in err
                ? (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Erro ao baixar documento'
                : 'Erro ao baixar documento';
            throw new Error(errorMessage);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Excluir documento (banco + storage)
     */
    const deleteDocument = useCallback(async (documentId: string) => {
        try {
            await service.deleteDocument(documentId);
            
            // Remove o documento da lista local
            setDocuments(prev => prev.filter(doc => doc.id !== documentId));
        } catch (err: unknown) {
            console.error('Erro ao excluir documento:', err);
            const errorMessage = err instanceof Error && 'response' in err
                ? (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Erro ao excluir documento'
                : 'Erro ao excluir documento';
            throw new Error(errorMessage);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Obter thumbnail de um documento (imagens)
     */
    const getDocumentThumbnail = useCallback(async (documentId: string, size: number = 200): Promise<string | null> => {
        try {
            const response = await service.getDocumentThumbnail(documentId, size);
            return response.data.thumbnailUrl;
        } catch (err: unknown) {
            console.error('Erro ao gerar thumbnail:', err);
            return null;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Validar existência de múltiplos documentos (admin)
     */
    const validateDocuments = useCallback(async (documentIds: string[]) => {
        try {
            const response = await service.validateDocuments(documentIds);

            // Atualiza status de fileExists baseado na validação
            setDocuments(prev => prev.map(doc => {
                const validation = response.data.results.find(r => r.documentId === doc.id);
                return validation
                    ? { ...doc, fileExists: validation.exists }
                    : doc;
            }));
        } catch (err: unknown) {
            console.error('Erro ao validar documentos:', err);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Verifica se URL expirou
     */
    const isUrlExpired = useCallback((expiresAt: string | null): boolean => {
        if (!expiresAt) return true;
        return service.isUrlExpired(expiresAt);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Formata tempo de expiração
     */
    const formatExpirationTime = useCallback((expiresAt: string | null): string => {
        if (!expiresAt) return 'Sem URL';
        return service.formatExpirationTime(expiresAt);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Buscar documentos ao montar ou quando profileId mudar
     */
    useEffect(() => {
        if (profileId && profileId !== "") {
            fetchDocuments();
        }
    }, [profileId, fetchDocuments]);

    /**
     * Auto-renovar URLs que estão próximas de expirar (< 2 minutos)
     */
    useEffect(() => {
        // Não executa se não há profileId ou documentos
        if (!profileId || profileId === "" || documents.length === 0) return;

        const interval = setInterval(() => {
            documents.forEach(doc => {
                if (doc.expiresAt && doc.url) {
                    const timeLeft = service.getTimeUntilExpiration(doc.expiresAt);
                    // Renova se faltarem menos de 2 minutos
                    if (timeLeft < 120 && timeLeft > 0) {
                        refreshDocumentUrl(doc.id);
                    }
                }
            });
        }, 60000); // Verifica a cada minuto

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profileId, documents.length]); // Usa profileId e length para controle

    return {
        documents,
        loading,
        error,
        psychologistName,
        refetch: fetchDocuments,
        refreshDocumentUrl,
        downloadDocument,
        deleteDocument,
        getDocumentThumbnail,
        validateDocuments,
        isUrlExpired,
        formatExpirationTime
    };
}

/**
 * ============================================================================
 * EXEMPLOS DE USO
 * ============================================================================
 */

/**
 * Exemplo 1: Listar documentos
 * 
 * const { documents, loading, psychologistName } = useDocuments('profile-123');
 */

/**
 * Exemplo 2: Baixar documento
 * 
 * const { downloadDocument } = useDocuments('profile-123');
 * 
 * await downloadDocument('doc-id');
 */

/**
 * Exemplo 3: Renovar URL expirada
 * 
 * const { documents, refreshDocumentUrl, isUrlExpired } = useDocuments('profile-123');
 * 
 * if (isUrlExpired(document.expiresAt)) {
 *   await refreshDocumentUrl(document.id);
 * }
 */

/**
 * Exemplo 4: Validar documentos (admin)
 * 
 * const { validateDocuments, documents } = useDocuments('profile-123');
 * 
 * const documentIds = documents.map(d => d.id);
 * await validateDocuments(documentIds);
 */