import prisma from "../prisma/client";
import { IReviewRepository } from "../interfaces/review.repository.interface";
import { ReviewData } from "../types/review.types";

export class ReviewRepository implements IReviewRepository {
    async createReview(data: ReviewData) {
        try {
            // Verifica se já existe uma avaliação do mesmo paciente para o mesmo psicólogo
            const existingReview = await prisma.review.findFirst({
                where: {
                    UserId: data.userId,
                    PsicologoId: data.psicologoId
                }
            });

            console.log(`[ReviewRepository.createReview] Procurando review existente para userId=${data.userId}, psicologoId=${data.psicologoId}`);
            console.log(`[ReviewRepository.createReview] Review encontrada:`, existingReview?.Id);

            // Se já existe, atualiza a avaliação existente
            if (existingReview) {
                console.log(`[ReviewRepository.createReview] Atualizando review existente: ${existingReview.Id}`);
                const updated = await prisma.review.update({
                    where: { Id: existingReview.Id },
                    data: {
                        Rating: data.rating,
                        Comentario: data.comment,
                        Status: "Pendente", // Reseta o status para pendente quando atualiza
                        UpdatedAt: new Date()
                    },
                });
                console.log(`✅ [ReviewRepository.createReview] Review atualizada com sucesso:`, updated.Id);
                return updated;
            }

            // Se não existe, cria uma nova avaliação com Status "Pendente" (requer aprovação do admin)
            console.log(`[ReviewRepository.createReview] Criando nova review para userId=${data.userId}, psicologoId=${data.psicologoId}`);
            const created = await prisma.review.create({
                data: {
                    Rating: data.rating,
                    Comentario: data.comment,
                    PsicologoId: data.psicologoId,
                    UserId: data.userId,
                    Status: "Pendente", // Explicitamente define como Pendente para aprovação do admin
                    MostrarNaHome: false,
                    MostrarNaPsicologo: false
                },
            });
            console.log(`✅ [ReviewRepository.createReview] Review criada com sucesso:`, created.Id, `| Status: ${created.Status}`);
            return created;
        } catch (error) {
            console.error("❌ [ReviewRepository.createReview] Erro ao criar/atualizar review:", error);
            throw error;
        }
    }

    async getApprovedReviews(psicologoId: string) {
        return prisma.review.findMany({
            where: { PsicologoId: psicologoId, Status: "Aprovado" },
            include: {
                User: { select: { Id: true, Nome: true, Images: true } },
                Psicologo: { select: { Id: true, Nome: true, Images: true } },
            },
            orderBy: [{ Rating: "desc" }, { CreatedAt: "desc" }],
        });
    }

    async deleteReview(reviewId: string, userId: string) {
        const review = await prisma.review.findUnique({ where: { Id: reviewId } });
        if (!review || review.UserId !== userId) throw new Error("Permissão negada ou avaliação não encontrada.");
        await prisma.review.delete({ where: { Id: reviewId } });
    }

    async updateReview(reviewId: string, userId: string, rating: number, comment: string) {
        const review = await prisma.review.findUnique({ where: { Id: reviewId } });
        if (!review || review.UserId !== userId) throw new Error("Permissão negada ou avaliação não encontrada.");
        return prisma.review.update({
            where: { Id: reviewId },
            data: { Rating: rating, Comentario: comment },
        });
    }

    async getAverageRating(psicologoId: string) {
        type SimpleReview = { Rating: number };
        // Busca apenas avaliações aprovadas para calcular a média
        const reviews = await prisma.review.findMany({ 
            where: { 
                PsicologoId: psicologoId,
                Status: "Aprovado" // Apenas avaliações aprovadas contam para a média
            } 
        }) as SimpleReview[];
        if (reviews.length === 0) return 0;
        const totalRating = reviews.reduce((acc: number, review: SimpleReview) => acc + review.Rating, 0);
        return totalRating / reviews.length;
    }

    async getReviewsByPsicologoId(psicologoId: string) {
        return prisma.review.findMany({
            where: { PsicologoId: psicologoId },
            include: {
                User: { select: { Id: true, Nome: true, Email: true, Images: true } },
            },
        });
    }

    async approveReview(id: string, status: string) {
        return prisma.review.update({
            where: { Id: id },
            data: { Status: status },
        });
    }

    async getAllReviews() {
        return prisma.review.findMany({
            where: {
                MostrarNaHome: true,
                Status: "Aprovado"
            },
            include: {
                User: { select: { Id: true, Nome: true, Email: true, Images: true } },
                Psicologo: { select: { Id: true, Nome: true, Email: true, Images: true } },
            },
            orderBy: [{ CreatedAt: "desc" }],
        });
    }

    /**
     * ✅ Verifica se um paciente (UserId) já fez review para um psicólogo (PsicologoId)
     * Busca na tabela Review onde UserId = patientId e PsicologoId = psychologistId
     * Retorna true se encontrar um registro (mesmo que UserId seja null, se encontrar qualquer registro com o PsicologoId)
     * Mas o correto é verificar se UserId não é null e corresponde ao patientId
     */
    async hasPatientReviewedPsychologist(patientId: string, psychologistId: string): Promise<boolean> {
        console.log(`🔍 [ReviewRepository] Verificando se paciente ${patientId} já fez review para psicólogo ${psychologistId}`);
        
        const review = await prisma.review.findFirst({
            where: {
                UserId: patientId, // ✅ Verifica se UserId (paciente) já fez review
                PsicologoId: psychologistId // ✅ Para o PsicologoId da ReservaSessao
            }
        });
        
        const hasReview = !!review;
        console.log(`🔍 [ReviewRepository] Review encontrada: ${hasReview}`, {
            patientId,
            psychologistId,
            reviewId: review?.Id || null,
            reviewUserId: review?.UserId || null
        });
        
        return hasReview;
    }
}
