import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { protect } from '../middlewares/authMiddleware';
import { PoliticasController } from '../controllers/politicas.controller';

const router = Router();
const politicasController = new PoliticasController();

// Rota para gerar PDF da política de agendamento do paciente
router.get('/agendamento-paciente/pdf', protect, asyncHandler(politicasController.gerarPoliticaAgendamentoPaciente.bind(politicasController)));

export default router;

