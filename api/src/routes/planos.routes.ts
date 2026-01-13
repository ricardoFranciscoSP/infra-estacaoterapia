import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { protect } from '../middlewares/authMiddleware';
import { PlanosController } from '../controllers/planos.controller';

const router = Router();
const planosController = new PlanosController();

// Rotas públicas
router.get('/', asyncHandler(planosController.fetchPlanos.bind(planosController)));

// Rotas públicas que dependem de parâmetro
router.get('/:id', asyncHandler(planosController.fetchPlanoById.bind(planosController)));

// Rotas protegidas
router.use(protect);
router.get('/paciente', asyncHandler(planosController.getPlanosPaciente.bind(planosController)));
// Rotas protegidas para manipulação de planos
router.post('/', asyncHandler(planosController.createPlano.bind(planosController)));
router.put('/:id', asyncHandler(planosController.updatePlano.bind(planosController)));
router.delete('/:id', asyncHandler(planosController.deletePlano.bind(planosController)));

export default router;