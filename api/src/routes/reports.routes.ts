import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { protect } from '../middlewares/authMiddleware';
import { ReportsController } from '../controllers/reports.controller';
import { AuthorizationService } from '../services/authorization.service';
import { ReportsService } from '../services/reports.service';
import { AuditService } from '../services/audit.service';

const router = Router();

// Instanciação dos serviços e controller
const authService = new AuthorizationService();
const reportsService = new ReportsService();
const auditService = new AuditService();
const reportsController = new ReportsController(authService, reportsService, auditService);

// Middleware de proteção para todas as rotas
router.use(protect);

// Rotas de relatórios (apenas Admin)
router.get('/usuarios-ativos', asyncHandler(reportsController.getUsuariosAtivos.bind(reportsController)));
router.get('/planos', asyncHandler(reportsController.getPlanos.bind(reportsController)));
router.get('/usuarios-inativos', asyncHandler(reportsController.getUsuariosInativos.bind(reportsController)));
router.get('/faturamento', asyncHandler(reportsController.getFaturamento.bind(reportsController)));
router.get('/repasse', asyncHandler(reportsController.getRepasse.bind(reportsController)));
router.get('/avaliacoes', asyncHandler(reportsController.getAvaliacoes.bind(reportsController)));
router.get('/sessoes', asyncHandler(reportsController.getSessoes.bind(reportsController)));
router.get('/agenda', asyncHandler(reportsController.getAgenda.bind(reportsController)));
router.get('/summary', asyncHandler(reportsController.getSummary.bind(reportsController)));

export default router;

