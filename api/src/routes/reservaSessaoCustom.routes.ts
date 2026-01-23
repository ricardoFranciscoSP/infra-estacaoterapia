import { Router } from 'express';
import { ReservaSessaoController } from '../controllers/reservaSessao.controller';
import { asyncHandler } from '../middlewares/asyncHandler';
import { protect } from '../middlewares/authMiddleware';
import { ReservaSessaoService } from '../services/reservaSessao.service';
import { AuthorizationService } from '../services/authorization.service';

const router = Router();
const authService = new AuthorizationService();
const reservaSessaoService = new ReservaSessaoService();
const reservaSessaoController = new ReservaSessaoController(authService, reservaSessaoService);

router.use(protect);
router.get('/channel/:channel', asyncHandler(reservaSessaoController.getReservaSessaoByChannel.bind(reservaSessaoController)));
router.get('/:id', asyncHandler(reservaSessaoController.getReservaSessao.bind(reservaSessaoController)));
router.get('/:id/session-duration', asyncHandler(reservaSessaoController.getSessionDuration.bind(reservaSessaoController)));
router.get('/:id/complete', asyncHandler(reservaSessaoController.getConsultaCompleta.bind(reservaSessaoController)));
// Novo endpoint: buscar reservas do dia atual por psicólogo e paciente
router.get('/dia-atual', asyncHandler(reservaSessaoController.getReservasDiaAtualByPsicologoPaciente.bind(reservaSessaoController)));
// Novo endpoint: atualizar tokens da reserva
router.post('/:id/atualizar-tokens', asyncHandler(reservaSessaoController.updateTokensReservaSessao.bind(reservaSessaoController)));

export default router;
