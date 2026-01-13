import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler";
import { protect } from "../middlewares/authMiddleware";
import { AuditController } from "../controllers/audit.controller";
import { AuthorizationService } from "../services/authorization.service";
import { AuditService } from "../services/audit.service";

const router = Router();

const auditService = new AuditService();
const authService = new AuthorizationService();

const auditController = new AuditController(authService, auditService);

// Todas as rotas requerem autenticação
router.use(protect);

// Registrar novo evento de auditoria
router.post("/", asyncHandler(auditController.logAudit.bind(auditController)));

// Listar todas as auditorias (com filtros opcionais via query params)
router.get("/", asyncHandler(auditController.listAudits.bind(auditController)));

// Buscar auditoria específica por ID
router.get("/:id", asyncHandler(auditController.getAuditById.bind(auditController)));

// Buscar auditorias por usuário
router.get("/user/:userId", asyncHandler(auditController.getAuditsByUser.bind(auditController)));

// Buscar auditorias por tipo de evento
router.get("/event-type/:eventType", asyncHandler(auditController.getAuditsByEventType.bind(auditController)));

// Exportar auditorias para Excel
router.get("/export/excel", asyncHandler(auditController.exportToExcel.bind(auditController)));

// Exportar auditorias para PDF
router.get("/export/pdf", asyncHandler(auditController.exportToPDF.bind(auditController)));

export default router;
