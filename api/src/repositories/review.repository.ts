import prisma from "../prisma/client";
import { IReviewRepository } from "../interfaces/review.repository.interface";
import { ReviewData } from "../types/review.types";

export class ReviewRepository implements IReviewRepository {
    private async updatePsychologistRating(psicologoId: string) {
        const aggregate = await prisma.review.aggregate({
            where: {
                PsicologoId: psicologoId,
                Status: "Aprovado",
            },
            _avg: { Rating: true },
            _count: { Rating: true },
        });

        const average = aggregate._avg.Rating ?? 0;
        const count = aggregate._count.Rating ?? 0;

        await prisma.user.update({
            where: { Id: psicologoId },
            data: {
                RatingAverage: average,
                RatingCount: count,
            },
        });
    }

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
                const updateData: {
                    Rating: number;
                    Comentario: string;
                    Status: string;
                    UpdatedAt: Date;
                    Titulo?: string;
                } = {
                    Rating: data.rating,
                    Comentario: data.comment,
                    Status: "Pendente",
                    UpdatedAt: new Date()
                };

                if (data.title !== undefined) {
                    updateData.Titulo = data.title;
                }

                const updated = await prisma.review.update({
                    where: { Id: existingReview.Id },
                    data: updateData,
                });
                await this.updatePsychologistRating(existingReview.PsicologoId);
                console.log(`✅ [ReviewRepository.createReview] Review atualizada com sucesso:`, updated.Id);
                return updated;
            }

            // Se não existe, cria uma nova avaliação com Status "Pendente" (requer aprovação do admin)
            console.log(`[ReviewRepository.createReview] Criando nova review para userId=${data.userId}, psicologoId=${data.psicologoId}`);
            const createData = {
                Rating: data.rating,
                Comentario: data.comment,
                PsicologoId: data.psicologoId,
                UserId: data.userId,
                Status: "Pendente", // Explicitamente define como Pendente para aprovação do admin
                MostrarNaHome: false,
                MostrarNaPsicologo: false
            } as {
                Rating: number;
                Comentario?: string;
                PsicologoId: string;
                UserId: string;
                Status: string;
                MostrarNaHome: boolean;
                MostrarNaPsicologo: boolean;
                Titulo?: string | null;
            };

            if (data.title !== undefined) {
                createData.Titulo = data.title;
            }

            const created = await prisma.review.create({
                data: createData,
            });
            await this.updatePsychologistRating(data.psicologoId);
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
                User: { select: { Id: true, Nome: true, Images: { select: { Id: true, Url: true } } } },
                Psicologo: { select: { Id: true, Nome: true, Images: { select: { Id: true, Url: true } } } },
            },
            orderBy: [{ Rating: "desc" }, { CreatedAt: "desc" }],
        });
    }

    async deleteReview(reviewId: string, userId: string) {
        const review = await prisma.review.findUnique({ where: { Id: reviewId } });
        if (!review || review.UserId !== userId) throw new Error("Permissão negada ou avaliação não encontrada.");
        await prisma.review.delete({ where: { Id: reviewId } });
        await this.updatePsychologistRating(review.PsicologoId);
    }

    async updateReview(reviewId: string, userId: string, rating: number, comment: string) {
        const review = await prisma.review.findUnique({ where: { Id: reviewId } });
        if (!review || review.UserId !== userId) throw new Error("Permissão negada ou avaliação não encontrada.");
        const updated = await prisma.review.update({
            where: { Id: reviewId },
            data: { Rating: rating, Comentario: comment },
        });
        await this.updatePsychologistRating(review.PsicologoId);
        return updated;
    }

    async getAverageRating(psicologoId: string) {
        const psicologo = await prisma.user.findUnique({
            where: { Id: psicologoId },
            select: {
                RatingAverage: true,
                RatingCount: true,
            },
        });
        if (!psicologo || psicologo.RatingCount === 0) return 0;
        return psicologo.RatingAverage;
    }

    async getReviewsByPsicologoId(psicologoId: string) {
        return prisma.review.findMany({
            where: { PsicologoId: psicologoId },
            include: {
                User: { select: { Id: true, Nome: true, Email: true, Images: { select: { Id: true, Url: true } } } },
            },
        });
    }

    async approveReview(id: string, status: string) {
        const updated = await prisma.review.update({
            where: { Id: id },
            data: { Status: status },
        });
        await this.updatePsychologistRating(updated.PsicologoId);
        return updated;
    }

    async getAllReviews() {
        return prisma.review.findMany({
            where: {
                MostrarNaHome: true,
                Status: "Aprovado"
            },
            include: {
                User: { select: { Id: true, Nome: true, Email: true, Images: { select: { Id: true, Url: true } } } },
                Psicologo: { select: { Id: true, Nome: true, Email: true, Images: { select: { Id: true, Url: true } } } },
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
