import { Router } from "express";
import { AuthorizationService } from "../services/authorization.service";
import { ProximaConsultaService } from "../services/proximaConsulta.service";
import { ProximaConsultaController } from "../controllers/proximaConsulta.controller";
import { protect } from '../middlewares/authMiddleware';
import { asyncHandler } from "../middlewares/asyncHandler";

const router = Router();

const authService = new AuthorizationService();
const proximaConsultaService = new ProximaConsultaService();
const proximaConsultaController = new ProximaConsultaController(authService, proximaConsultaService);

/**
 * Rotas para gerenciar a próxima consulta do usuário
 */

router.use(protect);

router.get('/consulta-dia-ou-proxima', asyncHandler(proximaConsultaController.getProximaConsulta.bind(proximaConsultaController)));
// GET /api/proxima-consulta/psicologo - Busca próxima consulta do psicólogo
router.get('/psicologo', asyncHandler(proximaConsultaController.getProximaConsultaPsicologo.bind(proximaConsultaController)));
// GET /api/proxima-consulta/paciente - Busca próxima consulta do paciente
router.get('/paciente', asyncHandler(proximaConsultaController.getProximaConsultaPaciente.bind(proximaConsultaController)));

export default router;
