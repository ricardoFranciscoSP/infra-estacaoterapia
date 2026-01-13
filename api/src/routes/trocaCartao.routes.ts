import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { protect } from '../middlewares/authMiddleware';
import { TrocaCartaoController } from '../controllers/trocaCartao.controller';

const router = Router();
const trocaCartaoController = new TrocaCartaoController();

router.use(protect);

router.post('/', asyncHandler(trocaCartaoController.trocarCartao.bind(trocaCartaoController)));

export default router;



