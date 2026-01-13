import { ReviewData } from "../types/review.types";

export interface IReviewRepository {
    createReview(data: ReviewData): Promise<unknown>;
    getApprovedReviews(psicologoId: string): Promise<unknown[]>;
    deleteReview(reviewId: string, userId: string): Promise<void>;
    updateReview(reviewId: string, userId: string, rating: number, comment: string): Promise<unknown>;
    getAverageRating(psicologoId: string): Promise<number>;
    getReviewsByPsicologoId(psicologoId: string): Promise<unknown[]>;
    approveReview(id: string, status: string): Promise<unknown>;
    getAllReviews(): Promise<unknown[]>;
    hasPatientReviewedPsychologist(patientId: string, psychologistId: string): Promise<boolean>;
}
