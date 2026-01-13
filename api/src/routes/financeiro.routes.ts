import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { protect } from '../middlewares/authMiddleware';
import { FinanceiroController } from '../controllers/controleFinanceiro.controller';
import { AuthorizationService } from '../services/authorization.service';

const router = Router();
const authorizationService = new AuthorizationService();
import { ControleFinanceiroService } from '../services/controleFinanceiro.service';
import { EmailService } from '../services/email.service';

const controleFinanceiroService = new ControleFinanceiroService();
const emailService = new EmailService();

const financeiroController = new FinanceiroController(
    controleFinanceiroService,
    emailService,
    authorizationService
);

router.use(protect); // Middleware to handle async errors

router.get('/', asyncHandler(financeiroController.listarPagamentos.bind(financeiroController)));
router.post('/confirmar-pagamento', asyncHandler(financeiroController.confirmarPagamento.bind(financeiroController)));
router.post('/atualizar-recorrencia', asyncHandler(financeiroController.atualizarStatusRecorrencia.bind(financeiroController)));
router.delete('/excluir-pagamento/:controleFinanceiroId', asyncHandler(financeiroController.excluirPagamento.bind(financeiroController)));
router.post('/verificar-atualizar-status', asyncHandler(financeiroController.verificarEAtualizarStatus.bind(financeiroController)));
export default router;
