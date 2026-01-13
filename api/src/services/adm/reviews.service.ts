import prisma from "../../prisma/client";
import { Prisma } from "../../generated/prisma/client";
import { IReviewsService } from "../../interfaces/adm/iReview.interface";
import { Request, Response } from "express";
import { normalizeParamString } from "../../utils/validation.util";

export class ReviewsService implements IReviewsService {
    private authorizationService: any;

    constructor(authorizationService?: any) {
        this.authorizationService = authorizationService;
    }

    async list(req: Request, res: Response): Promise<Response> {
        // Lista TODOS os reviews (incluindo Pendentes, Aprovados, Reprovados) para o admin
        const reviews = await prisma.review.findMany({
            orderBy: [
                { CreatedAt: 'desc' }, // Mais recentes primeiro
                { Rating: 'desc' }
            ],
            include: {
                User: {
                    select: {
                        Id: true,
                        Nome: true,
                        Email: true
                    }
                },
                Psicologo: {
                    select: {
                        Id: true,
                        Nome: true
                    }
                }
            }
        });
        return res.json(reviews);
    }

    async getById(req: Request, res: Response): Promise<Response> {
        const id = normalizeParamString(req.params.id);
        const review = await prisma.review.findUnique({
            where: { Id: id || "" },
            include: {
                User: {
                    select: {
                        Id: true,
                        Nome: true,
                        Email: true
                    }
                },
                Psicologo: {
                    select: {
                        Id: true,
                        Nome: true
                    }
                }
            }
        });
        return res.json(review);
    }

    async create(req: Request, res: Response): Promise<Response> {
        const data = req.body;
        const review = await prisma.review.create({
            data
        });
        return res.status(201).json(review);
    }

    async update(req: Request, res: Response): Promise<Response> {
        const id = normalizeParamString(req.params.id);
        const { Rating, Comentario, Status, MostrarNaHome, MostrarNaPsicologo } = req.body;

        // Atualiza apenas os campos permitidos
        const updateData: {
            Rating?: number;
            Comentario?: string;
            Status?: string;
            MostrarNaHome?: boolean;
            MostrarNaPsicologo?: boolean;
        } = {};

        if (Rating !== undefined) updateData.Rating = Rating;
        if (Comentario !== undefined) updateData.Comentario = Comentario;
        if (Status !== undefined) updateData.Status = Status;
        if (MostrarNaHome !== undefined) updateData.MostrarNaHome = MostrarNaHome;
        if (MostrarNaPsicologo !== undefined) updateData.MostrarNaPsicologo = MostrarNaPsicologo;

        const review = await prisma.review.update({
            where: { Id: id || "" },
            data: updateData,
            include: {
                User: {
                    select: {
                        Id: true,
                        Nome: true,
                        Email: true
                    }
                },
                Psicologo: {
                    select: {
                        Id: true,
                        Nome: true
                    }
                }
            }
        });
        return res.json(review);
    }

    async delete(req: Request, res: Response): Promise<Response> {
        const id = normalizeParamString(req.params.id);
        await prisma.review.delete({
            where: { Id: id || "" }
        });
        return res.status(204).send();
    }
}