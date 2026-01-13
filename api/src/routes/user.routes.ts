import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { protect } from '../middlewares/authMiddleware';
import { UserController, } from '../controllers/user.controller';
import { AuthorizationService } from '../services/authorization.service';
import { UserService } from '../services/user.service';
import multer from 'multer';
import { GetUserBasicService } from '../services/getUserBasic.Service';
import { GetUserDetailsService } from '../services/getUserDetails.service';

const router = Router();

const authService = new AuthorizationService();
const userService = new UserService();
const getUserBasicService = new GetUserBasicService();
const getUserDetailsService = new GetUserDetailsService();

const userController = new UserController(authService, userService, getUserBasicService, getUserDetailsService);

const upload = multer();

router.use(protect); // Middleware to handle async errors
// Rotas relacionadas ao usuário
router.get('/me', asyncHandler(userController.me.bind(userController)));
router.get('/user-basic', asyncHandler(userController.getUserBasic.bind(userController)));
router.get('/user-details', asyncHandler(userController.getUserFullDetails.bind(userController)));
router.get('/plano', asyncHandler(userController.getUserPlano.bind(userController)));
// ConsultaAvulsa e CreditoAvulso
router.get('/consulta-avulsa', asyncHandler(userController.getConsultaAvulsa.bind(userController)));
router.get('/credito-avulso', asyncHandler(userController.getCreditoAvulso.bind(userController)));

router.get('/', asyncHandler(userController.fetch.bind(userController)));
router.get('/:id', asyncHandler(userController.fetchById.bind(userController)));
router.put('/', asyncHandler(userController.update.bind(userController)));
router.post('/change-password', asyncHandler(userController.changeUserPassword.bind(userController)));
router.post('/endereco-cobranca', asyncHandler(userController.createEnderecoCobranca.bind(userController)));
// O campo do form deve ser 'file' para funcionar com upload.single('file')
router.post('/image', upload.single('file'), asyncHandler(userController.uploadUserImage.bind(userController)));
// Rota para envio de contrato do psicólogo
router.post('/contrato', upload.single('file'), asyncHandler(userController.envioContrato.bind(userController)));
router.get('/images', asyncHandler(userController.listUserImages.bind(userController)));
router.put('/image/:id', upload.single('file'), asyncHandler(userController.updateUserImage.bind(userController)));
router.delete('/image/:imageId', asyncHandler(userController.deleteUserImage.bind(userController)));
router.delete('/:id', asyncHandler(userController.delete.bind(userController)));

// Rota para onboarding do usuário
router.post('/onboarding', asyncHandler(userController.onboarding.bind(userController)));
router.put('/is-onboarding', asyncHandler(userController.isOnboarding.bind(userController)));

// Rota para prévia do contrato do psicólogo
router.post('/previa-contrato', asyncHandler(userController.previaContrato.bind(userController)));
router.post('/gerar-contrato', asyncHandler(userController.gerarContrato.bind(userController)));

export default router;
