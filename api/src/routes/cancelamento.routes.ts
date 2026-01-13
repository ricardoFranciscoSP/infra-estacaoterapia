import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler";
import { protect, authorize } from "../middlewares/authMiddleware";
import { CancelamentoController } from "../controllers/cancelamentos.controller";
import { CancelamentoService } from "../services/cancelamento.service";
import multer from 'multer';

const router = Router();
const cancelamentoService = new CancelamentoService();
const cancelamentoController = new CancelamentoController(cancelamentoService);

// Configurar multer para upload de arquivos
const upload = multer({ storage: multer.memoryStorage() });

// Apenas autenticação, sem restrição de papel para rota global
router.use(protect);

router.post("/", upload.single('documento'), asyncHandler(cancelamentoController.create.bind(cancelamentoController)));
router.get("/", asyncHandler(cancelamentoController.findAll.bind(cancelamentoController)));
router.get("/count", asyncHandler(cancelamentoController.countByStatus.bind(cancelamentoController)));
router.get("/:id", asyncHandler(cancelamentoController.findById.bind(cancelamentoController)));
router.put("/:id", asyncHandler(cancelamentoController.update.bind(cancelamentoController)));
router.patch("/:id/status", asyncHandler(cancelamentoController.updateStatus.bind(cancelamentoController)));
router.delete("/:id", asyncHandler(cancelamentoController.delete.bind(cancelamentoController)));
router.post("/:id/approve", asyncHandler(cancelamentoController.approve.bind(cancelamentoController)));
router.post("/:id/manage", asyncHandler(cancelamentoController.manage.bind(cancelamentoController)));

export default router;
