import { Request, Response } from 'express';
import { BannerService } from '../services/banner.service';
import { MulterRequest } from '../types/multerRequest';

export class BannerController {
    constructor(private bannerService: BannerService) {}

    /**
     * Lista todos os banners
     * GET /api/banners
     * ⚡ OTIMIZAÇÃO: Adiciona cache HTTP e otimiza query para rotas públicas
     */
    async findAll(req: Request, res: Response): Promise<Response> {
        try {
            const ativosApenas = req.query.ativos === 'true';
            // ⚡ OTIMIZAÇÃO: Rotas públicas não precisam de Creator/Updater (reduz joins)
            const includeCreator = false; // Sempre false para rotas públicas
            
            const banners = await this.bannerService.findAll(ativosApenas, includeCreator);
            
            // ⚡ OTIMIZAÇÃO: Cache HTTP para banners públicos (5 minutos)
            // Banners mudam raramente, então cache é seguro
            if (ativosApenas) {
                res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=600');
            }
            
            return res.status(200).json(banners);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Erro ao listar banners';
            console.error('[BannerController] Erro ao listar banners:', error);
            return res.status(500).json({ error: errorMessage });
        }
    }

    /**
     * Busca um banner por ID
     * GET /api/banners/:id
     */
    async findById(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const banner = await this.bannerService.findById(id);
            if (!banner) {
                return res.status(404).json({ error: 'Banner não encontrado' });
            }
            return res.status(200).json(banner);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar banner';
            console.error('[BannerController] Erro ao buscar banner:', error);
            return res.status(500).json({ error: errorMessage });
        }
    }

    /**
     * Cria um novo banner
     * POST /api/banners
     */
    async create(req: MulterRequest, res: Response): Promise<Response> {
        try {
            const userId = req.user?.Id;
            if (!userId) {
                return res.status(401).json({ error: 'Usuário não autenticado' });
            }

            const { 
                Titulo, 
                Descricao, 
                LinkDestino, 
                Ordem, 
                Ativo, 
                AltTextDesktop, 
                AltTextMobile, 
                TitleSEO, 
                MetaDescription 
            } = req.body;

            // Verifica se foram enviados os arquivos
            const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
            const fileDesktop = files?.['imagemDesktop']?.[0];
            const fileMobile = files?.['imagemMobile']?.[0];

            if (!fileDesktop || !fileMobile) {
                return res.status(400).json({ 
                    error: 'É necessário enviar tanto a imagem desktop quanto a imagem mobile' 
                });
            }

            // Faz upload das imagens
            const urlDesktop = await this.bannerService.uploadBannerImage(fileDesktop, 'desktop');
            const urlMobile = await this.bannerService.uploadBannerImage(fileMobile, 'mobile');

            // Cria o banner
            const banner = await this.bannerService.create({
                Titulo: Titulo || null,
                Descricao: Descricao || null,
                UrlImagemDesktop: urlDesktop,
                UrlImagemMobile: urlMobile,
                LinkDestino: LinkDestino || null,
                Ordem: Ordem ? parseInt(Ordem, 10) : undefined,
                Ativo: Ativo === 'true' || Ativo === true,
                AltTextDesktop: AltTextDesktop || null,
                AltTextMobile: AltTextMobile || null,
                TitleSEO: TitleSEO || null,
                MetaDescription: MetaDescription || null,
                CreatedBy: userId
            });

            return res.status(201).json(banner);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Erro ao criar banner';
            console.error('[BannerController] Erro ao criar banner:', error);
            return res.status(500).json({ error: errorMessage });
        }
    }

    /**
     * Atualiza um banner
     * PUT /api/banners/:id
     */
    async update(req: MulterRequest, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const userId = req.user?.Id;
            if (!userId) {
                return res.status(401).json({ error: 'Usuário não autenticado' });
            }

            const { Titulo, Descricao, LinkDestino, Ordem, Ativo, AltTextDesktop, AltTextMobile, TitleSEO, MetaDescription } = req.body;
            const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
            const fileDesktop = files?.['imagemDesktop']?.[0];
            const fileMobile = files?.['imagemMobile']?.[0];

            const bannerAtual = await this.bannerService.findById(id);
            if (!bannerAtual) {
                return res.status(404).json({ error: 'Banner não encontrado' });
            }

            let urlDesktop = bannerAtual.UrlImagemDesktop;
            let urlMobile = bannerAtual.UrlImagemMobile;

            // Se novas imagens foram enviadas, faz upload e remove as antigas
            if (fileDesktop) {
                await this.bannerService.deleteBannerImage(urlDesktop);
                urlDesktop = await this.bannerService.uploadBannerImage(fileDesktop, 'desktop');
            }

            if (fileMobile) {
                await this.bannerService.deleteBannerImage(urlMobile);
                urlMobile = await this.bannerService.uploadBannerImage(fileMobile, 'mobile');
            }

            const updateData: {
                UpdatedBy: string;
                Titulo?: string;
                Descricao?: string;
                LinkDestino?: string;
                Ordem?: number;
                Ativo?: boolean;
                UrlImagemDesktop?: string;
                UrlImagemMobile?: string;
                AltTextDesktop?: string;
                AltTextMobile?: string;
                TitleSEO?: string;
                MetaDescription?: string;
            } = {
                UpdatedBy: userId
            };

            if (Titulo !== undefined) updateData.Titulo = Titulo || undefined;
            if (Descricao !== undefined) updateData.Descricao = Descricao || undefined;
            if (LinkDestino !== undefined) updateData.LinkDestino = LinkDestino || undefined;
            if (Ordem !== undefined) updateData.Ordem = parseInt(Ordem, 10);
            if (Ativo !== undefined) updateData.Ativo = Ativo === 'true' || Ativo === true;
            if (urlDesktop) updateData.UrlImagemDesktop = urlDesktop;
            if (urlMobile) updateData.UrlImagemMobile = urlMobile;
            if (AltTextDesktop !== undefined) updateData.AltTextDesktop = AltTextDesktop || undefined;
            if (AltTextMobile !== undefined) updateData.AltTextMobile = AltTextMobile || undefined;
            if (TitleSEO !== undefined) updateData.TitleSEO = TitleSEO || undefined;
            if (MetaDescription !== undefined) updateData.MetaDescription = MetaDescription || undefined;

            const banner = await this.bannerService.update(id, updateData);

            return res.status(200).json(banner);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar banner';
            console.error('[BannerController] Erro ao atualizar banner:', error);
            return res.status(500).json({ error: errorMessage });
        }
    }

    /**
     * Deleta um banner
     * DELETE /api/banners/:id
     */
    async delete(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            await this.bannerService.delete(id);
            return res.status(200).json({ message: 'Banner deletado com sucesso' });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Erro ao deletar banner';
            console.error('[BannerController] Erro ao deletar banner:', error);
            
            if (errorMessage.includes('não encontrado')) {
                return res.status(404).json({ error: errorMessage });
            }
            
            return res.status(500).json({ error: errorMessage });
        }
    }

    /**
     * Ativa/desativa um banner
     * PATCH /api/banners/:id/toggle-active
     */
    async toggleActive(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const userId = req.user?.Id;
            if (!userId) {
                return res.status(401).json({ error: 'Usuário não autenticado' });
            }

            const banner = await this.bannerService.toggleActive(id, userId);
            return res.status(200).json(banner);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Erro ao alterar status do banner';
            console.error('[BannerController] Erro ao alterar status:', error);
            
            if (errorMessage.includes('não encontrado')) {
                return res.status(404).json({ error: errorMessage });
            }
            
            return res.status(500).json({ error: errorMessage });
        }
    }
}

