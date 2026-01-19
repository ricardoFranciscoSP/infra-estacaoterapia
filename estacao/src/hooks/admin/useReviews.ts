import { useAdmReviewsStore } from '@/store/admin/admReviewsStore';
import { ReviewCreate, Reviews, ReviewUpdate } from '@/types/admReviews.types';
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

export function useAdmReviews() {
    const store = useAdmReviewsStore();

    const query = useQuery<Reviews[]>({
        queryKey: ['reviews'],
        queryFn: async () => {
            // Agora retorna o array diretamente do método do store
            return await store.fetchReviews();
        },
        retry: 1,
        staleTime: 5 * 60 * 1000,
        enabled: true,
    });

    // Buscar review por ID - usando useCallback para estabilizar a referência
    const getReviewById = useCallback(async (id: string) => {
        return await store.getReviewById(id);
    }, [store]);

    // Criar review - usando useCallback para estabilizar a referência
    const createReview = useCallback(async (review: ReviewCreate) => {
        const created = await store.createReview(review);
        await query.refetch();
        return created;
    }, [store, query]);

    // Atualizar review - usando useCallback para estabilizar a referência
    const updateReview = useCallback(async (id: string, review: ReviewUpdate) => {
        await store.updateReview(id, review);
        await query.refetch(); // Opcional: refetch após update
    }, [store, query]);

    // Deletar review - usando useCallback para estabilizar a referência
    const deleteReview = useCallback(async (id: string) => {
        await store.deleteReview(id);
        await query.refetch(); // Opcional: refetch após delete
    }, [store, query]);

    return {
        reviews: query.data ?? [],
        isLoading: query.isLoading || store.isLoading,
        isError: query.isError || store.isError,
        refetch: query.refetch,
        getReviewById,
        createReview,
        updateReview,
        deleteReview,
    };
}