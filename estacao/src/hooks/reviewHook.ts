import { queryClient } from '@/lib/queryClient';
import { useReviewStore } from '@/store/reviewStore';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Review } from '@/types/reviewTypes';
import React from 'react';

// Buscar avaliações aprovadas de um psicólogo
export function useReviews(psicologoId: string) {
    const { fetchReviewsId } = useReviewStore();

    const query = useQuery<Review[], Error>({
        queryKey: ['reviews', psicologoId],
        queryFn: async () => {
            await fetchReviewsId(psicologoId);
            return useReviewStore.getState().reviews;
        },
        enabled: !!psicologoId,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
    });

    React.useEffect(() => {
        if (query.data) {
            // Zustand já sincroniza internamente
        }
    }, [query.data]);

    return {
        reviews: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}

// Buscar todas avaliações (admin)
export function useReviewsById(psicologoId: string) {
    const { reviews, fetchReviewsId } = useReviewStore();

    const query = useQuery<Review[], Error>({
        queryKey: ['reviewsId', psicologoId],
        queryFn: () => fetchReviewsId(psicologoId).then(() => reviews),
        enabled: !!psicologoId,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,

    });

    return {
        reviews: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}

// Buscar média de avaliações
export function useAverageRating(psicologoId: string) {
    const { fetchAverageRating } = useReviewStore();

    const query = useQuery<number | null, Error>({
        queryKey: ['averageRating', psicologoId],
        queryFn: async () => {
            await fetchAverageRating(psicologoId);
            // Após o fetch, pegue o valor atualizado do Zustand
            return useReviewStore.getState().averageRating;
        },
        enabled: !!psicologoId,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
        retry: 1,
        refetchOnWindowFocus: false,
    });

    return {
        averageRating: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}

// Criar avaliação
export function useCreateReview() {
    const { createReview } = useReviewStore();

    const mutation = useMutation({
        mutationFn: createReview,
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['reviews', variables.psicologoId] });
            queryClient.invalidateQueries({ queryKey: ['averageRating', variables.psicologoId] });
        },
    });

    return {
        mutate: mutation.mutate,
        isPending: mutation.isPending,
        isError: mutation.isError,
        data: mutation.data,
        reset: mutation.reset,
    };
}

// Atualizar avaliação
export function useUpdateReview() {
    const { updateReview } = useReviewStore();

    const mutation = useMutation({
        mutationFn: ({ reviewId, rating, comment }: { reviewId: string; rating: number; comment: string }) =>
            updateReview(reviewId, rating, comment),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reviews'] });
        },
    });

    return {
        mutate: mutation.mutate,
        isPending: mutation.isPending,
        isError: mutation.isError,
        data: mutation.data,
        reset: mutation.reset,
    };
}

// Deletar avaliação
export function useDeleteReview() {
    const { deleteReview } = useReviewStore();

    const mutation = useMutation({
        mutationFn: (reviewId: string) => deleteReview(reviewId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reviews'] });
            queryClient.invalidateQueries({ queryKey: ['averageRating'] });
        },
    });

    return {
        mutate: mutation.mutate,
        isPending: mutation.isPending,
        isError: mutation.isError,
        data: mutation.data,
        reset: mutation.reset,
    };
}

// Aprovar avaliação (admin)
export function useApproveReview() {
    const { approveReview } = useReviewStore();

    const mutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) => approveReview(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reviewsId'] });
        },
    });

    return {
        mutate: mutation.mutate,
        isPending: mutation.isPending,
        isError: mutation.isError,
        data: mutation.data,
        reset: mutation.reset,
    };
}

// Buscar todos os reviews (admin/global)
export function useAllReviews() {
    const { fetchAllReviews } = useReviewStore();

    const query = useQuery<Review[], Error>({
        queryKey: ['allReviews'],
        queryFn: async () => {
            await fetchAllReviews();
            const atualizadas = useReviewStore.getState().reviews;
            return atualizadas;
        },
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
    });

    return {
        reviews: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}
