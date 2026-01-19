import prisma from "../prisma/client";
import { STORAGE_BUCKET, createSignedUrl, createSignedUrls, fileExists, deleteFile, downloadFile, uploadFile } from "./storage.services";
import { AvatarResponse, DocumentListResponse, DocumentSignedItem, DocumentViewResponse, DownloadResponse, ValidationResponse, AuthUser } from "../interfaces/files.interface";

export class FilesService {
    private static sanitizeFilename(name: string): string {
        const base = (name || '').split(/[\\/]/).pop() || 'documento';
        const cleaned = base.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');
        return cleaned.slice(0, 120);
    }
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
        if (!document.Url || document.Url.trim() === "") {
            throw Object.assign(new Error("Documento sem URL armazenada"), { status: 404 });
        }

        const isPsychologist = document.ProfessionalProfile.UserId === user?.Id;
        const isPrivileged = user?.Role === "Admin" || user?.Role === "Management" || user?.Role === "Finance";
        if (!isPsychologist && !isPrivileged) {
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

    // Documento específico do psicólogo (visualização inline)
    static async getPsychologistDocumentInline(documentId: string, user?: AuthUser): Promise<{ buffer: Buffer; contentType: string; fileName: string }> {
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
        if (!document.Url || document.Url.trim() === "") {
            throw Object.assign(new Error("Documento sem URL armazenada"), { status: 404 });
        }

        const isPsychologist = document.ProfessionalProfile.UserId === user?.Id;
        const isPrivileged = user?.Role === "Admin" || user?.Role === "Management" || user?.Role === "Finance";
        if (!isPsychologist && !isPrivileged) {
            throw Object.assign(new Error("Você não tem permissão para acessar este documento"), { status: 403 });
        }

        const exists = await fileExists(document.Url, STORAGE_BUCKET);
        if (!exists) {
            throw Object.assign(new Error("Arquivo não encontrado no storage"), { status: 404 });
        }

        const { buffer, contentType, fileName } = await downloadFile(document.Url, STORAGE_BUCKET);
        return {
            buffer,
            contentType: contentType || "application/octet-stream",
            fileName
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
        const isPrivileged = user?.Role === "Admin" || user?.Role === "Management" || user?.Role === "Finance";
        if (!isPsychologist && !isPrivileged) {
            throw Object.assign(new Error("Você não tem permissão para acessar estes documentos"), { status: 403 });
        }

        const documents = await prisma.psychologistDocument.findMany({
            where: { ProfessionalProfileId: profile.Id },
            orderBy: { CreatedAt: 'desc' }
        });

        if (documents.length === 0) {
            return { total: 0, documents: [], psychologist: profile.User.Nome };
        }

        const documentsWithUrls: DocumentSignedItem[] = await Promise.all(
            documents.map(async (doc) => {
                if (!doc.Url || doc.Url.trim() === "") {
                    return {
                        id: doc.Id,
                        fileName: null,
                        type: doc.Type,
                        description: doc.Description ?? undefined,
                        createdAt: doc.CreatedAt,
                        updatedAt: doc.UpdatedAt,
                        url: null,
                        expiresAt: null,
                        error: "Documento sem URL armazenada",
                        fileExists: false
                    };
                }
                try {
                    const exists = await fileExists(doc.Url, STORAGE_BUCKET);
                    if (!exists) {
                        return {
                            id: doc.Id,
                            fileName: doc.Url.split('/').pop() || null,
                            type: doc.Type,
                            description: doc.Description ?? undefined,
                            createdAt: doc.CreatedAt,
                            updatedAt: doc.UpdatedAt,
                            url: null,
                            expiresAt: null,
                            error: "Arquivo não encontrado no storage",
                            fileExists: false
                        };
                    }

                    const { signedUrl, expiresAt } = await createSignedUrl(doc.Url, {
                        bucket: STORAGE_BUCKET,
                        expiresIn: isPrivileged ? 86400 * 7 : 43200
                    });
                    return {
                        id: doc.Id,
                        fileName: doc.Url.split('/').pop() || null,
                        type: doc.Type,
                        description: doc.Description ?? undefined,
                        createdAt: doc.CreatedAt,
                        updatedAt: doc.UpdatedAt,
                        url: signedUrl,
                        expiresAt,
                        error: null,
                        fileExists: true
                    };
                } catch (err) {
                    const message = err instanceof Error ? err.message : "Erro ao gerar URL assinada";
                    return {
                        id: doc.Id,
                        fileName: doc.Url.split('/').pop() || null,
                        type: doc.Type,
                        description: doc.Description ?? undefined,
                        createdAt: doc.CreatedAt,
                        updatedAt: doc.UpdatedAt,
                        url: null,
                        expiresAt: null,
                        error: message,
                        fileExists: false
                    };
                }
            })
        );

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
        const isPrivileged = user?.Role === "Admin" || user?.Role === "Management" || user?.Role === "Finance";
        if (!isPsychologist && !isPrivileged) {
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
        const isPrivileged = user?.Role === "Admin" || user?.Role === "Management" || user?.Role === "Finance";
        if (!isPsychologist && !isPrivileged) {
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

    static async reuploadPsychologistDocument(
        documentId: string,
        file: Express.Multer.File,
        user?: AuthUser
    ) {
        if (!file || !file.buffer) {
            throw Object.assign(new Error("Arquivo não enviado"), { status: 400 });
        }

        const document = await prisma.psychologistDocument.findUnique({
            where: { Id: documentId },
            include: {
                ProfessionalProfile: {
                    include: { User: { select: { Id: true } } }
                }
            }
        });

        if (!document) {
            throw Object.assign(new Error("Documento não encontrado"), { status: 404 });
        }

        const isPsychologist = document.ProfessionalProfile.UserId === user?.Id;
        const isPrivileged = user?.Role === "Admin" || user?.Role === "Management" || user?.Role === "Finance";
        if (!isPsychologist && !isPrivileged) {
            throw Object.assign(new Error("Acesso negado"), { status: 403 });
        }

        if (document.Url) {
            try {
                await deleteFile(document.Url, STORAGE_BUCKET);
            } catch (err) {
                console.warn("[FilesService] Falha ao remover arquivo anterior:", err);
            }
        }

        const fileName = FilesService.sanitizeFilename(file.originalname);
        const filePath = `documents/${document.ProfessionalProfile.User.Id}/${Date.now()}_${fileName}`;
        const upload = await uploadFile(filePath, file.buffer, {
            bucket: STORAGE_BUCKET,
            contentType: file.mimetype,
            upsert: true
        });

        const updated = await prisma.psychologistDocument.update({
            where: { Id: documentId },
            data: {
                Url: upload.fullUrl,
                Type: file.mimetype,
                UpdatedAt: new Date()
            }
        });

        return updated;
    }

    static async uploadPsychologistDocument(
        profileId: string,
        type: string,
        file: Express.Multer.File,
        user?: AuthUser
    ) {
        if (!file || !file.buffer) {
            throw Object.assign(new Error("Arquivo não enviado"), { status: 400 });
        }
        if (!type || type.trim() === "") {
            throw Object.assign(new Error("Tipo de documento é obrigatório"), { status: 400 });
        }

        const profile = await prisma.professionalProfile.findUnique({
            where: { Id: profileId },
            include: { User: { select: { Id: true } } }
        });

        if (!profile) {
            throw Object.assign(new Error("Perfil profissional não encontrado"), { status: 404 });
        }

        const isPsychologist = profile.UserId === user?.Id;
        const isPrivileged = user?.Role === "Admin" || user?.Role === "Management" || user?.Role === "Finance";
        if (!isPsychologist && !isPrivileged) {
            throw Object.assign(new Error("Acesso negado"), { status: 403 });
        }

        const fileName = FilesService.sanitizeFilename(file.originalname);
        const filePath = `documents/${profile.User.Id}/${Date.now()}_${fileName}`;
        const upload = await uploadFile(filePath, file.buffer, {
            bucket: STORAGE_BUCKET,
            contentType: file.mimetype,
            upsert: true
        });

        const created = await prisma.psychologistDocument.create({
            data: {
                ProfessionalProfileId: profile.Id,
                Url: upload.fullUrl,
                Type: type,
                Description: type
            }
        });

        return created;
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
