import { asyncHandler } from '../../middlewares/asyncHandler';
import { protect } from '../../middlewares/authMiddleware';
import { AuthorizationService } from '../../services/authorization.service';
import { FinanceiroController } from '../../controllers/psicologo/financeiro.controller';
import { Router } from 'express';
import { FinanceiroService } from '../../services/psicologo/financeiro.services';

const router = Router();

const authorizationService = new AuthorizationService();
const financeiroService = new FinanceiroService();
const financeiroController = new FinanceiroController(financeiroService, authorizationService);

router.use(protect);
router.get('/calcular-pagamento', asyncHandler(financeiroController.calcularPagamento.bind(financeiroController)));
router.get('/gerar-relatorio', asyncHandler(financeiroController.gerarRelatorioFinanceiro.bind(financeiroController)));
router.post('/processar-pagamento', asyncHandler(financeiroController.processarPagamento.bind(financeiroController)));
router.get('/historico-sessoes', asyncHandler(financeiroController.getHistoricoSessoes.bind(financeiroController)));
router.get('/ganhos-mensais', asyncHandler(financeiroController.getGanhosMensais.bind(financeiroController)));
router.get('/atendimentos-mensais', asyncHandler(financeiroController.getAtendimentosMensais.bind(financeiroController)));
router.get('/saldo-disponivel-resgate', asyncHandler(financeiroController.getSaldoDisponivelResgate.bind(financeiroController)));
router.get('/saldo-retido', asyncHandler(financeiroController.getSaldoRetido.bind(financeiroController)));
router.get('/fatura-periodo', asyncHandler(financeiroController.getFaturaPeriodo.bind(financeiroController)));

export default router;