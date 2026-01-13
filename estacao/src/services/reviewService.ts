import { api } from "@/lib/axios";

export const reviewService = {
    // Busca todas as reviews 
    getReviews: () => api.get(`/reviews/all`),
    // Busca reviews aprovados de um psicólogo
    getApprovedReviews: (psicologoId: string) => api.get(`/reviews/${psicologoId}`),

    // Busca reviews por psicólogo (sem filtro de aprovação)
    getReviewsByPsicologoId: (psicologoId: string) => api.get(`/reviews/id/${psicologoId}`),

    // Cria uma nova review
    createReview: (data: { rating: number; comment: string; psicologoId: string }) =>
        api.post(`/reviews`, data),

    // Atualiza uma review existente
    updateReview: (reviewId: string, rating: number, comment: string) =>
        api.put(`/reviews/${reviewId}`, { rating, comment }),

    // Deleta uma review
    deleteReview: (reviewId: string) => api.delete(`/reviews/${reviewId}`),

    // Aprova ou reprova uma review
    approveReview: (id: string, status: string) =>
        api.put(`/reviews/approve/${id}`, { status }),

    // Busca média das avaliações de um psicólogo
    getAverageRating: (psicologoId: string) => api.get(`/reviews/average/${psicologoId}`),

    // Verifica se um paciente já fez review para um psicólogo
    hasPatientReviewedPsychologist: (patientId: string, psychologistId: string) =>
        api.get(`/reviews/has-reviewed?patientId=${patientId}&psychologistId=${psychologistId}`),
};
