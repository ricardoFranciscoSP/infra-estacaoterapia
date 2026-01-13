import { api } from "@/lib/axios";

/**
 * ============================================================================
 * SERVIÇO DE ARQUIVOS - URLs TEMPORÁRIAS
 * ============================================================================
 * 
 * Serviço para consumir endpoints de URLs assinadas temporárias:
 * - Documentos de psicólogos (visualizar, baixar)
 * - Imagens de perfil (usuários e psicólogos)
 * - Validação de documentos
 */

export interface DocumentResponse {
    id: string;
    fileName: string;
    type: string;
    description?: string;
    url: string;
    expiresAt: string;
    psychologist?: {
        id: string;
        name: string;
    };
}

export interface DocumentListResponse {
    total: number;
    psychologist: string;
    documents: Array<{
        id: string;
        fileName: string;
        type: string;
        description: string;
        createdAt: string;
        updatedAt: string;
        url: string | null;
        expiresAt: string | null;
        error: string | null;
        fileExists: boolean;
    }>;
}

export interface DownloadResponse {
    downloadUrl: string;
    fileName: string;
    expiresAt: string;
}

export interface ThumbnailResponse {
    thumbnailUrl: string;
    expiresAt: string;
    size: number;
}

export interface AvatarResponse {
    avatarUrl: string;
    expiresAt: string;
    size: number;
    userId: string;
}

export interface BatchResponse {
    total: number;
    documents: Array<{
        id: string;
        fileName: string;
        type: string;
        url: string | null;
        expiresAt: string | null;
        error: string | null;
    }>;
}

export interface ValidationResponse {
    total: number;
    valid: number;
    missing: number;
    results: Array<{
        documentId: string;
        fileName: string;
        type: string;
        exists: boolean;
        status: 'ok' | 'missing';
    }>;
}

export const documentsFilesService = () => {
    return {
        // ============================================================================
        // DOCUMENTOS DE PSICÓLOGOS
        // ============================================================================

        /**
         * Visualizar documento específico do psicólogo
         * GET /api/files/psychologist/documents/:id
         */
        getDocument: (documentId: string) =>
            api.get<DocumentResponse>(`/files/psychologist/documents/${documentId}`),

        /**
         * Listar TODOS os documentos de um psicólogo com URLs
         * GET /api/files/psychologist/:profileId/documents
         */
        listDocumentsByProfile: (profileId: string) =>
            api.get<DocumentListResponse>(`/files/psychologist/${profileId}/documents`),

        /**
         * Download de documento com nome amigável
         * GET /api/files/psychologist/documents/:id/download
         */
        downloadDocument: (documentId: string) =>
            api.get<DownloadResponse>(`/files/psychologist/documents/${documentId}/download`),

        /**
         * Excluir documento do psicólogo (banco + storage)
         * DELETE /api/files/psychologist/documents/:id
         */
        deleteDocument: (documentId: string) =>
            api.delete<{ message: string }>(`/files/psychologist/documents/${documentId}`),

        /**
         * Thumbnail de imagem de documento
         * GET /api/files/psychologist/documents/:id/thumbnail?size=200
         */
        getDocumentThumbnail: (documentId: string, size: number = 200) =>
            api.get<ThumbnailResponse>(`/files/psychologist/documents/${documentId}/thumbnail`, {
                params: { size }
            }),

        // ============================================================================
        // IMAGENS DE PERFIL (AVATARES)
        // ============================================================================

        /**
         * Obter avatar de usuário com URL temporária
         * GET /api/files/user/:userId/avatar?size=200
         */
        getUserAvatar: (userId: string, size: number = 200) =>
            api.get<AvatarResponse>(`/files/user/${userId}/avatar`, {
                params: { size }
            }),

        /**
         * Obter avatar original (tamanho completo)
         * GET /api/files/user/:userId/avatar/full
         */
        getUserAvatarFull: (userId: string) =>
            api.get<Omit<AvatarResponse, 'size'>>(`/files/user/${userId}/avatar/full`),

        // ============================================================================
        // MÚLTIPLOS ARQUIVOS DE UMA VEZ
        // ============================================================================

        /**
         * Obter URLs de múltiplos documentos
         * POST /api/files/batch
         */
        getBatchDocuments: (documentIds: string[]) =>
            api.post<BatchResponse>('/files/batch', { documentIds }),

        // ============================================================================
        // VALIDAÇÃO DE DOCUMENTOS
        // ============================================================================

        /**
         * Validar se documentos existem no storage (apenas admin)
         * POST /api/files/validate
         */
        validateDocuments: (documentIds: string[]) =>
            api.post<ValidationResponse>('/files/validate', { documentIds }),

        // ============================================================================
        // ROTA DE TESTE (apenas em desenvolvimento)
        // ============================================================================

        /**
         * Testar geração de URL
         * GET /api/files/test?path=uploads/exemplo.pdf
         */
        testUrlGeneration: (filePath: string) =>
            api.get('/files/test', {
                params: { path: filePath }
            }),

        // ============================================================================
        // MÉTODOS AUXILIARES
        // ============================================================================

        /**
         * Verifica se uma URL expirou
         */
        isUrlExpired: (expiresAt: string): boolean => {
            return new Date(expiresAt) < new Date();
        },

        /**
         * Calcula tempo restante até expiração (em segundos)
         */
        getTimeUntilExpiration: (expiresAt: string): number => {
            const now = new Date().getTime();
            const expires = new Date(expiresAt).getTime();
            return Math.max(0, Math.floor((expires - now) / 1000));
        },

        /**
         * Formata tempo de expiração de forma legível
         */
        formatExpirationTime: function (expiresAt: string): string {
            const seconds = this.getTimeUntilExpiration(expiresAt);

            if (seconds <= 0) return 'Expirado';
            if (seconds < 60) return `${seconds}s`;

            const minutes = Math.floor(seconds / 60);
            if (minutes < 60) return `${minutes}min`;

            const hours = Math.floor(minutes / 60);
            return `${hours}h ${minutes % 60}min`;
        },
    };
}