import { api } from '@/lib/axios';
import { AxiosResponse } from 'axios';

export interface Banner {
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
    CreatedAt: string;
    UpdatedAt: string;
    CreatedBy: string;
    UpdatedBy: string | null;
    Creator?: {
        Id: string;
        Nome: string;
        Email: string;
    };
    Updater?: {
        Id: string;
        Nome: string;
        Email: string;
    };
}

export interface CreateBannerData {
    Titulo?: string;
    Descricao?: string;
    LinkDestino?: string;
    Ordem?: number;
    Ativo?: boolean;
    AltTextDesktop?: string;
    AltTextMobile?: string;
    TitleSEO?: string;
    MetaDescription?: string;
}

export type UpdateBannerData = CreateBannerData;

export const bannerService = {
    /**
     * Lista todos os banners
     */
    list: (ativosApenas?: boolean): Promise<AxiosResponse<Banner[]>> => {
        const params = ativosApenas ? { ativos: 'true' } : {};
        return api.get('/banners', { params });
    },

    /**
     * Busca um banner por ID
     */
    getById: (id: string): Promise<AxiosResponse<Banner>> => {
        return api.get(`/banners/${id}`);
    },

    /**
     * Cria um novo banner
     */
    create: (data: CreateBannerData, imagemDesktop: File, imagemMobile: File): Promise<AxiosResponse<Banner>> => {
        const formData = new FormData();
        
        if (data.Titulo) formData.append('Titulo', data.Titulo);
        if (data.Descricao) formData.append('Descricao', data.Descricao);
        if (data.LinkDestino) formData.append('LinkDestino', data.LinkDestino);
        if (data.Ordem !== undefined) formData.append('Ordem', data.Ordem.toString());
        if (data.Ativo !== undefined) formData.append('Ativo', data.Ativo.toString());
        if (data.AltTextDesktop) formData.append('AltTextDesktop', data.AltTextDesktop);
        if (data.AltTextMobile) formData.append('AltTextMobile', data.AltTextMobile);
        if (data.TitleSEO) formData.append('TitleSEO', data.TitleSEO);
        if (data.MetaDescription) formData.append('MetaDescription', data.MetaDescription);
        
        formData.append('imagemDesktop', imagemDesktop);
        formData.append('imagemMobile', imagemMobile);

        return api.post('/banners', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },

    /**
     * Atualiza um banner
     */
    update: (
        id: string, 
        data: UpdateBannerData, 
        imagemDesktop?: File, 
        imagemMobile?: File
    ): Promise<AxiosResponse<Banner>> => {
        const formData = new FormData();
        
        if (data.Titulo !== undefined) formData.append('Titulo', data.Titulo || '');
        if (data.Descricao !== undefined) formData.append('Descricao', data.Descricao || '');
        if (data.LinkDestino !== undefined) formData.append('LinkDestino', data.LinkDestino || '');
        if (data.Ordem !== undefined) formData.append('Ordem', data.Ordem.toString());
        if (data.Ativo !== undefined) formData.append('Ativo', data.Ativo.toString());
        if (data.AltTextDesktop !== undefined) formData.append('AltTextDesktop', data.AltTextDesktop || '');
        if (data.AltTextMobile !== undefined) formData.append('AltTextMobile', data.AltTextMobile || '');
        if (data.TitleSEO !== undefined) formData.append('TitleSEO', data.TitleSEO || '');
        if (data.MetaDescription !== undefined) formData.append('MetaDescription', data.MetaDescription || '');
        
        if (imagemDesktop) formData.append('imagemDesktop', imagemDesktop);
        if (imagemMobile) formData.append('imagemMobile', imagemMobile);

        return api.put(`/banners/${id}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },

    /**
     * Deleta um banner
     */
    delete: (id: string): Promise<AxiosResponse<void>> => {
        return api.delete(`/banners/${id}`);
    },

    /**
     * Ativa/desativa um banner
     */
    toggleActive: (id: string): Promise<AxiosResponse<Banner>> => {
        return api.patch(`/banners/${id}/toggle-active`);
    }
};

