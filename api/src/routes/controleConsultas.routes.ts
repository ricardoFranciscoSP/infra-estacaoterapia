import { Router } from 'express';
import prisma from "../prisma/client";
import { AuthorizationService } from "../services/authorization.service";
import { asyncHandler } from '../middlewares/asyncHandler';
import { protect } from '../middlewares/authMiddleware';
import { ConsultaController } from '../controllers/controleConsulta.controller';

const router = Router();

const authService = new AuthorizationService();
const consultaController = new ConsultaController(prisma, authService);

router.use(protect); // Middleware para proteger as rotas

// Rota para comprar um plano e decrementar consultas
router.post('/', asyncHandler(consultaController.controlarConsultas.bind(consultaController)));

// Rota para resetar consultas mensais
router.post('/reset-monthly-consultations', asyncHandler(consultaController.resetMonthlyConsultations.bind(consultaController)));

// Rota para listar consultas
router.get('/', asyncHandler(consultaController.fetchMonthlyControls.bind(consultaController)));

export default router;