import { Router } from 'express';
import { CicloPlanoController } from '../controllers/cicloPlano.controller';
import { protect } from '../middlewares/authMiddleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();
const cicloPlanoController = new CicloPlanoController();

router.use(protect);

router.get('/assinatura/:assinaturaPlanoId', asyncHandler(cicloPlanoController.listarCiclos.bind(cicloPlanoController)));
router.get('/assinatura/:assinaturaPlanoId/ativo', asyncHandler(cicloPlanoController.buscarCicloAtivo.bind(cicloPlanoController)));

export default router;

