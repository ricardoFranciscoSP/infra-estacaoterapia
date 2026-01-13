import { IReviewRepository } from "../interfaces/review.repository.interface";
import { ReviewData } from "../types/review.types";

export class ReviewService {
    constructor(private reviewRepository: IReviewRepository) { }

    async createReview(data: ReviewData) {
        return this.reviewRepository.createReview(data);
    }

    async getApprovedReviews(psicologoId: string) {
        return this.reviewRepository.getApprovedReviews(psicologoId);
    }

    async deleteReview(reviewId: string, userId: string) {
        await this.reviewRepository.deleteReview(reviewId, userId);
    }

    async updateReview(reviewId: string, userId: string, rating: number, comment: string) {
        return this.reviewRepository.updateReview(reviewId, userId, rating, comment);
    }

    async getAverageRating(psicologoId: string) {
        return this.reviewRepository.getAverageRating(psicologoId);
    }

    async getReviewsByPsicologoId(psicologoId: string) {
        return this.reviewRepository.getReviewsByPsicologoId(psicologoId);
    }

    async approveReview(id: string, status: string) {
        return this.reviewRepository.approveReview(id, status);
    }

    async getAllReviews() {
        return this.reviewRepository.getAllReviews();
    }

    async hasPatientReviewedPsychologist(patientId: string, psychologistId: string): Promise<boolean> {
        return this.reviewRepository.hasPatientReviewedPsychologist(patientId, psychologistId);
    }
}
