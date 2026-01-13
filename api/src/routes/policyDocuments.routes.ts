import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { protect } from '../middlewares/authMiddleware';
import { PolicyDocumentController } from '../controllers/policyDocument.controller';
import multer from 'multer';

const router = Router();
const controller = new PolicyDocumentController();
const upload = multer({ storage: multer.memoryStorage() });

// Listar documentos (público para pacientes e psicólogos também)
router.get('/', asyncHandler(controller.listDocuments.bind(controller)));

// Buscar por ID (público)
router.get('/:id', asyncHandler(controller.getDocumentById.bind(controller)));

// Rotas protegidas (apenas admin)
router.post('/', protect, upload.single('file'), asyncHandler(controller.createDocument.bind(controller)));
router.put('/:id', protect, upload.single('file'), asyncHandler(controller.updateDocument.bind(controller)));
router.delete('/:id', protect, asyncHandler(controller.deleteDocument.bind(controller)));

export default router;

