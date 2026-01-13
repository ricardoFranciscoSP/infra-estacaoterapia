import prisma from "../prisma/client";
import { STORAGE_BUCKET, createSignedUrl, createSignedUrls, fileExists, deleteFile } from "./storage.services";
import { AvatarResponse, DocumentListResponse, DocumentSignedItem, DocumentViewResponse, DownloadResponse, ValidationResponse, AuthUser } from "../interfaces/files.interface";

export class FilesService {
    // Documento específico do psicólogo (visualização)
    static async getPsychologistDocument(documentId: string, user?: AuthUser): Promise<DocumentViewResponse> {
        const document = await prisma.psychologistDocument.findUnique({
            where: { Id: documentId },
            include: {
                ProfessionalProfile: {
                    include: {
                        User: { select: { Id: true, Nome: true, Email: true } }
                    }
                }
            }
        });

        if (!document) {
            throw Object.assign(new Error("Documento não encontrado"), { status: 404 });
        }

        const isPsychologist = document.ProfessionalProfile.UserId === user?.Id;
        const isAdmin = user?.Role === "Admin" || user?.Role === "Management";
        if (!isPsychologist && !isAdmin) {
            throw Object.assign(new Error("Você não tem permissão para acessar este documento"), { status: 403 });
        }

        const exists = await fileExists(document.Url, STORAGE_BUCKET);
        if (!exists) {
            throw Object.assign(new Error("Arquivo não encontrado no storage"), { status: 404 });
        }

        const { signedUrl, expiresAt } = await createSignedUrl(document.Url, {
            bucket: STORAGE_BUCKET,
            expiresIn: 300
        });

        return {
            id: document.Id,
            fileName: document.Url.split('/').pop() || null,
            type: document.Type ?? null,
            description: document.Description ?? undefined,
            url: signedUrl,
            expiresAt,
            psychologist: {
                id: document.ProfessionalProfile.User.Id,
                name: document.ProfessionalProfile.User.Nome
            }
        };
    }

    // Listar documentos por userId (mapeando para ProfessionalProfile)
    static async listDocumentsByUserId(userIdParam: string, user?: AuthUser): Promise<DocumentListResponse> {
        // Tenta buscar por UserId (padrão)
        let profile = await prisma.professionalProfile.findFirst({
            where: { UserId: userIdParam },
            include: { User: { select: { Id: true, Nome: true } } }
        });

        // Se não encontrar e for admin, tenta buscar por ProfessionalProfile.Id
        if (!profile && (user?.Role === "Admin" || user?.Role === "Management")) {
            profile = await prisma.professionalProfile.findUnique({
                where: { Id: userIdParam },
                include: { User: { select: { Id: true, Nome: true } } }
            });
        }

        if (!profile) {
            throw Object.assign(new Error(`Perfil não encontrado para o parâmetro: ${userIdParam}`), { status: 404 });
        }

        const isPsychologist = profile.UserId === user?.Id;
        const isAdmin = user?.Role === "Admin" || user?.Role === "Management";
        if (!isPsychologist && !isAdmin) {
            throw Object.assign(new Error("Você não tem permissão para acessar estes documentos"), { status: 403 });
        }

        const documents = await prisma.psychologistDocument.findMany({
            where: { ProfessionalProfileId: profile.Id },
            orderBy: { CreatedAt: 'desc' }
        });

        if (documents.length === 0) {
            return { total: 0, documents: [], psychologist: profile.User.Nome };
        }

        const filePaths = documents.map(d => d.Url);
        let urlResults: Array<any> = [];
        // Timeout de 10s para evitar travas prolongadas
        try {
            urlResults = await Promise.race([
                createSignedUrls(filePaths, { bucket: STORAGE_BUCKET, expiresIn: isAdmin ? 86400 * 7 : 43200 }), // 7 dias para admin
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout ao gerar signed URLs (10s)')), 10000))
            ] as any);
        } catch (err) {
            throw Object.assign(new Error(`Erro ao gerar URLs dos documentos: ${err instanceof Error ? err.message : err}`), { status: 500 });
        }

        const documentsWithUrls: DocumentSignedItem[] = documents.map((doc, index) => {
            const result = urlResults[index];
            const hasError = result && typeof result === 'object' && 'error' in result;
            return {
                id: doc.Id,
                fileName: doc.Url.split('/').pop() || null,
                type: doc.Type,
                description: doc.Description ?? undefined,
                createdAt: doc.CreatedAt,
                updatedAt: doc.UpdatedAt,
                url: hasError ? null : result.signedUrl,
                expiresAt: hasError ? null : result.expiresAt,
                error: hasError ? result.error : null,
                fileExists: !hasError
            };
        });

        return { total: documentsWithUrls.length, psychologist: profile.User.Nome, documents: documentsWithUrls };
    }

    // Download (gera URL com nome amigável)
    static async getDownloadUrl(documentId: string, user?: AuthUser): Promise<DownloadResponse> {
        const document = await prisma.psychologistDocument.findUnique({
            where: { Id: documentId },
            include: {
                ProfessionalProfile: { include: { User: { select: { Id: true, Nome: true } } } }
            }
        });
        if (!document) {
            throw Object.assign(new Error("Documento não encontrado"), { status: 404 });
        }
        const isPsychologist = document.ProfessionalProfile.UserId === user?.Id;
        const isAdmin = user?.Role === "Admin" || user?.Role === "Management";
        if (!isPsychologist && !isAdmin) {
            throw Object.assign(new Error("Acesso negado"), { status: 403 });
        }

        const psychologistName = document.ProfessionalProfile.User.Nome.replace(/[^a-zA-Z0-9]/g, '_');
        const originalFileName = document.Url.split('/').pop() || 'documento.pdf';
        const downloadName = `${psychologistName}_${document.Type || 'documento'}_${originalFileName}`;

        const { signedUrl, expiresAt } = await createSignedUrl(document.Url, {
            bucket: STORAGE_BUCKET,
            expiresIn: 60,
            download: downloadName
        });

        return { downloadUrl: signedUrl, fileName: downloadName, expiresAt };
    }

    // Thumbnail
    static async getDocumentThumbnail(documentId: string, size: number, user?: AuthUser) {
        const document = await prisma.psychologistDocument.findUnique({
            where: { Id: documentId },
            include: { ProfessionalProfile: { select: { UserId: true } } }
        });
        if (!document) {
            throw Object.assign(new Error("Documento não encontrado"), { status: 404 });
        }
        const isPsychologist = document.ProfessionalProfile.UserId === user?.Id;
        const isAdmin = user?.Role === "Admin" || user?.Role === "Management";
        if (!isPsychologist && !isAdmin) {
            throw Object.assign(new Error("Acesso negado"), { status: 403 });
        }
        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(document.Url);
        if (!isImage) {
            throw Object.assign(new Error("Este documento não é uma imagem"), { status: 400 });
        }
        const { signedUrl, expiresAt } = await createSignedUrl(document.Url, {
            bucket: STORAGE_BUCKET,
            expiresIn: 300,
            transform: { width: size, height: size, resize: 'cover', format: 'webp', quality: 80 }
        });
        return { thumbnailUrl: signedUrl, expiresAt, size };
    }

    // Avatar (thumbnail)
    static async getUserAvatar(userId: string, size: number): Promise<AvatarResponse> {
        const userImage = await prisma.image.findFirst({ where: { UserId: userId }, orderBy: { CreatedAt: 'desc' } });
        if (!userImage || !userImage.Url) {
            throw Object.assign(new Error("Avatar não encontrado"), { status: 404 });
        }
        const exists = await fileExists(userImage.Url, STORAGE_BUCKET);
        if (!exists) {
            throw Object.assign(new Error("Arquivo de avatar não encontrado"), { status: 404 });
        }
        const { signedUrl, expiresAt } = await createSignedUrl(userImage.Url, {
            bucket: STORAGE_BUCKET,
            expiresIn: 600,
            transform: { width: size, height: size, resize: 'cover', format: 'webp', quality: 85 }
        });
        return { avatarUrl: signedUrl, expiresAt, size, userId };
    }

    // Avatar full
    static async getUserAvatarFull(userId: string): Promise<AvatarResponse> {
        const userImage = await prisma.image.findFirst({ where: { UserId: userId }, orderBy: { CreatedAt: 'desc' } });
        if (!userImage || !userImage.Url) {
            throw Object.assign(new Error("Avatar não encontrado"), { status: 404 });
        }
        const { signedUrl, expiresAt } = await createSignedUrl(userImage.Url, { bucket: STORAGE_BUCKET, expiresIn: 300 });
        return { avatarUrl: signedUrl, expiresAt, userId };
    }

    // Avatar signed 12h
    static async getUserAvatarSigned(userId: string): Promise<AvatarResponse> {
        const userImage = await prisma.image.findFirst({ where: { UserId: userId }, orderBy: { CreatedAt: 'desc' } });
        if (!userImage || !userImage.Url) {
            throw Object.assign(new Error("Avatar não encontrado"), { status: 404 });
        }
        const exists = await fileExists(userImage.Url, STORAGE_BUCKET);
        if (!exists) {
            throw Object.assign(new Error("Arquivo de avatar não encontrado"), { status: 404 });
        }
        const { signedUrl, expiresAt } = await createSignedUrl(userImage.Url, { bucket: STORAGE_BUCKET, expiresIn: 43200 });
        return { avatarUrl: signedUrl, expiresAt, userId };
    }

    // Batch
    static async batchDocuments(documentIds: string[]): Promise<{ total: number; documents: DocumentSignedItem[] }> {
        const documents = await prisma.psychologistDocument.findMany({
            where: { Id: { in: documentIds } },
            include: { ProfessionalProfile: { select: { UserId: true } } }
        });
        if (documents.length === 0) return { total: 0, documents: [] };
        const filePaths = documents.map(d => d.Url);
        const urlResults = await createSignedUrls(filePaths, { bucket: STORAGE_BUCKET, expiresIn: 43200 });
        const results: DocumentSignedItem[] = documents.map((doc, index) => {
            const urlResult: any = urlResults[index];
            const hasError = urlResult && typeof urlResult === 'object' && 'error' in urlResult;
            return {
                id: doc.Id,
                fileName: doc.Url.split('/').pop() || null,
                type: doc.Type,
                url: hasError ? null : urlResult.signedUrl,
                expiresAt: hasError ? null : urlResult.expiresAt,
                error: hasError ? urlResult.error : null
            };
        });
        return { total: results.length, documents: results };
    }

    // Validate
    static async validateDocuments(documentIds: string[], user?: AuthUser): Promise<ValidationResponse> {
        if (user?.Role !== "Admin" && user?.Role !== "Management") {
            throw Object.assign(new Error("Acesso negado"), { status: 403 });
        }
        const documents = await prisma.psychologistDocument.findMany({ where: { Id: { in: documentIds } } });
        const results = await Promise.all(documents.map(async (doc) => {
            const exists = await fileExists(doc.Url, STORAGE_BUCKET);
            return {
                documentId: doc.Id,
                fileName: doc.Url.split('/').pop() || null,
                type: doc.Type,
                exists,
                status: (exists ? 'ok' : 'missing') as 'ok' | 'missing'
            };
        }));
        const valid = results.filter(r => r.exists).length;
        const missing = results.length - valid;
        return { total: results.length, valid, missing, results };
    }

    // Test (dev)
    static async testSignedUrl(path: string) {
        const { signedUrl, expiresAt } = await createSignedUrl(path, { bucket: STORAGE_BUCKET, expiresIn: 60 });
        return { filePath: path, signedUrl, expiresAt, message: "URL gerada com sucesso (teste)" };
    }

    /**
     * Deleta um documento do psicólogo (banco de dados + Supabase Storage)
     * @param documentId ID do documento
     * @param user Usuário autenticado
     * @returns Mensagem de sucesso
     */
    /**
     * Busca um documento da tabela Document (usado em solicitações de saque)
     * @param documentId ID do documento na tabela Document
     * @param user Usuário autenticado
     * @returns URL assinada do documento
     */
    static async getDocument(documentId: string, user?: AuthUser): Promise<DocumentViewResponse> {
        const document = await prisma.document.findUnique({
            where: { Id: documentId },
            include: {
                User: { select: { Id: true, Nome: true, Email: true, Role: true } }
            }
        });

        if (!document) {
            throw Object.assign(new Error("Documento não encontrado"), { status: 404 });
        }

        // Verificar permissões: o usuário pode ver o documento se:
        // 1. É o próprio dono do documento
        // 2. É Admin, Management ou Finance
        const isOwner = document.UserId === user?.Id;
        const isAdmin = user?.Role === "Admin" || user?.Role === "Management" || user?.Role === "Finance";
        
        if (!isOwner && !isAdmin) {
            throw Object.assign(new Error("Você não tem permissão para acessar este documento"), { status: 403 });
        }

        // Verificar se o arquivo existe no storage
        // A URL pode estar em diferentes formatos, então tentamos extrair o caminho
        let filePath = document.Url;
        
        // Se for uma URL completa do Supabase, extrair o caminho
        const supabaseUrlMatch = document.Url.match(/\/storage\/v1\/object\/public\/([^\/]+)\/(.+)$/);
        if (supabaseUrlMatch) {
            const [, bucket, path] = supabaseUrlMatch;
            filePath = path;
        }

        const exists = await fileExists(filePath, STORAGE_BUCKET);
        if (!exists) {
            // Se não encontrar no bucket padrão, tenta usar a URL diretamente
            console.warn(`[FilesService] Arquivo não encontrado no storage padrão: ${filePath}`);
        }

        // Gerar URL assinada
        const { signedUrl, expiresAt } = await createSignedUrl(filePath, {
            bucket: STORAGE_BUCKET,
            expiresIn: 300
        });

        return {
            id: document.Id,
            fileName: document.Url.split('/').pop() || null,
            type: document.Type ?? null,
            description: document.Description ?? undefined,
            url: signedUrl,
            expiresAt,
            psychologist: {
                id: document.User.Id,
                name: document.User.Nome
            }
        };
    }

    static async deletePsychologistDocument(documentId: string, user?: AuthUser): Promise<{ message: string }> {
        // Busca o documento
        const document = await prisma.psychologistDocument.findUnique({
            where: { Id: documentId },
            include: {
                ProfessionalProfile: {
                    include: {
                        User: { select: { Id: true, Nome: true } }
                    }
                }
            }
        });

        if (!document) {
            throw Object.assign(new Error("Documento não encontrado"), { status: 404 });
        }

        // Verifica permissões (apenas Admin/Management pode deletar)
        const isAdmin = user?.Role === "Admin" || user?.Role === "Management";
        if (!isAdmin) {
            throw Object.assign(new Error("Apenas administradores podem excluir documentos"), { status: 403 });
        }

        try {
            // Remove o arquivo do Supabase Storage
            if (document.Url) {
                try {
                    await deleteFile(document.Url, STORAGE_BUCKET);
                    console.log(`[FilesService] Arquivo removido do storage: ${document.Url}`);
                } catch (storageError) {
                    console.error(`[FilesService] Erro ao remover arquivo do storage (continuando com exclusão do banco):`, storageError);
                    // Continua mesmo se falhar no storage (pode já ter sido deletado)
                }
            }

            // Remove também da tabela Document se existir (para contratos gerados)
            await prisma.document.deleteMany({
                where: {
                    Url: document.Url,
                    Type: document.Type || undefined
                }
            });

            // Remove o registro do banco de dados
            await prisma.psychologistDocument.delete({
                where: { Id: documentId }
            });

            console.log(`[FilesService] Documento ${documentId} deletado com sucesso`);
            return { message: "Documento excluído com sucesso" };
        } catch (error) {
            console.error(`[FilesService] Erro ao deletar documento:`, error);
            throw Object.assign(
                new Error(error instanceof Error ? error.message : "Erro ao excluir documento"),
                { status: 500 }
            );
        }
    }
}
