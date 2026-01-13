import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { protect } from '../middlewares/authMiddleware';
import { AuthorizationService } from '../services/authorization.service';
import { ConsultaAvulsaController } from '../controllers/consultaAvulsa.controller';
import { ConsultaAvulsaService } from '../services/consultaAvulsa.service';

const router = Router();
const authorizationService = new AuthorizationService();
const consultaAvulsaService = new ConsultaAvulsaService();
const consultaAvulsaController = new ConsultaAvulsaController(authorizationService, consultaAvulsaService);

router.use(protect); // Middleware to handle async errors

router.post('/registrar', asyncHandler(consultaAvulsaController.registrarConsultaAvulsa.bind(consultaAvulsaController)));
export default router;
