import { User } from "../types/user.types";

export interface DocumentSignedItem {
    id: string;
    fileName: string | null;
    type: string | null;
    description?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    url: string | null;
    expiresAt: Date | null;
    error?: string | null;
    fileExists?: boolean;
}

export interface DocumentListResponse {
    total: number;
    psychologist?: string;
    documents: DocumentSignedItem[];
    warning?: string;
}

export interface DocumentViewResponse {
    id: string;
    fileName: string | null;
    type: string | null;
    description?: string | null;
    url: string;
    expiresAt: Date;
    psychologist: {
        id: string;
        name: string;
    };
}

export interface DownloadResponse {
    downloadUrl: string;
    fileName: string;
    expiresAt: Date;
}

export interface AvatarResponse {
    avatarUrl: string;
    expiresAt: Date;
    size?: number;
    userId: string;
}

export interface ValidationItemResult {
    documentId: string;
    fileName: string | null;
    type: string | null;
    exists: boolean;
    status: 'ok' | 'missing';
}

export interface ValidationResponse {
    total: number;
    valid: number;
    missing: number;
    results: ValidationItemResult[];
}

export type AuthUser = User & { Role: string };
