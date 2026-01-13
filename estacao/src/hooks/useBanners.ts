import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bannerService, Banner, CreateBannerData, UpdateBannerData } from '@/services/bannerService';
import toast from 'react-hot-toast';

/**
 * Hook para listar todos os banners
 */
export function useBanners(ativosApenas?: boolean) {
    return useQuery<Banner[]>({
        queryKey: ['banners', ativosApenas],
        queryFn: async () => {
            const response = await bannerService.list(ativosApenas);
            return response.data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutos
    });
}

/**
 * Hook para buscar um banner por ID
 */
export function useBanner(id: string | undefined) {
    return useQuery<Banner>({
        queryKey: ['banner', id],
        queryFn: async () => {
            if (!id) throw new Error('ID do banner é obrigatório');
            const response = await bannerService.getById(id);
            return response.data;
        },
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Hook para criar um novo banner
 */
export function useCreateBanner() {
    const queryClient = useQueryClient();

    return useMutation<Banner, Error, { data: CreateBannerData; imagemDesktop: File; imagemMobile: File }>({
        mutationFn: async ({ data, imagemDesktop, imagemMobile }) => {
            const response = await bannerService.create(data, imagemDesktop, imagemMobile);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['banners'] });
            toast.success('Banner cadastrado com sucesso!');
        },
        onError: (error: Error) => {
            toast.error(`Erro ao criar banner: ${error.message}`);
        },
    });
}

/**
 * Hook para atualizar um banner
 */
export function useUpdateBanner() {
    const queryClient = useQueryClient();

    return useMutation<
        Banner,
        Error,
        { id: string; data: UpdateBannerData; imagemDesktop?: File; imagemMobile?: File }
    >({
        mutationFn: async ({ id, data, imagemDesktop, imagemMobile }) => {
            const response = await bannerService.update(id, data, imagemDesktop, imagemMobile);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['banners'] });
            toast.success('Banner atualizado com sucesso!');
        },
        onError: (error: Error) => {
            toast.error(`Erro ao atualizar banner: ${error.message}`);
        },
    });
}

/**
 * Hook para deletar um banner
 */
export function useDeleteBanner() {
    const queryClient = useQueryClient();

    return useMutation<void, Error, string>({
        mutationFn: async (id) => {
            await bannerService.delete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['banners'] });
            toast.success('Banner deletado com sucesso!');
        },
        onError: (error: Error) => {
            toast.error(`Erro ao deletar banner: ${error.message}`);
        },
    });
}

/**
 * Hook para ativar/desativar um banner
 */
export function useToggleBannerActive() {
    const queryClient = useQueryClient();

    return useMutation<Banner, Error, string>({
        mutationFn: async (id) => {
            const response = await bannerService.toggleActive(id);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['banners'] });
        },
        onError: (error: Error) => {
            toast.error(`Erro ao alterar status do banner: ${error.message}`);
        },
    });
}

