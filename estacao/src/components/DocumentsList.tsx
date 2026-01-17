/**
 * ============================================================================
 * COMPONENTE: Lista de Documentos
 * ============================================================================
 * 
 * Exemplo de uso do useDocuments hook
 * Lista todos os documentos de um psicólogo com renovação automática de URLs
 */

import { useDocuments } from '@/hooks/useDocuments';
import { useUser } from '@/contexts/UserContext';
import { useState } from 'react';

interface DocumentsListProps {
    profileId: string;
}

export function DocumentsList({ profileId }: DocumentsListProps) {
    const { user } = useUser();
    const allowedRoles = ['Admin', 'Management', 'Finance'];
    const isOwner = user?.Id === profileId;
    const isAllowedRole = allowedRoles.includes(user?.Role ?? '');
    const {
        documents,
        loading,
        error,
        psychologistName,
        refetch,
        refreshDocumentUrl,
        downloadDocument,
        isUrlExpired,
        formatExpirationTime
    } = useDocuments(profileId);

    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    if (!isOwner && !isAllowedRole) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
                Você não tem permissão para visualizar esses documentos.
            </div>
        );
    }

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
                    onClick={refetch}
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
                <h2 className="text-xl font-semibold">
                    Documentos de {psychologistName}
                </h2>
                <button
                    onClick={refetch}
                    className="text-sm text-blue-600 hover:text-blue-700"
                >
                    Atualizar lista
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
                                border rounded-lg p-4 
                                ${hasError ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}
                            `}
                        >
                            <div className="flex items-start justify-between">
                                {/* Info */}
                                <div className="flex-1">
                                    <h3 className="font-medium text-gray-900">
                                        {document.fileName}
                                    </h3>
                                    
                                    <div className="mt-1 space-y-1">
                                        <p className="text-sm text-gray-600">
                                            Tipo: <span className="font-medium">{document.type}</span>
                                        </p>
                                        
                                        {document.description && (
                                            <p className="text-sm text-gray-600">
                                                {document.description}
                                            </p>
                                        )}

                                        {/* Status da URL */}
                                        <div className="flex items-center gap-2 text-sm">
                                            {expired ? (
                                                <span className="text-red-600 font-medium">
                                                    ⚠️ URL expirada
                                                </span>
                                            ) : document.expiresAt ? (
                                                <span className="text-gray-500">
                                                    Expira em: {formatExpirationTime(document.expiresAt)}
                                                </span>
                                            ) : null}

                                            {hasError && (
                                                <span className="text-red-600">
                                                    • {document.error || 'Arquivo não encontrado'}
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-xs text-gray-400">
                                            Enviado em: {new Date(document.createdAt).toLocaleDateString('pt-BR')}
                                        </p>
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
                                            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                        >
                                            Visualizar
                                        </a>
                                    )}

                                    {/* Baixar */}
                                    <button
                                        onClick={() => handleDownload(document.id)}
                                        disabled={downloadingId === document.id || hasError}
                                        className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {downloadingId === document.id ? 'Baixando...' : 'Baixar'}
                                    </button>

                                    {/* Renovar URL */}
                                    {(expired || hasError) && (
                                        <button
                                            onClick={() => handleRefreshUrl(document.id)}
                                            className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded hover:bg-orange-700"
                                        >
                                            Renovar URL
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
 * <DocumentsList profileId="profile-123" />
 */
