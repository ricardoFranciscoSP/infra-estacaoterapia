import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { asyncHandler } from '../middlewares/asyncHandler';
import { SolicitacoesController } from '../controllers/solicitacoes.controller';
import multer from 'multer';

// Configuração: aceita arquivo único no campo 'documento'
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const router = Router();
const solicitacoesController = new SolicitacoesController();

router.use(protect);

// Buscar todas as solicitações (admin)
router.get('/', asyncHandler(solicitacoesController.getAll.bind(solicitacoesController)));

// Buscar apenas solicitações financeiras (admin/finance)
router.get('/financeiro', asyncHandler(solicitacoesController.getFinanceSolicitacoes.bind(solicitacoesController)));

// Buscar minhas solicitações (usuário logado)
router.get('/me', asyncHandler(solicitacoesController.getMySolicitacoes.bind(solicitacoesController)));

// Filtrar solicitações (deve vir antes de /:userId para evitar conflito)
router.get('/filter', asyncHandler(solicitacoesController.filter.bind(solicitacoesController)));

// Buscar URL do documento de uma solicitação (deve vir antes de /:userId para evitar conflito)
router.get('/:solicitacaoId/documento', asyncHandler(solicitacoesController.getSolicitacaoDocumentUrl.bind(solicitacoesController)));

// Buscar solicitações por usuário
router.get('/:userId', asyncHandler(solicitacoesController.getSolicitacoesByUserId.bind(solicitacoesController)));

// Criar nova solicitação (com upload de arquivo opcional no campo 'documento')
router.post('/', upload.single('documento'), asyncHandler(solicitacoesController.createSolicitacao.bind(solicitacoesController)));

// Atualizar status da solicitação
router.patch('/status', asyncHandler(solicitacoesController.updateSolicitacaoStatus.bind(solicitacoesController)));

// Adicionar resposta à thread da solicitação
router.post('/:solicitacaoId/responder', asyncHandler(solicitacoesController.addResponse.bind(solicitacoesController)));

// Excluir solicitação
router.delete('/:solicitacaoId', asyncHandler(solicitacoesController.delete.bind(solicitacoesController)));

export default router;
