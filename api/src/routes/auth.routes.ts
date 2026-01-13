import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { protect } from '../middlewares/authMiddleware';
import { loginRateLimiter, sensitiveRateLimiter } from '../middlewares/security';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';
import { EmailService } from '../services/email.service';
import { SMSService } from '../services/sms.service';
import { WhatsAppService } from '../services/whatsapp.service';
import { AuthController } from '../controllers/auth.controller';
import multer from 'multer';

// Instanciação dos serviços
const tokenService = new TokenService();
const emailService = new EmailService();
const smsService = new SMSService();
const whatsAppService = new WhatsAppService();
const authService = new AuthService(emailService, smsService, whatsAppService);
const authController = new AuthController(authService, tokenService);
// Usa memoryStorage para disponibilizar file.buffer (necessário para upload ao Supabase)
const upload = multer({ storage: multer.memoryStorage() });
// Campos de upload esperados no registro de psicólogo (opcionais)
// Observação: upload.fields restringe os nomes; para evitar "Unexpected field"
// ao receber qualquer input com arquivo (ex.: variações do front), usamos any().
// O controller já converte Array -> Objeto por fieldname.
const registerUpload = upload.any();

const router = Router();

// Rotas públicas com rate limiting
router.post('/login', loginRateLimiter, asyncHandler(authController.login.bind(authController)));
router.post('/register', registerUpload, asyncHandler(authController.register.bind(authController)));
router.post('/forgot-password', sensitiveRateLimiter, asyncHandler(authController.forgotPassword.bind(authController)));
router.post('/reset-password', sensitiveRateLimiter, asyncHandler(authController.resetPassword.bind(authController)));
router.post('/logout', asyncHandler(authController.logout.bind(authController)));
router.post('/refresh-token', sensitiveRateLimiter, asyncHandler(authController.refreshToken.bind(authController)));

// Rotas protegidas
router.use(protect);
router.get('/user', asyncHandler(authController.getAuthenticatedUser.bind(authController)));

export default router;