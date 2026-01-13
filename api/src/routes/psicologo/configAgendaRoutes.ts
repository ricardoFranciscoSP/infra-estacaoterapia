import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler';
import { protect } from '../../middlewares/authMiddleware';
import { ConfigAgendaController } from '../../controllers/psicologo/configAgenda,controller';
import { AuthorizationService } from '../../services/authorization.service';
import { ConfigAgendaService } from '../../services/psicologo/configAgenda.service';

const router = Router();

const authorizationService = new AuthorizationService();
const configAgendaService = new ConfigAgendaService();
const configAgendaController = new ConfigAgendaController(configAgendaService, authorizationService);

router.use(protect);
router.get('/', asyncHandler(configAgendaController.listarAgendas.bind(configAgendaController)));
router.get('/:id', asyncHandler(configAgendaController.obterAgenda.bind(configAgendaController)));
router.post('/', asyncHandler(configAgendaController.configurarAgenda.bind(configAgendaController)));
router.put('/:id', asyncHandler(configAgendaController.atualizarAgenda.bind(configAgendaController)));
router.delete('/:id', asyncHandler(configAgendaController.deletarAgenda.bind(configAgendaController)));

export default router;