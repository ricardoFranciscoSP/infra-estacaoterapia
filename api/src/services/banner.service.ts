import prisma from '../prisma/client';
import { supabase, supabaseAdmin, STORAGE_BUCKET_PUBLIC } from './storage.services';
import { v4 as uuidv4 } from 'uuid';

// Interface para erro do Supabase Storage
interface SupabaseStorageError {
    message?: string;
    statusCode?: string | number;
    status?: number;
}

export interface CreateBannerData {
    Titulo?: string;
    Descricao?: string;
    UrlImagemDesktop: string;
    UrlImagemMobile: string;
    LinkDestino?: string;
    Ordem?: number;
    Ativo?: boolean;
    AltTextDesktop?: string;
    AltTextMobile?: string;
    TitleSEO?: string;
    MetaDescription?: string;
    CreatedBy: string;
}

export interface UpdateBannerData {
    UpdatedBy: string;
    Titulo?: string;
    Descricao?: string;
    UrlImagemDesktop?: string;
    UrlImagemMobile?: string;
    LinkDestino?: string;
    Ordem?: number;
    Ativo?: boolean;
    AltTextDesktop?: string;
    AltTextMobile?: string;
    TitleSEO?: string;
    MetaDescription?: string;
}

export interface BannerWithCreator {
    Id: string;
    Titulo: string | null;
    Descricao: string | null;
    UrlImagemDesktop: string;
    UrlImagemMobile: string;
    LinkDestino: string | null;
    Ordem: number;
    Ativo: boolean;
    AltTextDesktop: string | null;
    AltTextMobile: string | null;
    TitleSEO: string | null;
    MetaDescription: string | null;
    CreatedAt: Date;
    UpdatedAt: Date;
    CreatedBy: string;
    UpdatedBy: string | null;
    Creator: {
        Id: string;
        Nome: string;
        Email: string;
    } | null;
    Updater: {
        Id: string;
        Nome: string;
        Email: string;
    } | null;
}

export class BannerService {
    /**
     * Faz upload de imagem para o storage
     */
    async uploadBannerImage(file: Express.Multer.File, tipo: 'desktop' | 'mobile'): Promise<string> {
        if (!file) {
            throw new Error('Nenhum arquivo enviado');
        }

        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        if (!allowedTypes.includes(file.mimetype)) {
            throw new Error('Tipo de arquivo não permitido. Use PNG, JPG ou WEBP.');
        }

        const fileExtension = file.originalname.split('.').pop() || 'jpg';
        const fileName = `banners/${tipo}/${uuidv4()}_${Date.now()}.${fileExtension}`;

        // Usar supabaseAdmin se disponível para evitar erros de assinatura
        const storageClient = (supabaseAdmin || supabase).storage;
        const uploadResult = await storageClient
            .from(STORAGE_BUCKET_PUBLIC)
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: true
            });

        if (uploadResult.error) {
            const error = uploadResult.error as SupabaseStorageError;
            // Tratamento específico para erro de verificação de assinatura
            if (error.message?.toLowerCase().includes('signature verification failed') ||
                error.message?.toLowerCase().includes('signature') ||
                error.statusCode === '403' || error.statusCode === 403 || error.status === 403) {
                throw new Error(
                    `Erro de verificação de assinatura. Verifique se SUPABASE_SERVICE_ROLE_KEY está configurada. ` +
                    `Erro: ${error.message || 'Erro desconhecido'}`
                );
            }
            throw new Error(`Erro ao fazer upload: ${error.message || 'Erro desconhecido'}`);
        }

        const { data: urlData } = storageClient
            .from(STORAGE_BUCKET_PUBLIC)
            .getPublicUrl(fileName);

        if (!urlData || !urlData.publicUrl) {
            throw new Error('Falha ao obter URL pública da imagem');
        }

        return urlData.publicUrl;
    }

    /**
     * Remove imagem do storage
     */
    async deleteBannerImage(url: string): Promise<void> {
        try {
            // Extrai o caminho do arquivo da URL
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/');
            const bucketIndex = pathParts.findIndex(part => part === STORAGE_BUCKET_PUBLIC);
            if (bucketIndex === -1) {
                console.warn(`[BannerService] Não foi possível extrair caminho da URL: ${url}`);
                return;
            }
            const filePath = pathParts.slice(bucketIndex + 1).join('/');

            const { error } = await supabase.storage
                .from(STORAGE_BUCKET_PUBLIC)
                .remove([filePath]);

            if (error) {
                console.error(`[BannerService] Erro ao deletar imagem: ${error.message}`);
                // Não lança erro para não bloquear a exclusão do banner
            }
        } catch (error) {
            console.error(`[BannerService] Erro ao processar exclusão de imagem:`, error);
            // Não lança erro para não bloquear a exclusão do banner
        }
    }

    /**
     * Lista todos os banners
     * ⚡ OTIMIZAÇÃO: Para rotas públicas, não inclui Creator/Updater (reduz joins desnecessários)
     */
    async findAll(ativosApenas?: boolean, includeCreator?: boolean): Promise<BannerWithCreator[]> {
        const where = ativosApenas ? { Ativo: true } : {};
        
        // ⚡ OTIMIZAÇÃO: Para páginas públicas, não precisa de Creator/Updater
        // Prisma não permite usar include e select juntos, então usamos apenas um
        if (includeCreator) {
            const banners = await prisma.banner.findMany({
                where,
                include: {
                    Creator: {
                        select: {
                            Id: true,
                            Nome: true,
                            Email: true
                        }
                    },
                    Updater: {
                        select: {
                            Id: true,
                            Nome: true,
                            Email: true
                        }
                    }
                },
                orderBy: [
                    { Ordem: 'asc' },
                    { CreatedAt: 'desc' }
                ]
            });
            return banners as BannerWithCreator[];
        } else {
            // ⚡ OTIMIZAÇÃO: Select apenas campos necessários para rotas públicas
            const banners = await prisma.banner.findMany({
                where,
                select: {
                    Id: true,
                    Titulo: true,
                    UrlImagemDesktop: true,
                    UrlImagemMobile: true,
                    LinkDestino: true,
                    AltTextDesktop: true,
                    AltTextMobile: true,
                    TitleSEO: true,
                    Ativo: true,
                    Ordem: true,
                    CreatedAt: true,
                    UpdatedAt: true,
                },
                orderBy: [
                    { Ordem: 'asc' },
                    { CreatedAt: 'desc' }
                ]
            });
            return banners as BannerWithCreator[];
        }
    }

    /**
     * Busca um banner por ID
     */
    async findById(id: string): Promise<BannerWithCreator | null> {
        const banner = await prisma.banner.findUnique({
            where: { Id: id },
            include: {
                Creator: {
                    select: {
                        Id: true,
                        Nome: true,
                        Email: true
                    }
                },
                Updater: {
                    select: {
                        Id: true,
                        Nome: true,
                        Email: true
                    }
                }
            }
        });

        return banner as BannerWithCreator | null;
    }

    /**
     * Cria um novo banner
     */
    async create(data: CreateBannerData): Promise<BannerWithCreator> {
        // Se não foi especificada ordem, busca a maior ordem e adiciona 1
        let ordem = data.Ordem;
        if (ordem === undefined) {
            const maiorOrdem = await prisma.banner.findFirst({
                orderBy: { Ordem: 'desc' },
                select: { Ordem: true }
            });
            ordem = (maiorOrdem?.Ordem ?? -1) + 1;
        }

        const banner = await prisma.banner.create({
            data: {
                ...data,
                Ordem: ordem,
                Ativo: data.Ativo ?? true
            },
            include: {
                Creator: {
                    select: {
                        Id: true,
                        Nome: true,
                        Email: true
                    }
                },
                Updater: {
                    select: {
                        Id: true,
                        Nome: true,
                        Email: true
                    }
                }
            }
        });

        return banner as BannerWithCreator;
    }

    /**
     * Atualiza um banner
     */
    async update(id: string, data: UpdateBannerData): Promise<BannerWithCreator> {
        const banner = await prisma.banner.update({
            where: { Id: id },
            data: {
                ...data,
                UpdatedAt: new Date()
            },
            include: {
                Creator: {
                    select: {
                        Id: true,
                        Nome: true,
                        Email: true
                    }
                },
                Updater: {
                    select: {
                        Id: true,
                        Nome: true,
                        Email: true
                    }
                }
            }
        });

        return banner as BannerWithCreator;
    }

    /**
     * Deleta um banner
     */
    async delete(id: string): Promise<void> {
        const banner = await this.findById(id);
        if (!banner) {
            throw new Error('Banner não encontrado');
        }

        // Remove as imagens do storage
        await this.deleteBannerImage(banner.UrlImagemDesktop);
        await this.deleteBannerImage(banner.UrlImagemMobile);

        // Remove o banner do banco
        await prisma.banner.delete({
            where: { Id: id }
        });
    }

    /**
     * Ativa/desativa um banner
     */
    async toggleActive(id: string, userId: string): Promise<BannerWithCreator> {
        const banner = await this.findById(id);
        if (!banner) {
            throw new Error('Banner não encontrado');
        }

        return this.update(id, {
            Ativo: !banner.Ativo,
            UpdatedBy: userId
        });
    }
}

