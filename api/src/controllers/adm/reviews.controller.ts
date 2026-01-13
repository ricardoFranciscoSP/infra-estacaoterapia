import { Request, Response } from "express";
import { AuthorizationService } from "../../services/authorization.service";
import { ReviewsService } from "../../services/adm/reviews.service";
import { IReviewsService } from "../../interfaces/adm/iReview.interface";

export class ReviewsController implements IReviewsService {
    private service: ReviewsService;
    private authService: AuthorizationService;

    constructor(
        authService: AuthorizationService = new AuthorizationService(),
        service: ReviewsService = new ReviewsService(authService)
    ) {
        this.authService = authService;
        this.service = service;
    }

    async list(req: Request, res: Response): Promise<Response> {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        return await this.service.list(req, res);
    }

    async getById(req: Request, res: Response): Promise<Response> {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        return await this.service.getById(req, res);
    }

    async create(req: Request, res: Response): Promise<Response> {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        return await this.service.create(req, res);
    }

    async update(req: Request, res: Response): Promise<Response> {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        return await this.service.update(req, res);
    }

    async delete(req: Request, res: Response): Promise<Response> {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        return await this.service.delete(req, res);
    }
}
