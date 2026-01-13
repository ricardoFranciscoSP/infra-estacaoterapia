// store/useDocumentStore.ts
import { documentsFilesService } from '@/services/documentsFiles';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEffect } from 'react';

export interface Document {
    id: string;
    fileName: string;
    type: string;
    url: string | null;
    expiresAt: string | null;
    description: string;
    createdAt: string;
    updatedAt: string;
    error: string | null;
    fileExists: boolean;
}

interface DocumentCache {
    [profileId: string]: {
        documents: Document[];
        psychologistName: string;
        lastFetch: number;
    };
}

interface DocumentStore {
    // Estado
    cache: DocumentCache;
    currentProfileId: string | null;
    loading: boolean;
    error: string | null;

    // Getters
    getCurrentDocuments: () => Document[];
    getCurrentPsychologist: () => string | null;

    // Ações - Documentos
    fetchDocuments: (profileId: string) => Promise<void>;
    refreshDocumentUrl: (documentId: string) => Promise<void>;
    downloadDocument: (documentId: string) => Promise<void>;
    getDocumentThumbnail: (documentId: string, size?: number) => Promise<string | null>;

    // Ações - Múltiplos
    fetchBatchDocuments: (documentIds: string[]) => Promise<void>;
    validateDocuments: (documentIds: string[]) => Promise<void>;

    // Ações - Avatar
    getUserAvatar: (userId: string, size?: number) => Promise<string | null>;
    getUserAvatarFull: (userId: string) => Promise<string | null>;

    // Utilitários
    isUrlExpired: (expiresAt: string | null) => boolean;
    formatExpirationTime: (expiresAt: string | null) => string;
    isCacheValid: (profileId: string, maxAge?: number) => boolean;

    // Limpeza
    clearCache: () => void;
    clearCurrentProfile: () => void;
    setCurrentProfile: (profileId: string) => void;
}

const CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutos

export const useDocumentStore = create<DocumentStore>()(
    persist(
        (set, get) => {
            const service = documentsFilesService();

            return {
                // ============================================================================
                // ESTADO INICIAL
                // ============================================================================
                cache: {},
                currentProfileId: null,
                loading: false,
                error: null,

                // ============================================================================
                // GETTERS
                // ============================================================================

                getCurrentDocuments: () => {
                    const { cache, currentProfileId } = get();
                    if (!currentProfileId || !cache[currentProfileId]) return [];
                    return cache[currentProfileId].documents;
                },

                getCurrentPsychologist: () => {
                    const { cache, currentProfileId } = get();
                    if (!currentProfileId || !cache[currentProfileId]) return null;
                    return cache[currentProfileId].psychologistName;
                },

                // ============================================================================
                // AÇÕES - DOCUMENTOS
                // ============================================================================

                fetchDocuments: async (profileId: string) => {
                    // Verifica cache válido
                    if (get().isCacheValid(profileId)) {
                        set({ currentProfileId: profileId });
                        return;
                    }

                    set({ loading: true, error: null, currentProfileId: profileId });

                    try {
                        const response = await service.listDocumentsByProfile(profileId);

                        set(state => ({
                            cache: {
                                ...state.cache,
                                [profileId]: {
                                    documents: response.data.documents,
                                    psychologistName: response.data.psychologist,
                                    lastFetch: Date.now()
                                }
                            },
                            loading: false
                        }));
                    } catch (error: unknown) {
                        const errorMessage = error instanceof Error && 'response' in error
                            ? (error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Erro ao carregar documentos'
                            : 'Erro ao carregar documentos';
                        set({
                            error: errorMessage,
                            loading: false
                        });
                        throw error;
                    }
                },

                refreshDocumentUrl: async (documentId: string) => {
                    const { currentProfileId } = get();
                    if (!currentProfileId) return;

                    try {
                        const response = await service.getDocument(documentId);

                        set(state => ({
                            cache: {
                                ...state.cache,
                                [currentProfileId]: {
                                    ...state.cache[currentProfileId],
                                    documents: state.cache[currentProfileId].documents.map(doc =>
                                        doc.id === documentId
                                            ? {
                                                ...doc,
                                                url: response.data.url,
                                                expiresAt: response.data.expiresAt,
                                                fileExists: true,
                                                error: null
                                            }
                                            : doc
                                    )
                                }
                            }
                        }));
                    } catch (error: unknown) {
                        console.error('Erro ao renovar URL:', error);

                        // Marca documento com erro
                        set(state => ({
                            cache: {
                                ...state.cache,
                                [currentProfileId]: {
                                    ...state.cache[currentProfileId],
                                    documents: state.cache[currentProfileId].documents.map(doc =>
                                        doc.id === documentId
                                            ? { ...doc, error: 'Erro ao renovar URL', fileExists: false }
                                            : doc
                                    )
                                }
                            }
                        }));
                    }
                },

                downloadDocument: async (documentId: string) => {
                    try {
                        const response = await service.downloadDocument(documentId);
                        window.open(response.data.downloadUrl, '_blank');
                    } catch (error: unknown) {
                        console.error('Erro ao baixar documento:', error);
                        const errorMessage = error instanceof Error && 'response' in error
                            ? (error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Erro ao baixar documento'
                            : 'Erro ao baixar documento';
                        throw new Error(errorMessage);
                    }
                },

                getDocumentThumbnail: async (documentId: string, size: number = 200): Promise<string | null> => {
                    try {
                        const response = await service.getDocumentThumbnail(documentId, size);
                        return response.data.thumbnailUrl;
                    } catch (error: unknown) {
                        console.error('Erro ao gerar thumbnail:', error);
                        return null;
                    }
                },

                // ============================================================================
                // AÇÕES - MÚLTIPLOS
                // ============================================================================

                fetchBatchDocuments: async (documentIds: string[]) => {
                    try {
                        const response = await service.getBatchDocuments(documentIds);

                        const { currentProfileId } = get();
                        if (!currentProfileId) return;

                        // Atualiza URLs dos documentos no cache
                        set(state => ({
                            cache: {
                                ...state.cache,
                                [currentProfileId]: {
                                    ...state.cache[currentProfileId],
                                    documents: state.cache[currentProfileId].documents.map(doc => {
                                        const updated = response.data.documents.find(d => d.id === doc.id);
                                        return updated
                                            ? { ...doc, url: updated.url, expiresAt: updated.expiresAt }
                                            : doc;
                                    })
                                }
                            }
                        }));
                    } catch (error: unknown) {
                        console.error('Erro ao buscar documentos em lote:', error);
                    }
                },

                validateDocuments: async (documentIds: string[]) => {
                    try {
                        const response = await service.validateDocuments(documentIds);

                        const { currentProfileId } = get();
                        if (!currentProfileId) return;

                        // Atualiza fileExists baseado na validação
                        set(state => ({
                            cache: {
                                ...state.cache,
                                [currentProfileId]: {
                                    ...state.cache[currentProfileId],
                                    documents: state.cache[currentProfileId].documents.map(doc => {
                                        const validation = response.data.results.find(r => r.documentId === doc.id);
                                        return validation
                                            ? { ...doc, fileExists: validation.exists }
                                            : doc;
                                    })
                                }
                            }
                        }));
                    } catch (error: unknown) {
                        console.error('Erro ao validar documentos:', error);
                    }
                },

                // ============================================================================
                // AÇÕES - AVATAR
                // ============================================================================

                getUserAvatar: async (userId: string, size: number = 200): Promise<string | null> => {
                    try {
                        const response = await service.getUserAvatar(userId, size);
                        return response.data.avatarUrl;
                    } catch (error: unknown) {
                        console.error('Erro ao buscar avatar:', error);
                        return null;
                    }
                },

                getUserAvatarFull: async (userId: string): Promise<string | null> => {
                    try {
                        const response = await service.getUserAvatarFull(userId);
                        return response.data.avatarUrl;
                    } catch (error: unknown) {
                        console.error('Erro ao buscar avatar completo:', error);
                        return null;
                    }
                },

                // ============================================================================
                // UTILITÁRIOS
                // ============================================================================

                isUrlExpired: (expiresAt: string | null): boolean => {
                    if (!expiresAt) return true;
                    return service.isUrlExpired(expiresAt);
                },

                formatExpirationTime: (expiresAt: string | null): string => {
                    if (!expiresAt) return 'Sem URL';
                    return service.formatExpirationTime(expiresAt);
                },

                isCacheValid: (profileId: string, maxAge: number = CACHE_MAX_AGE): boolean => {
                    const { cache } = get();
                    const cachedData = cache[profileId];

                    if (!cachedData) return false;

                    const age = Date.now() - cachedData.lastFetch;
                    return age < maxAge;
                },

                // ============================================================================
                // LIMPEZA
                // ============================================================================

                clearCache: () => set({ cache: {}, currentProfileId: null, error: null }),

                clearCurrentProfile: () => set({ currentProfileId: null, error: null }),

                setCurrentProfile: (profileId: string) => set({ currentProfileId: profileId })
            };
        },
        {
            name: 'document-storage',
            // Não persistir loading e error
            partialize: (state) => ({
                cache: state.cache,
                currentProfileId: state.currentProfileId
            })
        }
    )
);

/**
 * ============================================================================
 * HOOKS AUXILIARES
 * ============================================================================
 */

/**
 * Hook para auto-renovar URLs próximas de expirar
 */
export const useAutoRenewUrls = () => {
    const documents = useDocumentStore(state => state.getCurrentDocuments());
    const refreshDocumentUrl = useDocumentStore(state => state.refreshDocumentUrl);

    // Verifica URLs a cada minuto
    useEffect(() => {
        const interval = setInterval(() => {
            documents.forEach(doc => {
                if (doc.expiresAt && doc.url) {
                    const timeLeft = documentsFilesService().getTimeUntilExpiration(doc.expiresAt);
                    // Renova se faltarem menos de 2 minutos
                    if (timeLeft < 120 && timeLeft > 0) {
                        refreshDocumentUrl(doc.id);
                    }
                }
            });
        }, 60000);

        return () => clearInterval(interval);
    }, [documents, refreshDocumentUrl]);
};

/**
 * ============================================================================
 * EXEMPLOS DE USO
 * ============================================================================
 */

/**
 * Exemplo 1: Buscar e exibir documentos
 * 
 * const { fetchDocuments, getCurrentDocuments, loading } = useDocumentStore();
 * 
 * useEffect(() => {
 *   fetchDocuments('profile-123');
 * }, []);
 * 
 * const documents = getCurrentDocuments();
 */

/**
 * Exemplo 2: Download de documento
 * 
 * const downloadDocument = useDocumentStore(state => state.downloadDocument);
 * 
 * <button onClick={() => downloadDocument('doc-id')}>
 *   Baixar
 * </button>
 */

/**
 * Exemplo 3: Avatar do usuário
 * 
 * const getUserAvatar = useDocumentStore(state => state.getUserAvatar);
 * 
 * const avatarUrl = await getUserAvatar('user-123', 150);
 */

/**
 * Exemplo 4: Validar documentos (admin)
 * 
 * const validateDocuments = useDocumentStore(state => state.validateDocuments);
 * 
 * await validateDocuments(['doc-1', 'doc-2', 'doc-3']);
 */

