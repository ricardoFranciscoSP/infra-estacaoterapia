import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { protect } from '../middlewares/authMiddleware';
import { FavoriteController } from '../controllers/favorite.controller';
import { FavoriteService } from '../services/favorite.service';

const router = Router();
const favoriteService = new FavoriteService();
const favoriteController = new FavoriteController(favoriteService);

router.use(protect);
router.get('/', asyncHandler(favoriteController.getAll.bind(favoriteController)));
router.post("/:id", asyncHandler(favoriteController.toggleFavorite.bind(favoriteController)));
router.delete("/:id", asyncHandler(favoriteController.deleteFavorite.bind(favoriteController)));


export default router;