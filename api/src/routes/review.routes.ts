import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { protect } from '../middlewares/authMiddleware';
import { AuthorizationService } from "../services/authorization.service";
import { ReviewController } from '../controllers/review.controller';
import { ReviewService } from '../services/review.service';
import { ReviewRepository } from '../repositories/review.repository';

const router = Router();

const authService = new AuthorizationService();
const reviewRepository = new ReviewRepository();
const reviewService = new ReviewService(reviewRepository);
const reviewController = new ReviewController(authService, reviewService);

// GET routes (públicas)
router.get('/all', asyncHandler(reviewController.getReviewsAll.bind(reviewController)));
router.get('/id/:psicologoId', asyncHandler(reviewController.getReviewsId.bind(reviewController)));
router.get('/average/:psicologoId', asyncHandler(reviewController.getAverageRating.bind(reviewController)));
router.get('/has-reviewed', protect, asyncHandler(reviewController.hasPatientReviewedPsychologist.bind(reviewController)));
router.get('/:psicologoId', asyncHandler(reviewController.getReviews.bind(reviewController)));

// Rotas protegidas (requerem autenticação)
router.post('/', protect, asyncHandler(reviewController.createReview.bind(reviewController)));
router.put('/approve-review/:id', protect, asyncHandler(reviewController.approveReview.bind(reviewController)));
router.put('/:id', protect, asyncHandler(reviewController.updateReview.bind(reviewController)));
router.delete('/:id', protect, asyncHandler(reviewController.deleteReview.bind(reviewController)));

export default router;
