import { Router } from 'express';
import { AuthorizationService } from '../services/authorization.service';
import { protect } from '../middlewares/authMiddleware';
import { asyncHandler } from '../middlewares/asyncHandler';
import { PrimeiraConsultaController } from '../controllers/paciente/primeiraCompra.controller';
import { PrimeiraConsultaService } from '../services/primeiraConsulta.service';
import { GetUserBasicService } from '../services/getUserBasic.Service';

const router = Router();
// Instancia explicitamente as dependências
const primeiraConsultaService = new PrimeiraConsultaService(); // Certifique-se que implementa IPrimeiraConsultaService corretamente
const authService = new AuthorizationService();
const userService = new GetUserBasicService();
const primeiraConsultaController = new PrimeiraConsultaController(authService, primeiraConsultaService, userService);
// Define as rotas
router.use(protect);
// Protege as rotas com o middleware de autenticação
// As rotas abaixo só serão acessíveis se o usuário estiver autenticado
router.get('/verificar', asyncHandler(primeiraConsultaController.verificarSeJaComprouPrimeiraConsulta.bind(primeiraConsultaController)));
router.post('/comprar', asyncHandler(primeiraConsultaController.comprarPrimeiraConsulta.bind(primeiraConsultaController)));

export default router;
