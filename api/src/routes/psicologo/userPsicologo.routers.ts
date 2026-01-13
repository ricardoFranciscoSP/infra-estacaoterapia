import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler';
import { protect } from '../../middlewares/authMiddleware';
import { AuthorizationService } from '../../services/authorization.service';
import { UserPsicologoController } from '../../controllers/psicologo/user.psicologo.controller';
import { UserPsicologoService } from '../../services/psicologo/user.psicologo.service';
import multer from 'multer';

const router = Router();
const authorizationService = new AuthorizationService();
const userPsicologoService = new UserPsicologoService();
const userController = new UserPsicologoController(authorizationService, userPsicologoService);
const upload = multer();

router.use(protect);

router.get('/me', asyncHandler(userController.getUser.bind(userController)));
router.put('/me', asyncHandler(userController.updateUserPsicologo.bind(userController)));
router.post('/me/image', upload.single('file'), asyncHandler(userController.uploadImage.bind(userController)));
router.put('/me/image/:imageId', upload.single('file'), asyncHandler(userController.updateImage.bind(userController)));
router.delete('/me/formacao/:formacaoId', asyncHandler(userController.removeFormacao.bind(userController)));

// Rotas específicas para atualizações parciais
router.put('/me/dados-bancarios', asyncHandler(userController.updateDadosBancarios.bind(userController)));
router.put('/me/dados-pessoais', asyncHandler(userController.updateDadosPessoais.bind(userController)));
router.put('/me/sobre-mim', asyncHandler(userController.updateSobreMim.bind(userController)));
router.put('/me/especialidades', asyncHandler(userController.updateEspecialidades.bind(userController)));
router.put('/me/endereco', asyncHandler(userController.updateEndereco.bind(userController)));
router.put('/me/pessoal-juridica', asyncHandler(userController.updatePessoalJuridica.bind(userController)));
router.put('/me/formacoes', asyncHandler(userController.updateFormacoes.bind(userController)));

export default router;