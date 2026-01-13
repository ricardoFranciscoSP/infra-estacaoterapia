import { api } from "@/lib/axios";
import { ReviewUpdate } from "@/types/admReviews.types";

export const admReviewsService = () => {
    return {
        getReviews: () => api.get('/admin/reviews'),
        getReviewById: (id: string) => api.get(`/admin/reviews/${id}`),
        updateReview: (id: string, review: ReviewUpdate) => api.put(`/admin/reviews/${id}`, review),
        deleteReview: (id: string) => api.delete(`/admin/reviews/${id}`),
    };
}