import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler';
import { protect, authorize } from '../../middlewares/authMiddleware';
import { PsicologoController } from '../../controllers/adm/psicologo.controller';
import cancelamentos from "../cancelamento.routes";
import { NotificationController } from '../../controllers/adm/notification.controller';
import { PacienteController } from '../../controllers/adm/paciente.controller';
import { ReviewsController } from '../../controllers/adm/reviews.controller';
import { ConsultasController } from '../../controllers/adm/consultas.controller';

import { ConfiguracoesController } from '../../controllers/adm/configuracoes.controller';
import { PasswordResetController } from '../../controllers/adm/passwordReset.controller';
import { UserController } from '../../controllers/adm/user.controller';
import { AdmFinanceiroController } from '../../controllers/adm/financeiro.controller';
import { ComprehensiveReportsController } from '../../controllers/adm/comprehensiveReports.controller';
import { QueueController } from '../../controllers/adm/queue.controller';
import { AtribuirConsultaAvulsaController } from '../../controllers/adm/atribuirConsultaAvulsa.controller';

const router = Router();
const psicologoController = new PsicologoController();
const pacienteController = new PacienteController();
const reviewsController = new ReviewsController();
const consultasController = new ConsultasController();

const configuracoesController = new ConfiguracoesController();
const passwordResetController = new PasswordResetController();
const userController = new UserController();
const financeiroController = new AdmFinanceiroController();
const comprehensiveReportsController = new ComprehensiveReportsController();
const queueController = new QueueController();
const atribuirConsultaAvulsaController = new AtribuirConsultaAvulsaController();


// Middleware de proteção para todas rotas admin
router.use(protect);

// Rotas de psicólogos (apenas Admin e Management)
router.get('/psicologos', authorize('Admin', 'Management'), asyncHandler(psicologoController.list.bind(psicologoController)));
router.get('/psicologos/:id', authorize('Admin', 'Management'), asyncHandler(psicologoController.getById.bind(psicologoController)));
router.put('/psicologos/:id', authorize('Admin', 'Management'), asyncHandler(psicologoController.update.bind(psicologoController)));
router.delete('/psicologos/:id', authorize('Admin', 'Management'), asyncHandler(psicologoController.delete.bind(psicologoController)));
router.post('/psicologos/gerar-contrato', authorize('Admin', 'Management'), asyncHandler(psicologoController.gerarContrato.bind(psicologoController)));
router.post('/psicologos/previa-contrato', asyncHandler(psicologoController.previaContrato.bind(psicologoController)));

// Rotas de pacientes (apenas Admin e Management)
router.get('/pacientes', authorize('Admin', 'Management'), asyncHandler(pacienteController.list.bind(pacienteController)));
router.get('/pacientes/:id', authorize('Admin', 'Management'), asyncHandler(pacienteController.getById.bind(pacienteController)));
router.put('/pacientes/:id', authorize('Admin', 'Management'), asyncHandler(pacienteController.update.bind(pacienteController)));
router.delete('/pacientes/:id', authorize('Admin', 'Management'), asyncHandler(pacienteController.delete.bind(pacienteController)));

router.get('/notifications/list', authorize('Admin', 'Management'), asyncHandler(NotificationController.list));
router.post('/notifications/user', authorize('Admin', 'Management'), asyncHandler(NotificationController.sendToUser));
router.post('/notifications/all', authorize('Admin', 'Management'), asyncHandler(NotificationController.sendToAll));
router.use("/cancelamentos", cancelamentos);

// Rotas de consultas (apenas Admin e Management)
router.get('/consultas/realizadas', authorize('Admin', 'Management'), asyncHandler(consultasController.getConsultasRealizadas.bind(consultasController)));
router.get('/consultas/mensais', authorize('Admin', 'Management'), asyncHandler(consultasController.getConsultasMensais.bind(consultasController)));
router.get('/consultas/mensais-todas', authorize('Admin', 'Management'), asyncHandler(consultasController.getConsultasMensaisTodas.bind(consultasController)));
router.get('/consultas/canceladas', authorize('Admin', 'Management'), asyncHandler(consultasController.getConsultasCanceladas.bind(consultasController)));
router.get('/consultas/mes-atual', authorize('Admin', 'Management'), asyncHandler(consultasController.getConsultasMesAtual.bind(consultasController)));
router.get('/consultas/mes-atual-lista', authorize('Admin', 'Management'), asyncHandler(consultasController.getConsultasMesAtualLista.bind(consultasController)));

// Rotas para gerenciamento de avaliações
router.get('/reviews', asyncHandler(reviewsController.list.bind(reviewsController)));
router.get('/reviews/:id', asyncHandler(reviewsController.getById.bind(reviewsController)));
router.post('/reviews', asyncHandler(reviewsController.create.bind(reviewsController)));
router.put('/reviews/:id', authorize('Admin', 'Management'), asyncHandler(reviewsController.update.bind(reviewsController)));
router.delete('/reviews/:id', authorize('Admin', 'Management'), asyncHandler(reviewsController.delete.bind(reviewsController)));

// Outras rotas administrativas podem ser adicionadas aqui

// Rotas de configurações de redes sociais
router.get('/configuracoes/redes', authorize('Admin', 'Management'), asyncHandler(configuracoesController.getRedes.bind(configuracoesController)));
router.post('/configuracoes/redes', authorize('Admin', 'Management'), asyncHandler(configuracoesController.createRedes.bind(configuracoesController)));
router.put('/configuracoes/redes', authorize('Admin', 'Management'), asyncHandler(configuracoesController.updateRedes.bind(configuracoesController)));
router.delete('/configuracoes/redes', authorize('Admin', 'Management'), asyncHandler(configuracoesController.deleteRedes.bind(configuracoesController)));

// Rotas de configurações de Faqs
router.get('/configuracoes/faqs', authorize('Admin', 'Management'), asyncHandler(configuracoesController.getFaq.bind(configuracoesController)));
router.post('/configuracoes/faqs', authorize('Admin', 'Management'), asyncHandler(configuracoesController.createFaq.bind(configuracoesController)));
router.post('/configuracoes/faqs/bulk', authorize('Admin', 'Management'), asyncHandler(configuracoesController.createFaqsBulk.bind(configuracoesController)));
router.put('/configuracoes/faqs/:id', authorize('Admin', 'Management'), asyncHandler(configuracoesController.updateFaq.bind(configuracoesController)));
router.delete('/configuracoes/faqs/:id', authorize('Admin', 'Management'), asyncHandler(configuracoesController.deleteFaq.bind(configuracoesController)));

// Rotas genéricas para outras configurações
router.get('/configuracoes', authorize('Admin', 'Management'), asyncHandler(configuracoesController.getAll.bind(configuracoesController)));
router.get('/configuracoes/:id', authorize('Admin', 'Management'), asyncHandler(configuracoesController.getById.bind(configuracoesController)));
router.post('/configuracoes', authorize('Admin', 'Management'), asyncHandler(configuracoesController.create.bind(configuracoesController)));
router.patch('/configuracoes/:id', authorize('Admin', 'Management'), asyncHandler(configuracoesController.update.bind(configuracoesController)));
router.delete('/configuracoes/:id', authorize('Admin', 'Management'), asyncHandler(configuracoesController.delete.bind(configuracoesController)));

// Rotas de redefinição de senha
router.post('/password-reset/generate-link/:userId', authorize('Admin', 'Management'), asyncHandler(passwordResetController.generateResetLink.bind(passwordResetController)));
router.post('/password-reset/generate-random/:userId', authorize('Admin', 'Management'), asyncHandler(passwordResetController.generateRandomPassword.bind(passwordResetController)));

// Rotas de usuários
router.get('/users', authorize('Admin', 'Management'), asyncHandler(userController.list.bind(userController)));

// Rotas financeiras administrativas (Admin, Management e Finance)
// IMPORTANTE: Rotas específicas (com :id) devem vir ANTES das rotas genéricas
router.get('/financeiro/psicologos/:id', authorize('Admin', 'Management', 'Finance'), asyncHandler(financeiroController.obterDetalhesPsicologo.bind(financeiroController)));
router.get('/financeiro/psicologos', authorize('Admin', 'Management', 'Finance'), asyncHandler(financeiroController.listarPagamentosPsicologos.bind(financeiroController)));
router.get('/financeiro/pacientes', authorize('Admin', 'Management', 'Finance'), asyncHandler(financeiroController.listarPagamentosPacientes.bind(financeiroController)));
router.get('/financeiro/psicologos-lista', authorize('Admin', 'Management', 'Finance'), asyncHandler(financeiroController.listarPsicologosComFinanceiro.bind(financeiroController)));
router.post('/financeiro/aprovar-pagamento', authorize('Admin', 'Management', 'Finance'), asyncHandler(financeiroController.aprovarPagamento.bind(financeiroController)));
router.post('/financeiro/reprovar-pagamento', authorize('Admin', 'Management', 'Finance'), asyncHandler(financeiroController.reprovarPagamento.bind(financeiroController)));
router.post('/financeiro/baixar-pagamento', authorize('Admin', 'Management', 'Finance'), asyncHandler(financeiroController.baixarPagamento.bind(financeiroController)));
router.get('/financeiro/estatisticas', authorize('Admin', 'Management', 'Finance'), asyncHandler(financeiroController.obterEstatisticas.bind(financeiroController)));
router.get('/financeiro/relatorio', authorize('Admin', 'Management', 'Finance'), asyncHandler(financeiroController.gerarRelatorio.bind(financeiroController)));

// Rotas de Relatórios Completos (apenas Admin e Management)
router.get('/reports/clientes-cadastro', authorize('Admin', 'Management'), asyncHandler(comprehensiveReportsController.getClientesCadastro.bind(comprehensiveReportsController)));
router.get('/reports/psicologos-credenciamento', authorize('Admin', 'Management'), asyncHandler(comprehensiveReportsController.getPsicologosCredenciamento.bind(comprehensiveReportsController)));
router.get('/reports/planos-movimentacao', authorize('Admin', 'Management'), asyncHandler(comprehensiveReportsController.getPlanosMovimentacao.bind(comprehensiveReportsController)));
router.get('/reports/acesso-reset', authorize('Admin', 'Management'), asyncHandler(comprehensiveReportsController.getAcessoReset.bind(comprehensiveReportsController)));
router.get('/reports/sessoes-historico', authorize('Admin', 'Management'), asyncHandler(comprehensiveReportsController.getSessoesHistorico.bind(comprehensiveReportsController)));
router.get('/reports/avaliacoes-sessoes', authorize('Admin', 'Management'), asyncHandler(comprehensiveReportsController.getAvaliacoesSessoes.bind(comprehensiveReportsController)));
router.get('/reports/faturamento-cliente', authorize('Admin', 'Management'), asyncHandler(comprehensiveReportsController.getFaturamentoCliente.bind(comprehensiveReportsController)));
router.get('/reports/acesso-reset-psicologo', authorize('Admin', 'Management'), asyncHandler(comprehensiveReportsController.getAcessoResetPsicologo.bind(comprehensiveReportsController)));
router.get('/reports/agenda-psicologo', authorize('Admin', 'Management'), asyncHandler(comprehensiveReportsController.getAgendaPsicologo.bind(comprehensiveReportsController)));
router.get('/reports/carteira-pagamento-psicologo', authorize('Admin', 'Management'), asyncHandler(comprehensiveReportsController.getCarteiraPagamentoPsicologo.bind(comprehensiveReportsController)));
router.get('/reports/onboarding-objetivos', authorize('Admin', 'Management'), asyncHandler(comprehensiveReportsController.getOnboardingObjetivos.bind(comprehensiveReportsController)));

// Rotas de gerenciamento de filas BullMQ (apenas Admin e Management)
router.get('/queues/status', authorize('Admin', 'Management'), asyncHandler(queueController.getQueuesStatus.bind(queueController)));
router.get('/queues/failed-jobs', authorize('Admin', 'Management'), asyncHandler(queueController.getFailedJobs.bind(queueController)));
router.delete('/queues/failed-jobs', authorize('Admin', 'Management'), asyncHandler(queueController.cleanFailedJobs.bind(queueController)));
router.get('/queues/jobs', authorize('Admin', 'Management'), asyncHandler(queueController.getJobs.bind(queueController)));

// Rota para atribuir consultas avulsas (apenas Admin)
router.post('/atribuir-consulta-avulsa', authorize('Admin'), asyncHandler(atribuirConsultaAvulsaController.atribuir.bind(atribuirConsultaAvulsaController)));

export default router;