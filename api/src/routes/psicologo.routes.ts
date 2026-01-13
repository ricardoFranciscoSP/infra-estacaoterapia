import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { protect } from '../middlewares/authMiddleware';
import { PsicologoController } from '../controllers/psicologo/psicologo.controller';
import prisma from "../prisma/client";
import { AuthorizationService } from "../services/authorization.service";

const router = Router();
const authService = new AuthorizationService();

const psicologo = new PsicologoController(prisma, authService);

// Rotas públicas (não requerem autenticação)
router.get('/', asyncHandler(psicologo.listarPsicologos.bind(psicologo)));
router.get('/ativos-resumo', asyncHandler(psicologo.listarPsicologosAtivosResumo.bind(psicologo)));
router.get('/filter', asyncHandler(psicologo.filtrarPsicologos.bind(psicologo)));
router.get('/:id', asyncHandler(psicologo.obterPsicologo.bind(psicologo)));

// Rotas protegidas (requerem autenticação)
router.use(protect); // Middleware to handle async errors

router.put('/', asyncHandler(psicologo.atualizarPsicologo.bind(psicologo)));
router.delete('/', asyncHandler(psicologo.deletarPsicologo.bind(psicologo)));

export default router;
