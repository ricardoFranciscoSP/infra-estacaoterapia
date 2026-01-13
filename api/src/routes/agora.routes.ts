import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { protect } from '../middlewares/authMiddleware';
import { AgoraService } from '../services/agora.service';
import { AgoraController } from '../controllers/agora.controller';
import { AuthorizationService } from '../services/authorization.service';
import prisma from '../prisma/client';

// Instanciação dos serviços e controlador
const agoraService = new AgoraService();
const authService = new AuthorizationService();

const agoraController = new AgoraController(agoraService, authService, prisma);

// Criação do roteador
const router = Router();

// Aplica autenticação em todas as rotas
router.use(protect);

router.post('/generate-token', asyncHandler(agoraController.generateAccessToken.bind(agoraController)));
router.post('/room/generate-token', asyncHandler(agoraController.generateAccessToken.bind(agoraController)));
router.post('/generate-rtm-token', asyncHandler(agoraController.generateRtmToken.bind(agoraController)));
router.post('/check-and-generate-tokens', asyncHandler(agoraController.checkAndGenerateTokens.bind(agoraController)));
// Endpoint para geração manual de token
router.post('/generate-manual-token', asyncHandler(agoraController.generateManualToken.bind(agoraController)));

export default router;
