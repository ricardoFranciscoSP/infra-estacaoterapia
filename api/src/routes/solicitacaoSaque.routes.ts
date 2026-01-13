import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { asyncHandler } from '../middlewares/asyncHandler';
import { SolicitacaoSaqueController } from '../controllers/solicitacaoSaque.controller';
import multer from 'multer';

const router = Router();
const solicitacaoSaqueController = new SolicitacaoSaqueController();

// Configurar multer para upload de arquivos
const upload = multer({ storage: multer.memoryStorage() });

router.use(protect);

// Verificar tipo de psicólogo (autônomo ou PJ)
router.get('/verificar-tipo', asyncHandler(solicitacaoSaqueController.verificarTipoPsicologo.bind(solicitacaoSaqueController)));

// Verificar status do formulário de saque autônomo
router.get('/verificar-formulario', asyncHandler(solicitacaoSaqueController.verificarFormularioStatus.bind(solicitacaoSaqueController)));

// Criar solicitação de saque
router.post('/criar', upload.single('notaFiscal'), asyncHandler(solicitacaoSaqueController.criarSolicitacaoSaque.bind(solicitacaoSaqueController)));

// Buscar última solicitação de saque
router.get('/ultima', asyncHandler(solicitacaoSaqueController.getUltimaSolicitacaoSaque.bind(solicitacaoSaqueController)));

export default router;
