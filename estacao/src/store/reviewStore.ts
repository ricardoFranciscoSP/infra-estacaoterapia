import { create } from 'zustand';
import { Review } from '@/types/reviewTypes';
import { reviewService } from '@/services/reviewService';

interface ReviewStore {
    reviews: Review[];
    averageRating: number | null;
    loading: boolean;
    error: string | null;

    fetchReviews: (psicologoId: string) => Promise<void>;
    fetchReviewsId: (psicologoId: string) => Promise<void>;
    fetchAverageRating: (psicologoId: string) => Promise<void>;
    createReview: (data: { rating: number; comment: string; psicologoId: string }) => Promise<void>;
    updateReview: (reviewId: string, rating: number, comment: string) => Promise<void>;
    deleteReview: (reviewId: string) => Promise<void>;
    approveReview: (id: string, status: string) => Promise<void>;
    fetchAllReviews: () => Promise<void>;
}

// Helper para extrair mensagem de erro com segurança
const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    return 'Ocorreu um erro inesperado.';
};

export const useReviewStore = create<ReviewStore>((set, get) => ({
    reviews: [],
    averageRating: null,
    loading: false,
    error: null,


    fetchReviews: async (psicologoId: string) => {
        set({ loading: true, error: null });
        try {
            const res = await reviewService.getApprovedReviews(psicologoId);
            set({ reviews: res.data.reviews || [], loading: false });
        } catch (error: unknown) {
            set({ error: getErrorMessage(error), loading: false });
        }
    },

    fetchReviewsId: async (psicologoId: string) => {
        set({ loading: true, error: null });
        try {
            const res = await reviewService.getApprovedReviews(psicologoId);
            set({ reviews: res.data.reviews || [], loading: false });
        } catch (error: unknown) {
            set({ error: getErrorMessage(error), loading: false });
        }
    },

    fetchAverageRating: async (psicologoId: string) => {
        set({ loading: true, error: null });
        try {
            const res = await reviewService.getAverageRating(psicologoId);
            set({ averageRating: res.data.averageRating ?? null, loading: false });
        } catch (error: unknown) {
            set({ error: getErrorMessage(error), loading: false });
        }
    },

    createReview: async ({ rating, comment, psicologoId }) => {
        set({ loading: true, error: null });
        try {
            await reviewService.createReview({ rating, comment, psicologoId });
            // Atualiza lista após criar
            await get().fetchReviews(psicologoId);
            set({ loading: false });
        } catch (error: unknown) {
            set({ error: getErrorMessage(error), loading: false });
        }
    },

    updateReview: async (reviewId, rating, comment) => {
        set({ loading: true, error: null });
        try {
            await reviewService.updateReview(reviewId, rating, comment);
            set({ loading: false });
        } catch (error: unknown) {
            set({ error: getErrorMessage(error), loading: false });
        }
    },

    deleteReview: async (reviewId) => {
        set({ loading: true, error: null });
        try {
            await reviewService.deleteReview(reviewId);
            set(state => ({
                reviews: state.reviews.filter(r => r.Id !== reviewId),
                loading: false
            }));
        } catch (error: unknown) {
            set({ error: getErrorMessage(error), loading: false });
        }
    },

    approveReview: async (id, status) => {
        set({ loading: true, error: null });
        try {
            await reviewService.approveReview(id, status);
            set({ loading: false });
        } catch (error: unknown) {
            set({ error: getErrorMessage(error), loading: false });
        }
    },

    fetchAllReviews: async () => {
        set({ loading: true, error: null });
        try {
            const res = await reviewService.getReviews();
            set({ reviews: res.data.reviews || [], loading: false });
        } catch (error: unknown) {
            set({ error: getErrorMessage(error), loading: false });
        }
    },
}));
