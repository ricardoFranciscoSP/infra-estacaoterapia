import { Request, Response } from "express";
import { AuthorizationService } from "../services/authorization.service";
import { ReviewService } from "../services/review.service";
import { ActionType, Module } from "../types/permissions.types";
import { normalizeParamStringRequired, normalizeQueryString } from "../utils/validation.util";

export class ReviewController {
    constructor(
        private authService: AuthorizationService,
        private reviewService: ReviewService
    ) { }

    /**
     * Cria uma nova avaliação para um psicólogo.
     * @param req Request do Express contendo rating, comment, psicologoId.
     * @param res Response do Express.
     * @returns Response com avaliação criada ou erro.
     */
    async createReview(req: Request, res: Response): Promise<Response> {
        try {
            const { rating, comment, psicologoId } = req.body;
            const userId = this.authService.getLoggedUserId(req);

            if (!userId)
                return res.status(401).json({ success: false, error: "Usuário não autenticado." });

            // Valida dados obrigatórios
            if (!rating || !comment || !psicologoId)
                return res.status(400).json({ success: false, error: "Rating, comentário e psicologoId são obrigatórios." });

            // Valida tipo e intervalo do rating
            if (typeof rating !== 'number' || rating < 1 || rating > 5)
                return res.status(400).json({ success: false, error: "Rating deve ser um número entre 1 e 5." });

            // Valida comentário
            if (typeof comment !== 'string' || comment.trim().length === 0)
                return res.status(400).json({ success: false, error: "Comentário não pode estar vazio." });

            // Sempre grava a review com Status 'Pendente' - não restringe por permissão
            const review = await this.reviewService.createReview({ rating, comment, psicologoId, userId });
            
            console.log(`✅ [ReviewController] Review criada com sucesso:`, {
                reviewId: (review as any)?.Id,
                userId,
                psicologoId,
                rating,
                status: (review as any)?.Status
            });
            
            return res.status(201).json({ success: true, review });
        } catch (error) {
            console.error("❌ [ReviewController] Erro ao criar avaliação:", error);
            return res.status(500).json({ success: false, error: "Erro ao criar avaliação." });
        }
    }

    /**
     * Busca avaliações aprovadas de um psicólogo.
     * @param req Request do Express contendo psicologoId.
     * @param res Response do Express.
     * @returns Response com avaliações ou erro.
     */
    async getReviews(req: Request, res: Response): Promise<Response> {
        try {
            const psicologoId = normalizeParamStringRequired(req.params.psicologoId);
            if (!psicologoId) {
                return res.status(400).json({ success: false, error: "ID do psicólogo é obrigatório." });
            }
            console.log('psicologoId:', psicologoId);
            const reviews = await this.reviewService.getApprovedReviews(psicologoId);
            console.log('reviews:', reviews);
            return res.status(200).json({ success: true, reviews });
        } catch (error) {
            return res.status(500).json({ success: false, error: "Erro ao buscar avaliações." });
        }
    }

    /**
     * Exclui uma avaliação do psicólogo.
     * @param req Request do Express contendo reviewId.
     * @param res Response do Express.
     * @returns Response de sucesso ou erro.
     */
    async deleteReview(req: Request, res: Response): Promise<Response> {
        try {
            const reviewId = normalizeParamStringRequired(req.params.reviewId);
            if (!reviewId) {
                return res.status(400).json({ success: false, error: "ID da avaliação é obrigatório." });
            }
            const userId = this.authService.getLoggedUserId(req);

            if (!userId)
                return res.status(401).json({ success: false, error: "Usuário não autenticado." });

            const canDelete = await this.authService.checkPermission(userId, Module.Reviews, ActionType.Delete);
            if (!canDelete)
                return res.status(403).json({ error: "Acesso negado" });

            await this.reviewService.deleteReview(reviewId, userId);
            return res.status(200).json({ success: true, message: "Avaliação excluída com sucesso." });
        } catch (error) {
            return res.status(500).json({ success: false, error: "Erro ao excluir avaliação." });
        }
    }

    /**
     * Atualiza uma avaliação do psicólogo.
     * @param req Request do Express contendo reviewId, rating, comment.
     * @param res Response do Express.
     * @returns Response com avaliação atualizada ou erro.
     */
    async updateReview(req: Request, res: Response): Promise<Response> {
        try {
            const { reviewId } = req.params;
            const { rating, comment } = req.body;
            const userId = this.authService.getLoggedUserId(req);

            if (!userId)
                return res.status(401).json({ success: false, error: "Usuário não autenticado." });

            const canUpdate = await this.authService.checkPermission(userId, Module.Reviews, ActionType.Update);
            if (!canUpdate)
                return res.status(403).json({ error: "Acesso negado" });

            const reviewIdNormalized = normalizeParamStringRequired(req.params.reviewId || '');
            if (!reviewIdNormalized) {
                return res.status(400).json({ success: false, error: "ID da avaliação é obrigatório." });
            }
            const updatedReview = await this.reviewService.updateReview(reviewIdNormalized, userId, rating, comment);
            return res.status(200).json({ success: true, updatedReview });
        } catch (error) {
            return res.status(500).json({ success: false, error: "Erro ao atualizar avaliação." });
        }
    }

    /**
     * Busca média das avaliações de um psicólogo.
     * @param req Request do Express contendo psicologoId.
     * @param res Response do Express.
     * @returns Response com média das avaliações ou erro.
     */
    async getAverageRating(req: Request, res: Response): Promise<Response> {
        try {
            const psicologoId = normalizeParamStringRequired(req.params.psicologoId);
            if (!psicologoId) {
                return res.status(400).json({ success: false, error: "ID do psicólogo é obrigatório." });
            }
            const averageRating = await this.reviewService.getAverageRating(psicologoId);
            return res.status(200).json({ success: true, averageRating });
        } catch (error) {
            return res.status(500).json({ success: false, error: "Erro ao calcular a média das avaliações." });
        }
    }

    /**
     * Busca avaliações por ID do psicólogo.
     * @param req Request do Express contendo psicologoId.
     * @param res Response do Express.
     * @returns Response com avaliações ou erro.
     */
    async getReviewsId(req: Request, res: Response): Promise<Response> {
        try {
            const psicologoId = normalizeParamStringRequired(req.params.psicologoId);
            if (!psicologoId) {
                return res.status(400).json({ success: false, error: "ID do psicólogo é obrigatório." });
            }
            const reviews = await this.reviewService.getReviewsByPsicologoId(psicologoId);
            return res.status(200).json({ success: true, reviews });
        } catch (error) {
            return res.status(500).json({ success: false, error: "Erro ao buscar avaliações." });
        }
    }

    /**
     * Aprova ou reprova uma avaliação.
     * @param req Request do Express contendo id da avaliação e status.
     * @param res Response do Express.
     * @returns Response com avaliação aprovada/reprovada ou erro.
     */
    async approveReview(req: Request, res: Response): Promise<Response> {
        try {
            const id = normalizeParamStringRequired(req.params.id);
            if (!id) {
                return res.status(400).json({ success: false, error: "ID da avaliação é obrigatório." });
            }
            const { status } = req.body;
            const userId = this.authService.getLoggedUserId(req);

            if (!userId)
                return res.status(401).json({ success: false, error: "Usuário não autenticado." });

            const canApprove = await this.authService.checkPermission(userId, Module.Reviews, ActionType.Approve);
            if (!canApprove)
                return res.status(403).json({ error: "Acesso negado" });

            const updatedReview = await this.reviewService.approveReview(id, status);
            return res.status(200).json({ success: true, review: updatedReview });
        } catch (error) {
            return res.status(500).json({ success: false, error: "Erro ao aprovar avaliação." });
        }
    }

    /**
     * Busca todas as avaliações.
     * @param req Request do Express.
     * @param res Response do Express.
     * @returns Response com todas as avaliações ou erro.
     */
    async getReviewsAll(req: Request, res: Response): Promise<Response> {
        try {
            const reviews = await this.reviewService.getAllReviews();

            console.log('All reviews fetched:', reviews.length);
            return res.status(200).json({ success: true, reviews });
        } catch (error) {
            console.error('Error fetching all reviews:', error);
            return res.status(500).json({ success: false, error: "Erro ao buscar todas as avaliações." });
        }
    }

    /**
     * Verifica se um paciente já fez review para um psicólogo.
     * @param req Request do Express contendo patientId e psychologistId.
     * @param res Response do Express.
     * @returns Response com boolean indicando se já existe review.
     */
    async hasPatientReviewedPsychologist(req: Request, res: Response): Promise<Response> {
        try {
            const patientId = normalizeQueryString(req.query.patientId);
            const psychologistId = normalizeQueryString(req.query.psychologistId);

            if (!patientId || !psychologistId) {
                return res.status(400).json({ 
                    success: false, 
                    error: "patientId e psychologistId são obrigatórios." 
                });
            }

            const hasReviewed = await this.reviewService.hasPatientReviewedPsychologist(patientId, psychologistId);
            return res.status(200).json({ success: true, hasReviewed });
        } catch (error) {
            console.error('Error checking if patient reviewed psychologist:', error);
            return res.status(500).json({ 
                success: false, 
                error: "Erro ao verificar se paciente já avaliou psicólogo." 
            });
        }
    }
}
