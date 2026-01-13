import { create } from 'zustand';
import type { Reviews, ReviewUpdate } from '@/types/admReviews.types';
import { admReviewsService } from '@/services/admReviewsServices';

type State = {
    reviews: Reviews[];
    isLoading: boolean;
    isError: boolean;
};

type Actions = {
    setReviews: (reviews: Reviews[]) => void;
    fetchReviews: () => Promise<Reviews[]>;
    getReviewById: (id: string) => Promise<Reviews | null>;
    updateReview: (id: string, review: ReviewUpdate) => Promise<Reviews[]>;
    deleteReview: (id: string) => Promise<Reviews[]>;
};

export const useAdmReviewsStore = create<State & Actions>((set, get) => ({
    reviews: [],
    isLoading: false,
    isError: false,

    setReviews: (reviews) => set({ reviews }),

    fetchReviews: async () => {
        set({ isLoading: true, isError: false });
        try {
            const response = await admReviewsService().getReviews();
            set({ reviews: response.data, isLoading: false });
            return response.data;
        } catch (error) {
            set({ isError: true, isLoading: false });
            console.error('Erro ao buscar avaliações:', error);
            return [];
        }
    },

    getReviewById: async (id: string) => {
        set({ isLoading: true, isError: false });
        try {
            const response = await admReviewsService().getReviewById(id);
            set({ isLoading: false });
            return response.data;
        } catch (error) {
            set({ isError: true, isLoading: false });
            console.error('Erro ao buscar avaliação por ID:', error);
            return null;
        }
    },

    updateReview: async (id: string, review: ReviewUpdate) => {
        set({ isLoading: true, isError: false });
        try {
            // Ensure the type matches what admReviewsService expects
            const response = await admReviewsService().updateReview(id, review);
            const updated = get().reviews.map(r => r.Id === id ? response.data : r);
            set({ reviews: updated, isLoading: false });
            return updated;
        } catch (error) {
            set({ isError: true, isLoading: false });
            console.error('Erro ao atualizar avaliação:', error);
            return get().reviews;
        }
    },

    deleteReview: async (id: string) => {
        set({ isLoading: true, isError: false });
        try {
            await admReviewsService().deleteReview(id);
            const filtered = get().reviews.filter(r => r.Id !== id);
            set({ reviews: filtered, isLoading: false });
            return filtered;
        } catch (error) {
            set({ isError: true, isLoading: false });
            console.error('Erro ao deletar avaliação:', error);
            return get().reviews;
        }
    },
}));