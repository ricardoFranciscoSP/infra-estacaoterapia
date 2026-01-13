import { Router } from 'express';
import { CompraPlanoController } from '../controllers/compraPlano.controller';
import { CompraPlanoService } from '../services/compraPlano.service';
import { AuthorizationService } from '../services/authorization.service';
import { protect } from '../middlewares/authMiddleware';
import { asyncHandler } from '../middlewares/asyncHandler';
import { GetUserBasicService } from '../services/getUserBasic.Service';

// Instancia explicitamente as dependências
const compraPlanoService = new CompraPlanoService();
const authService = new AuthorizationService();
const userService = new GetUserBasicService();

const compraPlanoController = new CompraPlanoController(compraPlanoService, authService, userService);

const router = Router();

router.get('/', asyncHandler(compraPlanoController.getPlanosPaciente.bind(compraPlanoController)));
router.use(protect); // Middleware to handle async errors
router.post('/', asyncHandler(compraPlanoController.comprarPlano.bind(compraPlanoController)));
router.post('/cancelar', asyncHandler(compraPlanoController.cancelarPlano.bind(compraPlanoController)));
router.post('/upgrade', asyncHandler(compraPlanoController.upgradePlano.bind(compraPlanoController)));
router.post('/downgrade', asyncHandler(compraPlanoController.downgradePlano.bind(compraPlanoController)));

export default router;
