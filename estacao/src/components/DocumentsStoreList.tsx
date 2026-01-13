/**
 * ============================================================================
 * COMPONENTE: Lista de Documentos com Zustand Store
 * ============================================================================
 * 
 * Exemplo de uso do useDocumentStore
 * Usa cache persistente e renovação automática de URLs
 */

import { useDocumentStore, useAutoRenewUrls } from '@/store/useDocumentStore';
import { useEffect, useState } from 'react';

interface DocumentsStoreListProps {
    profileId: string;
}

export function DocumentsStoreList({ profileId }: DocumentsStoreListProps) {
    // Zustand Store
    const fetchDocuments = useDocumentStore(state => state.fetchDocuments);
    const getCurrentDocuments = useDocumentStore(state => state.getCurrentDocuments);
    const getCurrentPsychologist = useDocumentStore(state => state.getCurrentPsychologist);
    const downloadDocument = useDocumentStore(state => state.downloadDocument);
    const refreshDocumentUrl = useDocumentStore(state => state.refreshDocumentUrl);
    const isUrlExpired = useDocumentStore(state => state.isUrlExpired);
    const formatExpirationTime = useDocumentStore(state => state.formatExpirationTime);
    const loading = useDocumentStore(state => state.loading);
    const error = useDocumentStore(state => state.error);
    const setCurrentProfile = useDocumentStore(state => state.setCurrentProfile);

    // Auto-renovar URLs próximas de expirar
    useAutoRenewUrls();

    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    // Buscar documentos ao montar
    useEffect(() => {
        setCurrentProfile(profileId);
        fetchDocuments(profileId);
    }, [profileId, fetchDocuments, setCurrentProfile]);

    // Obter dados do cache
    const documents = getCurrentDocuments();
    const psychologistName = getCurrentPsychologist();

    const handleDownload = async (documentId: string) => {
        try {
            setDownloadingId(documentId);
            await downloadDocument(documentId);
        } catch {
            alert('Erro ao baixar documento');
        } finally {
            setDownloadingId(null);
        }
    };

    const handleRefreshUrl = async (documentId: string) => {
        await refreshDocumentUrl(documentId);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                <span className="ml-3">Carregando documentos...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600 font-medium">Erro</p>
                <p className="text-red-500 text-sm">{error}</p>
                <button
                    onClick={() => fetchDocuments(profileId)}
                    className="mt-2 text-sm text-red-600 hover:underline"
                >
                    Tentar novamente
                </button>
            </div>
        );
    }

    if (documents.length === 0) {
        return (
            <div className="text-center p-8 bg-gray-50 rounded-lg">
                <p className="text-gray-600">Nenhum documento encontrado</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold">
                        Documentos de {psychologistName}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        {documents.length} {documents.length === 1 ? 'documento' : 'documentos'}
                    </p>
                </div>
                <button
                    onClick={() => fetchDocuments(profileId)}
                    className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 border border-blue-600 rounded hover:bg-blue-50"
                >
                    Atualizar
                </button>
            </div>

            {/* Lista de Documentos */}
            <div className="grid gap-4">
                {documents.map((document) => {
                    const expired = isUrlExpired(document.expiresAt);
                    const hasError = !!document.error || !document.fileExists;

                    return (
                        <div
                            key={document.id}
                            className={`
                                border rounded-lg p-4 shadow-sm transition-all
                                ${hasError ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200 hover:shadow-md'}
                            `}
                        >
                            <div className="flex items-start justify-between">
                                {/* Info */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-medium text-gray-900">
                                            {document.fileName}
                                        </h3>
                                        {document.fileExists ? (
                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                                ✓ Verificado
                                            </span>
                                        ) : (
                                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                                                ✗ Arquivo não encontrado
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="mt-2 space-y-1">
                                        <p className="text-sm text-gray-600">
                                            <span className="font-medium">Tipo:</span> {document.type}
                                        </p>
                                        
                                        {document.description && (
                                            <p className="text-sm text-gray-600">
                                                <span className="font-medium">Descrição:</span> {document.description}
                                            </p>
                                        )}

                                        {/* Status da URL */}
                                        <div className="flex items-center gap-3 text-sm mt-2">
                                            {expired ? (
                                                <span className="flex items-center gap-1 text-red-600 font-medium">
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                    URL expirada
                                                </span>
                                            ) : document.expiresAt ? (
                                                <span className="flex items-center gap-1 text-gray-500">
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                                    </svg>
                                                    Expira em: {formatExpirationTime(document.expiresAt)}
                                                </span>
                                            ) : null}

                                            {hasError && (
                                                <span className="text-red-600 text-xs">
                                                    {document.error || 'Arquivo indisponível'}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
                                            <span>
                                                Enviado: {new Date(document.createdAt).toLocaleDateString('pt-BR', { 
                                                    day: '2-digit', 
                                                    month: 'short', 
                                                    year: 'numeric' 
                                                })}
                                            </span>
                                            {document.updatedAt !== document.createdAt && (
                                                <span>
                                                    Atualizado: {new Date(document.updatedAt).toLocaleDateString('pt-BR', { 
                                                        day: '2-digit', 
                                                        month: 'short', 
                                                        year: 'numeric' 
                                                    })}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Ações */}
                                <div className="flex flex-col gap-2 ml-4">
                                    {/* Visualizar */}
                                    {document.url && !expired && !hasError && (
                                        <a
                                            href={document.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-center"
                                        >
                                            👁️ Visualizar
                                        </a>
                                    )}

                                    {/* Baixar */}
                                    {!hasError && (
                                        <button
                                            onClick={() => handleDownload(document.id)}
                                            disabled={downloadingId === document.id}
                                            className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {downloadingId === document.id ? '⏳ Baixando...' : '⬇️ Baixar'}
                                        </button>
                                    )}

                                    {/* Renovar URL */}
                                    {(expired || hasError) && (
                                        <button
                                            onClick={() => handleRefreshUrl(document.id)}
                                            className="px-4 py-2 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
                                        >
                                            🔄 Renovar
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/**
 * ============================================================================
 * USO DO COMPONENTE
 * ============================================================================
 * 
 * import { DocumentsStoreList } from '@/components/DocumentsStoreList';
 * 
 * <DocumentsStoreList profileId="profile-123" />
 * 
 * 
 * VANTAGENS DO STORE:
 * - Cache persistente (mantém dados entre navegações)
 * - Compartilhamento de estado entre componentes
 * - Auto-renovação de URLs
 * - Performance otimizada
 */
