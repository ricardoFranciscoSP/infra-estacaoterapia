import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { asyncHandler } from '../middlewares/asyncHandler';
import { FormularioSaqueAutonomoController } from '../controllers/formularioSaqueAutonomo.controller';

const router = Router();
const formularioController = new FormularioSaqueAutonomoController();

router.use(protect);

// Criar formulário (para o psicólogo autônomo logado)
router.post('/', asyncHandler(formularioController.create.bind(formularioController)));

// Atualizar formulário (para o psicólogo autônomo logado)
router.put('/', asyncHandler(formularioController.update.bind(formularioController)));

// Buscar meu formulário (deve vir antes de /:psicologoAutonomoId)
router.get('/me', asyncHandler(formularioController.getMyFormulario.bind(formularioController)));

// Buscar status do formulário (deve vir antes de /:psicologoAutonomoId)
router.get('/status', asyncHandler(formularioController.getStatus.bind(formularioController)));

// Buscar formulário por ID do psicólogo (admin/management/finance) - DEVE SER A ÚLTIMA ROTA GET
router.get('/:psicologoAutonomoId', asyncHandler(formularioController.getByPsicologoAutonomoId.bind(formularioController)));

export default router;
