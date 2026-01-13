import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { protect } from '../middlewares/authMiddleware';
import { ConsultasPsicologoController } from '../controllers/consultasPsicologo.controller';
import { ConsultasPsicologoService } from '../services/consultasPsicologo.service';
import { AuthorizationService } from '../services/authorization.service';

const router = Router();

// Instancia os serviços e injeta no controller conforme o novo construtor
const consultasPsicologoService = new ConsultasPsicologoService();
const authorizationService = new AuthorizationService();
const reservations = new ConsultasPsicologoController(consultasPsicologoService, authorizationService);

router.use(protect);
router.get('/', asyncHandler(reservations.findReservas.bind(reservations)));
router.get('/completed', asyncHandler(reservations.getReservasCompletasEAgendadasPorUsuario.bind(reservations)));
router.get('/em-andamento', asyncHandler(reservations.consultaEmAndamento.bind(reservations)));
router.get('/:id', asyncHandler(reservations.getReservasPorId.bind(reservations)));
router.post('/new', asyncHandler(reservations.newReserva.bind(reservations)));
router.patch('/release/:id', asyncHandler(reservations.releaseSchedule.bind(reservations)));
router.delete('/cancel/:id', asyncHandler(reservations.cancelarReserva.bind(reservations)));

export default router;
