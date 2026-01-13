import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler';
import { protect, authorize } from '../../middlewares/authMiddleware';
import { ReviewsController } from '../../controllers/adm/reviews.controller';

const router = Router();
const reviewsController = new ReviewsController();

// Middleware de proteção para todas rotas admin
router.use(protect);

// Rotas para gerenciamento de avaliações
router.get('/', asyncHandler(reviewsController.list.bind(reviewsController)));
router.get('/:id', asyncHandler(reviewsController.getById.bind(reviewsController)));
router.post('/', asyncHandler(reviewsController.create.bind(reviewsController)));
router.put('/:id', asyncHandler(reviewsController.update.bind(reviewsController)));
router.delete('/:id', asyncHandler(reviewsController.delete.bind(reviewsController)));

export default router;